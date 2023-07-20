def calculate_threshold(forecasted_cpu_usage):
    num_values = len(forecasted_cpu_usage)
    weights = [i / num_values for i in range(num_values + 1, 1, -1)]
    # Calculate the average CPU usage
    weighted_sum = sum(value * weight for value, weight in zip(forecasted_cpu_usage, weights))
    mean_cpu_usage = weighted_sum / num_values

    print("  - Mean CPU Usage: ", round(mean_cpu_usage, 2))

    # Calculate the standard deviation of the CPU usage
    weighted_squared_diff = sum(
        ((value - mean_cpu_usage) ** 2) * weight for value, weight in zip(forecasted_cpu_usage, weights))
    weighted_std_dev = (weighted_squared_diff / num_values) ** 0.5

    print("  - Standard Deviation: ", round(weighted_std_dev, 2))

    # Determine the threshold value
    multiplier = 1.5  # Adjust this value as needed
    threshold = round((mean_cpu_usage + weighted_std_dev) * multiplier)

    # Limit the threshold to 100 if it exceeds that value
    if threshold > 95:
        threshold = 95

    return threshold


normal_cpu_forecast = [34.2, 36.8, 35.5, 38.1, 37.9, 35.6, 36.4, 37.2, 36.9, 35.2, 36.1, 34.9]
increasing_cpu_forecast = [20.1, 25.2, 28.9, 31.6, 34.8, 38.7, 43.2, 48.1, 53.5, 59.6, 66.3, 73.8]
decreasing_cpu_forecast = [81.9, 75.3, 68.6, 62.1, 55.9, 50.1, 44.6, 39.5, 34.7, 30.2, 25.9, 21.9]
random_cpu_forecast = [54.8, 46.3, 52.7, 59.1, 62.5, 57.4, 50.8, 43.7, 49.6, 53.9, 49.5, 45.6]
high_stable_cpu_forecast = [92.1, 94.5, 91.3, 89.9, 88.6, 87.4, 86.3, 85.2, 84.1, 83.0, 82.0, 81.0]
low_stable_cpu_forecast = [13.6, 12.8, 14.1, 15.5, 17.0, 18.6, 20.3, 22.0, 23.8, 25.6, 27.5, 29.5]

from_pred = [28.744131088256836, 30.992971420288086, 28.73280906677246, 28.12400245666504, 30.685771942138672,
             28.892316818237305, 30.951101303100586, 27.874757766723633, 30.67538833618164, 30.05352783203125,
             29.700502395629883, 29.495054244995117, 29.328214645385742, 29.950923919677734, 29.997709274291992,
             30.297405242919922, 29.484357833862305, 31.154905319213867, 29.488628387451172, 30.97349739074707,
             28.79655647277832, 30.744678497314453, 29.584617614746094, 29.338518142700195]

if __name__ == "__main__":
    print("Normal scenario (relatively stable CPU usage): ")
    print("  - HPA Threshold: ", calculate_threshold(normal_cpu_forecast))

    print("Increasing CPU usage over time: ")
    print("  - HPA Threshold: ", calculate_threshold(increasing_cpu_forecast))

    print("Decreasing CPU usage over time: ")
    print("  - HPA Threshold: ", calculate_threshold(decreasing_cpu_forecast))

    print("Random fluctuations in CPU usage: ")
    print("  - HPA Threshold: ", calculate_threshold(random_cpu_forecast))

    print("High CPU usage at the beginning, then stable: ")
    print("  - HPA Threshold: ", calculate_threshold(high_stable_cpu_forecast))

    print("Low CPU usage at the beginning, then stable: ")
    print("  - HPA Threshold: ", calculate_threshold(low_stable_cpu_forecast))

    print("Prediction values: ")
    print("  - HPA Threshold: ", calculate_threshold(from_pred))
