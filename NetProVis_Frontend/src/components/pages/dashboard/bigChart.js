import React from "react";
import { Chart } from "react-google-charts";

const BigResourceChart = () => {
    const options = {
        title: "CPU and Memory Usage",
        titleTextStyle: {
            color: "white", // Set title text color to white
            fontSize: 20, // Set title font size
            bold: true, // Make title bold
            italic: false, // Make title not italic
            textAlign: "center", // Center align the title
        },
        pointSize: 4,
        hAxis: {
            title: "Time",
            titleTextStyle: {
                color: "white", // Set x-axis title text color to white
            },
            textStyle: {
                color: "white", // Set x-axis value text color to white
            },
        },
        vAxis: {
            title: "Percentage",
            titleTextStyle: {
                color: "white", // Set y-axis title text color to white
            },
            minValue: 0,
            maxValue: 100,
            textStyle: {
                color: "white", // Set y-axis value text color to white
            },
            gridlines: { color: "#636366" },
            minorGridlines: {color: "#636366" },
            baselineColor: "transparent",
        },
        legend: {
            textStyle: {
                color: "white", // Set legend text color to white
            },
            position: "bottom",
        },
        backgroundColor: "transparent",
        lineWidth: 2, // Set line width to make it thicker
        series: {
            0: { lineWidth: 2 }, // Set line width for the first data series
            1: { lineWidth: 2 }, // Set line width for the second data series
        },
        curveType: "function", // Use a smooth curve for the lines
        chartArea: { width: "85%", height: "80%" }, // Adjust chart area for better visibility
        explorer: { keepInBounds: true, maxZoomIn: .1, maxZoomOut: 1 }
    };

    const data = [
        ["Timestamp", "CPU Usage (%)", "Memory Usage (%)"],
        ["2023-09-13 10:00:00", 30, 40],
        ["2023-09-13 10:15:00", 40, 45],
        ["2023-09-13 10:30:00", 35, 50],
        ["2023-09-13 10:45:00", 45, 55],
        ["2023-09-13 11:00:00", 50, 60],
        ["2023-09-13 11:15:00", 55, 65],
    ];

    return (
        <div style={{ padding: "10px" }}>
            <Chart
                chartType="LineChart"
                data={data}
                options={options}
                width="100%"
                height="400px"
            />
        </div>
    );
};

export default BigResourceChart;
