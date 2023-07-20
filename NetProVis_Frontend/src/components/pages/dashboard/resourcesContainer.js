import React from 'react';
import {Col, ConfigProvider, Row, Statistic, Typography} from "antd";
import {PercentageOutlined, PieChartFilled} from "@ant-design/icons";

const {Title} = Typography;


const ResourcesContainer = () => {
    return (
        <Col>
            <Row>
                <span>
                    <Title level={3} className="dashboard-title">
                        Resources
                        <PieChartFilled style={{marginLeft: "14vh", fontSize: "30px"}}/>
                    </Title>
                </span>
            </Row>
            <ConfigProvider
                theme={{
                    components: {
                        Statistic: {
                            colorText: '#ffffff',
                            colorTextHeading: '#ffffff',
                            colorTextDescription: 'rgba(255,255,255,0.85)'
                        },
                    },
                }}
            >
                <Row gutter={16}>
                    <Col span={12}>
                        <Statistic style={{marginLeft: "6vh"}} title="CPU" value={57} suffix={<PercentageOutlined/>}/>
                    </Col>
                    <Col span={12}>
                        <Statistic style={{marginLeft: "2vh"}} title="RAM" value={39} suffix={<PercentageOutlined/>}/>
                    </Col>
                </Row>
            </ConfigProvider>

        </Col>
    );
}

export default ResourcesContainer;