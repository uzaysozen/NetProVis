import React, {useState} from 'react';
import {Col, ConfigProvider, Row, Space, Statistic, Typography, Spin, Card} from "antd";
import {LoadingOutlined} from "@ant-design/icons";
import {faWifi} from "@fortawesome/free-solid-svg-icons";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

const {Title} = Typography;

const NetworkStatsContainer = ({reload}) => {
    const [loading, setLoading] = useState(false);

    const renderStats = () => {
        if (reload) {
            return (
                <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '4rem'}}>
                    <Spin indicator={<LoadingOutlined style={{fontSize: 40}} spin/>}/>
                </div>
            );
        }

        // Replace these dummy values with your actual network stats data
        const throughput = 89; // Replace with actual value
        const packetLoss = 3.17; // Replace with actual value
        const bytesReceived = 120456789; // Replace with actual value
        const bytesTransmitted = 98765432; // Replace with actual value
        const latency = 10; // Replace with actual value (in milliseconds)
        const jitter = 2; // Replace with actual value (in milliseconds)

        const cardStyle = {
            marginTop: "1.65vh",
            backgroundColor: "#444444",
            border: "#777777 solid 1px",
            borderRadius: "5px",
            color: "#ffffff", // Text color
        };

        const statisticStyle = {
            color: "#ffffff", // Statistic text color
        };

        return (
            <Row gutter={24}>
                <Col span={12}>
                    <Card style={cardStyle}>
                        <Statistic title="Throughput" value={throughput} suffix="Mbps" valueStyle={statisticStyle}/>
                    </Card>
                </Col>
                <Col span={12}>
                    <Card style={cardStyle}>
                        <Statistic title="Packet Loss" value={packetLoss} suffix="%" valueStyle={statisticStyle}/>
                    </Card>
                </Col>
                <Col span={12}>
                    <Card style={cardStyle}>
                        <Statistic title="Bytes Received" value={bytesReceived} suffix="B" valueStyle={statisticStyle}/>
                    </Card>
                </Col>
                <Col span={12}>
                    <Card style={cardStyle}>
                        <Statistic title="Bytes Transmitted" value={bytesTransmitted} suffix="B"
                                   valueStyle={statisticStyle}/>
                    </Card>
                </Col>
                <Col span={12}>
                    <Card style={cardStyle}>
                        <Statistic title="Latency" value={latency} suffix="ms" valueStyle={statisticStyle}/>
                    </Card>
                </Col>
                <Col span={12}>
                    <Card style={cardStyle}>
                        <Statistic title="Jitter" value={jitter} suffix="ms" valueStyle={statisticStyle}/>
                    </Card>
                </Col>
            </Row>
        );
    };

    return (
        <Col>
            <Row align="middle" gutter={8} style={{marginBottom: "20px"}}>
                <Col style={{marginRight: "10px", marginBottom: "15px"}}>
                    <FontAwesomeIcon icon={faWifi} size="2x" style={{color: "#1890ff"}}/>
                </Col>
                <Col>
                    <Title level={3} className="dashboard-title">
                        Network Stats
                    </Title>
                </Col>
            </Row>

            <ConfigProvider
                theme={{
                    components: {
                        Statistic: {
                            colorTextDescription: '#ffffff'
                        },
                    },
                }}
            >
                {renderStats()}
            </ConfigProvider>
        </Col>
    );
};

export default NetworkStatsContainer;
