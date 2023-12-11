import React from 'react';
import { Col, Row, Typography, Badge } from "antd";
import { FolderOpenFilled } from "@ant-design/icons";

const { Title, Text } = Typography;

const ProjectContainer = ({ storedProjectName, storedProjectID, storedProjectState }) => {
    const stateColors = {
        ACTIVE: '#09db41',
        DELETE_REQUESTED: '#ed1607',
        DELETE_IN_PROGRESS: '#fa6102',
        LIFECYCLE_STATE_UNSPECIFIED: '#000000', // Set an appropriate color for unspecified state
    };
    const stateColor = stateColors[storedProjectState];

    return (
        <Col>
            <Row align="middle" gutter={8}>
                <Col style={{marginRight: "10px", marginBottom: "15px"}}>
                    <FolderOpenFilled style={{ fontSize: "30px", color: "#1890ff" }} />
                </Col>
                <Col>
                    <Title level={3} className="dashboard-title">
                        Project
                    </Title>
                </Col>
            </Row>
            <Row gutter={16}>
                <Col span={12}>
                    <Text className="dashboard-label">Project Name:</Text>
                </Col>
                <Col span={12}>
                    <Text className="dashboard-text">{storedProjectName}</Text>
                </Col>
            </Row>
            <Row gutter={16}>
                <Col span={12}>
                    <Text className="dashboard-label">Project ID:</Text>
                </Col>
                <Col span={12}>
                    <Text className="dashboard-text">{storedProjectID}</Text>
                </Col>
            </Row>
            <Row gutter={16}>
                <Col span={12}>
                    <Text className="dashboard-label">Project State:</Text>
                </Col>
                <Col span={12}>
                    <Badge color={stateColor} text={storedProjectState} style={{color: stateColor}} />
                </Col>
            </Row>
        </Col>
    );
};

export default ProjectContainer;
