import React, {useState} from "react";
import {Chart} from "react-google-charts";
import {DownOutlined, LoadingOutlined} from "@ant-design/icons";
import {Dropdown, Menu, Space, Spin} from "antd";
import {getResRequestUtilization} from "../../../util/api";
import '../../../styles/Chart.css';

const BigResourceChart = ({reload, pods}) => {

    let cpuData = []
    let memoryData = []
    const [loading, setLoading] = useState(false)
    const [chartTitle, setChartTitle] = useState("")
    const [data, setData] = useState([["Timestamp", "CPU Usage (%)", "Memory Usage (%)"], ["", 0, 0]])

    const options = {
        title: chartTitle,
        titleTextStyle: {
            color: "white", // Set title text color to white
            fontSize: 20, // Set title font size
            bold: true, // Make title bold
            italic: false, // Make title not italic
        },
        pointSize: 1,
        hAxis: {
            title: "Time",
            titleTextStyle: {
                color: "white", // Set x-axis title text color to white
            },
            textStyle: {
                color: "transparent", // Set x-axis value text color to white
            },
            slantedText: true
        },
        vAxis: {
            titleTextStyle: {
                color: "white", // Set y-axis title text color to white
            },
            minValue: 0,
            maxValue: 100,
            textStyle: {
                color: "white", // Set y-axis value text color to white
            },
            gridlines: {color: "#636366"},
            minorGridlines: {color: "#636366"},
            baselineColor: "#909196",
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
            0: {lineWidth: 2}, // Set line width for the first data series
            1: {lineWidth: 2}, // Set line width for the second data series
        },
        curveType: "function", // Use a smooth curve for the lines
        chartArea: {width: "85%", height: "80%"}, // Adjust chart area for better visibility
        explorer: {keepInBounds: true, maxZoomIn: .1, maxZoomOut: 1}
    };

    /*const data = [
        ["Timestamp", "CPU Usage (%)", "Memory Usage (%)"],
        ["2023-09-13 10:00:00", 30, 40],
        ["2023-09-13 10:15:00", 40, 45],
        ["2023-09-13 10:30:00", 35, 50],
        ["2023-09-13 10:45:00", 45, 55],
        ["2023-09-13 11:00:00", 50, 60],
        ["2023-09-13 11:15:00", 55, 65],
    ];*/

    const handlePodMenuClick = async (pod) => {
        setLoading(true);
        await getResRequestUtilization(pod, "cpu").then((response) => {
            cpuData = response.data;
        }).catch((e) => console.log(e.message));
        await getResRequestUtilization(pod, "memory").then((response) => {
            memoryData = response.data;
        }).catch((e) => console.log(e.message));

        let result = [["Timestamp", "CPU Usage (%)", "Memory Usage (%)"]]
        for (let i = Math.min(cpuData.length, memoryData.length)-1; i >= 0; i--) {
            result.push([cpuData[i].timestamp, cpuData[i].cpu_usage, memoryData[i].memory_usage])
        }
        setData(result);
        setChartTitle(`CPU and Memory Limit Utilization for "${pod.metadata.name}"`)
        setLoading(false);
    };

    const podMenu = (
        <Menu>
            {pods.map((pod, index) => (
                <Menu.Item key={index} onClick={() => handlePodMenuClick(pod)}>
                    {pod.metadata.name}
                </Menu.Item>
            ))}
        </Menu>
    );

    return (
        (reload || loading) ? (
            <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '4rem'}}>
                <Spin indicator={<LoadingOutlined style={{fontSize: 40}} spin/>}/>
            </div>
        ) : (
            <div style={{padding: "10px"}}>
                <div style={{marginBottom: "15px", display: "flex", justifyContent: "end"}}>
                    <Dropdown overlay={podMenu} trigger={["click"]}>
                        <button id="chart-pod-dropdown-btn" onClick={(e) => e.preventDefault()}>
                            <Space>
                                Select a Pod
                                <DownOutlined/>
                            </Space>
                        </button>
                    </Dropdown>
                </div>
                <Chart
                    chartType="LineChart"
                    data={data}
                    options={options}
                    width="100%"
                    height="400px"
                />
            </div>
        )

    );
};

export default BigResourceChart;
