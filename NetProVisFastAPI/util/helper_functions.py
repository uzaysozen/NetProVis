from datetime import timedelta
import pytz
import requests


def get_date_range(min_diff, given_date):
    given_datetime = given_date.astimezone(pytz.timezone('GMT'))
    # Calculate earlier datetime using timedelta
    earlier_datetime = given_datetime - timedelta(minutes=min_diff)
    # Format the date and time as 'YYYY/MM/DD-HH:MM:SS'
    formatted_earlier_datetime = earlier_datetime.strftime('%Y/%m/%d-%H:%M:%S')
    formatted_datetime = given_datetime.strftime('%Y/%m/%d-%H:%M:%S')
    return formatted_earlier_datetime, formatted_datetime


def get_cluster_resource_usage(access_token, project_id, query):
    endpoint = f"https://monitoring.googleapis.com/v3/projects/{project_id}/timeSeries:query"
    headers = {"Authorization": f"Bearer {access_token}"}
    payload = {"query": query}

    # Make the API request
    response = requests.post(endpoint, json=payload, headers=headers)
    response.raise_for_status()  # Raise an exception if the request was unsuccessful

    # Get the list of clusters from the response
    data = response.json()

    # Extract the 'doubleValue' values from the 'timeSeriesData' for each label value
    res_usage_values = []
    for time_series in data.get("timeSeriesData", []):
        res_usage_series = []
        for point_data in time_series.get("pointData", []):
            res_usage = point_data.get("values", [{}])[0].get("doubleValue", 0.0)
            res_usage_series.append(res_usage)
        res_usage_values.append(sum(res_usage_series) / len(res_usage_series))
    # Calculate the average CPU usage for each label value
    average_cpu_usage = sum(res_usage_values) / len(res_usage_values)

    print("Average Resource Usage for Each Label Value:")
    print("{}: {:.2%}".format(query.split(' ')[1], average_cpu_usage))

    return average_cpu_usage * 100
