import React, { useEffect, useState } from 'react';
import { Col, ConfigProvider, Progress, Row, Statistic, Typography } from "antd";
import { LoadingOutlined, PieChartFilled } from "@ant-design/icons";
import axios from "axios";

const { Title } = Typography;

const ResourcesContainer = ({ reload }) => {
    const [cpuUsage, setCpu] = useState(0);
    const [memoryUsage, setMemory] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchData = () => {
        setLoading(true);
        axios
            .get('http://localhost:8000/get_cluster_cpu')
            .then(response => {
                setCpu(response.data);
                setLoading(false); // Stop loading animation on success
            })
            .catch(error => {
                console.log('Error:', error);
                setLoading(false); // Stop loading animation on error
            });
        axios
            .get('http://localhost:8000/get_cluster_memory')
            .then(response => {
                setMemory(response.data);
            })
            .catch(error => {
                console.log('Error:', error);
            });
    };

    useEffect(() => {
        fetchData();
    }, [reload]); // Fetch data again whenever 'reload' changes

    return (
        <Col>
            <Row align="middle" gutter={8}>
                <Col style={{ marginRight: "10px", marginBottom: "15px" }}>
                    <PieChartFilled style={{ fontSize: "30px", color: "#1890ff" }} />
                </Col>
                <Col>
                    <Title level={3} className="dashboard-title">
                        Resources
                    </Title>
                </Col>
            </Row>

            <ConfigProvider
                theme={{
                    components: {
                        Progress: {
                            colorText: '#ffffff',
                        },
                    },
                }}
            >
                {/* Conditionally render loading spinner or content */}
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '4rem' }}>
                        <LoadingOutlined style={{ fontSize: 40 }} spin />
                    </div>
                ) : (
                    <Row gutter={16}>
                        <Col span={6}>
                            <Title level={5} style={{ color: 'white', textAlign: 'center' }}>CPU</Title>
                        </Col>
                        <Col span={6}>
                            <Progress sty trailColor={"white"} title="CPU" type="dashboard"
                                percent={cpuUsage.toFixed(0)} size={64}/>
                        </Col>
                        <Col span={6}>
                            <Title level={5} style={{ color: 'white', textAlign: 'center' }}>Memory</Title>
                        </Col>
                        <Col span={6}>
                            <Progress trailColor={"white"} title="Memory" type="dashboard"
                                percent={memoryUsage.toFixed(0)} size={64}/>
                        </Col>
                    </Row>
                )}
            </ConfigProvider>
        </Col>
    );
}

export default ResourcesContainer;
