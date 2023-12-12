import React, {useEffect, useState} from 'react';
import '../../styles/DashboardPage.css';
import {Content} from "antd/es/layout/layout";
import {getPastThresholds} from "../../util/api";
import {Col, Dropdown, Menu, Row, Space} from "antd";
import {DownOutlined} from "@ant-design/icons";
import {Chart} from "react-google-charts";

const ThresholdStatsPage = () => {
    const [cpuChartTitle, setCpuChartTitle] = useState("");
    const [memoryChartTitle, setMemoryChartTitle] = useState("");
    const [podsData, setPodsData] = useState({});
    const [cpuData, setCpuData] = useState([["Timestamp", "CPU Usage Threshold (%)", "CPU Usage (%)"]]);
    const [memoryData, setMemoryData] = useState([["Timestamp", "Memory Usage Threshold (%)", "Memory Usage (%)"]]);

    const fetchPodsData = () => {
        getPastThresholds()
            .then(response => {
                setPodsData(response.data);
            })
            .catch(error => {
                console.log('Error:', error);
            });
    };

    useEffect(() => {
        fetchPodsData(); // initial fetch

        const intervalId = setInterval(() => {
            fetchPodsData();
        }, 15000); // fetch data every 15 seconds

        return () => clearInterval(intervalId); // clear interval on component unmount
    }, []);

    useEffect(() => {
        const podNames = Object.keys(podsData);
        if (podNames.length > 0) {
            handleCpuPodMenuClick(podNames[0]);
            handleMemoryPodMenuClick(podNames[0]);
        }
    }, [podsData]);

    const handleCpuPodMenuClick = (podName) => {
        const podData = podsData[podName];
        if (!podData) {
            console.log('No data found for this pod');
            return;
        }
        let cpuThresholdData = [];
        let cpuData = [];
        if (podData["cpu"]) {
            cpuThresholdData = podData["cpu"]["thresholdValues"];
            cpuData = podData["cpu"]["values"];
        }
        let chartData = [["Timestamp", "CPU Usage Threshold (%)", "CPU Usage (%)"]];
        for (var i = 0; i < cpuThresholdData.length; i++) {
            const timestamp = Object.keys(cpuThresholdData[i])[0];
            const cpuThreshold = cpuThresholdData[i][timestamp];
            const cpuUsage= cpuData[i][timestamp];
            chartData.push([timestamp, parseFloat(cpuThreshold), parseFloat(cpuUsage)]);
        }

        setCpuData(chartData);
        setCpuChartTitle(`CPU Thresholds for "${podName}"`);
    };

    const handleMemoryPodMenuClick = (podName) => {
        const podData = podsData[podName];
        if (!podData) {
            console.log('No data found for this pod');
            return;
        }
        console.log(podData);
        let memoryThresholdData = []
        let memoryData = []
        if (podData["memory"]) {
            memoryThresholdData = podData["memory"]["thresholdValues"];
            memoryData = podData["memory"]["values"];
        }
        let chartData = [["Timestamp", "Memory Usage Threshold (%)", "Memory Usage (%)"]];
        for (var i = 0; i < memoryThresholdData.length; i++) {
            const timestamp = Object.keys(memoryThresholdData[i])[0];
            const memoryThreshold = memoryThresholdData[i][timestamp];
            const memoryUsage= memoryData[i][timestamp];
            chartData.push([timestamp, parseFloat(memoryThreshold), parseFloat(memoryUsage)]);
        }

        setMemoryData(chartData);
        setMemoryChartTitle(`Memory Thresholds for "${podName}"`);
    };

    const podMenu = (handlePodMenuClick) => (
        <Menu>
            {Object.keys(podsData).map((podName, index) => (
                <Menu.Item key={index} onClick={() => handlePodMenuClick(podName)}>
                    {podName}
                </Menu.Item>
            ))}
        </Menu>
    );

    const options = {
        titleTextStyle: {
            color: "white", // Set title text color to white
            fontSize: 20, // Set title font size
            bold: true, // Make title bold
            italic: false, // Make title not italic
        },
        pointSize: 0,
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
            gridlines: {
                color: "#636366",
                count: 11
            },
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

    return (
        <Content style={{backgroundColor: "#232323", color: "white"}}>
            <Row gutter={24}>
                <Col span={1}></Col>
                <Col className="gutter-row" span={10}>
                    <Row className="dashboard-container" style={{marginTop: "10vh"}}>
                        {/* CPU Chart */}
                        <div style={{padding: "10px"}}>
                            <div style={{marginBottom: "15px", display: "flex", justifyContent: "end"}}>
                                <Dropdown overlay={podMenu(handleCpuPodMenuClick)} trigger={["click"]}>
                                    <button id="chart-pod-dropdown-btn" onClick={(e) => e.preventDefault()}>
                                        <Space>
                                            Select a Pod for CPU
                                            <DownOutlined/>
                                        </Space>
                                    </button>
                                </Dropdown>
                            </div>
                            <Chart
                                chartType="LineChart"
                                data={cpuData}
                                options={{...options, title: cpuChartTitle, colors: ['#ff0000', '#00e5ff']}}
                                width="100%"
                                height="400px"
                            />
                        </div>
                    </Row>
                </Col>
                <Col span={1}></Col>
                <Col className="gutter-row" span={10}>
                    <Row className="dashboard-container" style={{marginTop: "10vh"}}>
                        {/* Memory Chart */}
                        <div style={{padding: "10px"}}>
                            <div style={{marginBottom: "15px", display: "flex", justifyContent: "end"}}>
                                <Dropdown overlay={podMenu(handleMemoryPodMenuClick)} trigger={["click"]}>
                                    <button id="chart-pod-dropdown-btn" onClick={(e) => e.preventDefault()}>
                                        <Space>
                                            Select a Pod for Memory
                                            <DownOutlined/>
                                        </Space>
                                    </button>
                                </Dropdown>
                            </div>
                            <Chart
                                chartType="LineChart"
                                data={memoryData}
                                options={{...options, title: memoryChartTitle, colors: ['#ff0000', '#ff00ff']}}
                                width="100%"
                                height="400px"
                            />
                        </div>
                    </Row>
                </Col>
            </Row>
        </Content>
    );
};

export default ThresholdStatsPage;
