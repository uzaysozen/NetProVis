import React, {useEffect, useState} from "react";
import {Chart} from "react-google-charts";
import {DownOutlined, LoadingOutlined} from "@ant-design/icons";
import {Col, Dropdown, Menu, Row, Space, Spin} from "antd";
import {getResRequestUtilization} from "../../../util/api";
import '../../../styles/Chart.css';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faChartArea} from "@fortawesome/free-solid-svg-icons";

const BigResourceChart = ({reload, pods}) => {

    let cpuData = []
    let memoryData = []
    const [loading, setLoading] = useState(false)
    const [chartTitle, setChartTitle] = useState("")
    const [data, setData] = useState([["Timestamp", "CPU Usage (%)", "Memory Usage (%)"]])

    const options = {
        title: chartTitle,
        titleTextStyle: {
            color: "white", // Set title text color to white
            fontSize: 20, // Set title font size
            bold: true, // Make title bold
            italic: false, // Make title not italic
        },
        colors: ['#00e5ff', '#ff00ff'],
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

    useEffect(() => {
        if (pods.length > 0) {
            handlePodMenuClick(pods[0]);
        }
    }, [pods]);


    const handlePodMenuClick = async (pod) => {
        setLoading(true);
        await getResRequestUtilization(pod, "cpu").then((response) => {
            cpuData = response.data;
        }).catch((e) => console.log(e.message));
        await getResRequestUtilization(pod, "memory").then((response) => {
            memoryData = response.data;
        }).catch((e) => console.log(e.message));

        let result = [["Timestamp", "CPU Usage (%)", "Memory Usage (%)"]]
        for (let i = Math.min(cpuData.length, memoryData.length) - 1; i >= 0; i--) {
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
        <Col>
            <Row align="middle" gutter={24}>
                <Col className="gutter-row" span={20}>
                    <FontAwesomeIcon icon={faChartArea} size="2x" style={{color: "#1890ff"}}/>
                </Col>
                <Col className="gutter-row" span={4}>
                    <div style={{marginBottom: "12px", display: "flex", justifyContent: "end"}}>
                        <Dropdown overlay={podMenu} trigger={["click"]}>
                            <button id="chart-pod-dropdown-btn" onClick={(e) => e.preventDefault()}>
                                <Space>
                                    Select a Pod
                                    <DownOutlined/>
                                </Space>
                            </button>
                        </Dropdown>
                    </div>
                </Col>
            </Row>
            {(reload || loading) ? (
                <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '4rem'}}>
                    <Spin indicator={<LoadingOutlined style={{fontSize: 40}} spin/>}/>
                </div>
            ) : (
                <div style={{padding: "10px"}}>
                    <Chart
                        chartType="LineChart"
                        data={data}
                        options={options}
                        width="100%"
                        height="400px"
                />
            </div>
            )}
        </Col>


    );
};

export default BigResourceChart;
