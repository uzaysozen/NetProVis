import React from "react";
import {Chart} from "react-google-charts";


const BigResourceChart = () => {

    const options = {
        title: "Age vs. Weight comparison",
        hAxis: {title: "Age", viewWindow: {min: 0, max: 15}},
        vAxis: {title: "Weight", viewWindow: {min: 0, max: 15}},
        legend: "none",
        backgroundColor: "transparent"
    };

    const data = [
        ["Age", "Weight"],
        [8, 12],
        [4, 5.5],
        [11, 14],
        [4, 5],
        [3, 3.5],
        [6.5, 7]
    ];
    return (
        <Chart
            chartType="ScatterChart"
            data={data}
            options={options}
            width="100%"
            height="400px"
            legendToggle
        />
    );
}

export default BigResourceChart;