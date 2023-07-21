import pandas as pd
import numpy as np
import tensorflow as tf
import os
import matplotlib.pyplot as plt
from keras.models import Sequential, load_model
from keras.layers import *
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split
from keras.callbacks import ModelCheckpoint, EarlyStopping
from keras.losses import MeanSquaredError
from keras.metrics import RootMeanSquaredError
from keras.optimizers import Adam
from keras.backend import clear_session
from keras import backend
from keras.utils import get_custom_objects
from sklearn.metrics import mean_absolute_percentage_error

ONE_HOUR_PERIOD = 12
N_LOOKBACK = 4 * ONE_HOUR_PERIOD
N_FORECAST = 2 * ONE_HOUR_PERIOD
MIN_WINDOW = N_LOOKBACK + N_FORECAST + ONE_HOUR_PERIOD


def swish(x, beta=1):
    return backend.sigmoid(beta * x) * x


get_custom_objects().update({'swish': swish})


# 1. Preparing data
def prepare_data(file_name, date_col_name, target_col_name):
    df = pd.read_csv(file_name)
    df = df[-(MIN_WINDOW + N_FORECAST):-N_FORECAST]

    # Set timestamp as index
    df.index = pd.to_datetime(df[date_col_name])
    del df[date_col_name]

    target_col = df[target_col_name].fillna(method='ffill')
    target_col = target_col.values.reshape(-1, 1)
    return df, target_col


# 2. Scale the data
def scale_data(target_col):
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaler = scaler.fit(target_col)
    target_col = scaler.transform(target_col)
    return scaler, target_col


# 3. Generate the input and output sequences
def generate_input_output_sequences(target_col):
    X, Y = [], []

    for i in range(N_LOOKBACK, len(target_col) - N_FORECAST + 1):
        X.append(target_col[i - N_LOOKBACK: i])
        Y.append(target_col[i: i + N_FORECAST])

    X, Y = np.array(X), np.array(Y)

    X_train, X_val, Y_train, Y_val = train_test_split(X, Y, test_size=0.2, shuffle=False)

    return X_train, Y_train, X_val, Y_val


# 4. Train the model
def train_model(model_path, x_train, y_train, val_data):
    # building model
    model = Sequential()
    # model.add(GRU(units=64, return_sequences=True, input_shape=(N_LOOKBACK, 1)))
    # model.add(GRU(units=32))
    # model.add(Dense(N_FORECAST))
    model.add(InputLayer((N_LOOKBACK, 1)))
    model.add(LSTM(200, return_sequences=True))
    model.add(LSTM(150, activation='relu'))
    model.add(Dense(N_FORECAST, activation='swish'))
    # configure callback functions
    cp = ModelCheckpoint(model_path, save_best_only=True)
    es = EarlyStopping(monitor='val_root_mean_squared_error', mode='min', patience=5)
    # start training
    model.compile(loss=MeanSquaredError(), optimizer=Adam(learning_rate=0.0001), metrics=RootMeanSquaredError())
    history = model.fit(x_train, y_train, validation_data=val_data, epochs=100, callbacks=[cp, es])

    return history


# generate the forecasts
def generate_forecast(target_col, scaler, model_path):
    X_ = target_col[- N_LOOKBACK:]  # last available input sequence
    X_ = X_.reshape(1, N_LOOKBACK, 1)

    forecast_model = load_model(model_path)

    Y_ = forecast_model.predict(X_).reshape(-1, 1)
    target_forecast = scaler.inverse_transform(Y_)
    return target_forecast


# organize the results in a data frame

def organize_and_get_results(df, target_forecast, date_col_name, target_col_name):
    df_past = df[[target_col_name]].reset_index()
    df_past.rename(columns={'index': date_col_name, target_col_name: 'Actual'}, inplace=True)
    df_past[date_col_name] = pd.to_datetime(df_past[date_col_name])
    df_past['Forecast'] = np.nan
    df_past['Forecast'].iloc[-1] = df_past['Actual'].iloc[-1]

    df_future = pd.DataFrame(columns=[date_col_name, 'Actual', 'Forecast'])
    df_future[date_col_name] = pd.date_range(start=df_past[date_col_name].iloc[-1] + pd.Timedelta(minutes=5),
                                             freq='5min', periods=N_FORECAST)
    df_future['Forecast'] = target_forecast.flatten()
    df_future['Actual'] = np.nan

    results = pd.concat([df_past, df_future]).set_index(date_col_name)
    return results, list(df_future['Forecast'])


# Forecasting....
def forecast(file_name, date_column_name, target_column_name, model_path):
    df, target_col = prepare_data(file_name, date_column_name, target_column_name)

    scaler, target_col = scale_data(target_col)

    X_train, Y_train, X_val, Y_val = generate_input_output_sequences(target_col)

    history = train_model(model_path, X_train, Y_train, val_data=(X_val, Y_val))

    target_forecast = generate_forecast(target_col, scaler, model_path)

    results, forecasted_data_list = organize_and_get_results(df, target_forecast, date_column_name, target_column_name)
    return results, forecasted_data_list


def get_mape(file_path, forecast, target_column):
    actual = pd.read_csv(file_path)[target_column][-N_FORECAST:]
    mape = mean_absolute_percentage_error(actual, forecast) * 100
    print("{} MAPE: {:.2f}%".format(target_column, mape))


if __name__ == "__main__":
    # CPU Forecasting
    clear_session()
    file_path = r"C:\Users\uzays\OneDrive - University of Greenwich\COURSES\1b-Summer Term (COMP-1252-MSc " \
                r"Project)\datasets\scripts\test\vm_752502434_.csv"
    cpu_forecast_results, cpu_forecast_data_list = forecast(
        file_name=file_path,
        date_column_name='timestamp',
        target_column_name='cpu_usage',
        model_path='../model_cpu/model_cpu.h5'
    )
    # plot the results
    cpu_forecast_results[-MIN_WINDOW:].plot(title='CPU Usage')
    plt.show()

    # Memory Forecasting
    clear_session()
    memory_forecast_results, memory_forecast_data_list = forecast(
        file_name=file_path,
        date_column_name='timestamp',
        target_column_name='memory_usage',
        model_path='../model_memory/model_memory.h5'
    )

    print(memory_forecast_data_list)
    # plot the results
    memory_forecast_results[-MIN_WINDOW:].plot(title='Memory Usage')
    plt.show()

    get_mape(file_path=file_path, forecast=cpu_forecast_data_list, target_column='cpu_usage')
    get_mape(file_path=file_path, forecast=memory_forecast_data_list, target_column='memory_usage')
