import React, {useEffect, useState} from 'react';
import {Col, ConfigProvider, Row, Statistic, Typography, Spin, Card} from "antd";
import {LoadingOutlined} from "@ant-design/icons";
import {faWifi} from "@fortawesome/free-solid-svg-icons";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import axios from "axios";
import {getNetworkStats, getTasks} from "../../../util/api";

const {Title} = Typography;

const NetworkStatsContainer = ({reload}) => {
    const [networkStats, setNetworkStats] = useState([])
    const [loading, setLoading] = useState(false);

    const fetchData = () => {
        setLoading(true);
        getNetworkStats()
            .then(response => {
                setNetworkStats(response.data);
                setLoading(false);
            })
            .catch(error => {
                console.log('Error:', error);
                setLoading(true);
            });
    };

    useEffect(() => {
        fetchData()
    }, [reload]);

    const renderStats = () => {
        if (reload) {
            return (
                <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '4rem'}}>
                    <Spin indicator={<LoadingOutlined style={{fontSize: 40}} spin/>}/>
                </div>
            );
        }

        // Replace these dummy values with your actual network stats data
        const egressBytes = networkStats[0];
        const egressPackets = networkStats[1];
        const ingressBytes = networkStats[2];
        const ingressPackets = networkStats[3];
        const rtt = networkStats[4];

        const cardStyle = {
            marginTop: "1.65vh",
            backgroundColor: "#444444",
            border: "#777777 solid 1px",
            borderRadius: "5px",
            color: "#ffffff",// Text color
            textAlign: "center"
        };

        const statisticStyle = {
            color: "#ffffff", // Statistic text color
        };

        return (
            <Row gutter={24}>
                <Col span={12}>
                    <Card style={cardStyle}>
                        <Statistic title="Egress Bytes Count" value={egressBytes} suffix="B" valueStyle={statisticStyle}/>
                    </Card>
                </Col>
                <Col span={12}>
                    <Card style={cardStyle}>
                        <Statistic title="Egress Packets Count" value={egressPackets} valueStyle={statisticStyle}/>
                    </Card>
                </Col>
                <Col span={24}>
                    <Card style={cardStyle}>
                        <Statistic title="RTT" value={rtt} suffix="ms"
                                   valueStyle={statisticStyle}/>
                    </Card>
                </Col>
                <Col span={12}>
                    <Card style={cardStyle}>
                        <Statistic title="Ingress Bytes Count" value={ingressBytes} suffix="B" valueStyle={statisticStyle}/>
                    </Card>
                </Col>
                <Col span={12}>
                    <Card style={cardStyle}>
                        <Statistic title="Ingress Packets Count" value={ingressPackets}
                                   valueStyle={statisticStyle}/>
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
                {loading ? (
                        <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '4rem'}}>
                            <Spin indicator={<LoadingOutlined style={{fontSize: 40}} spin/>}/>
                        </div>
                    ) : (renderStats())}
            </ConfigProvider>
        </Col>
    );
};

export default NetworkStatsContainer;
