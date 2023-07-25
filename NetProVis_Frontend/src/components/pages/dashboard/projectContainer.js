import React from 'react';
import {Col, Row, Typography} from "antd";
import {FolderOpenFilled} from "@ant-design/icons";

const {Title, Text} = Typography;


const ProjectContainer = ({storedProjectName, storedProjectID, storedProjectState}) => {
    const stateColors = {
        ACTIVE: '#09db41',
        DELETE_REQUESTED: '#ed1607',
        DELETE_IN_PROGRESS: '#fa6102',
        LIFECYCLE_STATE_UNSPECIFIED: '#ffffff',
    };
    const stateColor = stateColors[storedProjectState];

    return (
        <Col>
            <Row>
                <span>
                    <Title level={3} className="dashboard-title">
                        Project
                        <FolderOpenFilled style={{marginLeft: "18vh", fontSize: "30px"}}/>
                    </Title>
                </span>
            </Row>
            <Row>
                <span>
                    <Text className="dashboard-label">Project Name: </Text>
                    <Text className="dashboard-text" style={{marginLeft:"6vh"}}>{storedProjectName}</Text>
                </span>
            </Row>
            <Row>
                <span>
                    <Text className="dashboard-label">Project ID: </Text>
                    <Text className="dashboard-text">{storedProjectID}</Text>
                </span>
            </Row>
            <Row>
                <span>
                    <Text className="dashboard-label">Project State: </Text>
                    <Text className="dashboard-text"
                          style={{color: stateColor, marginLeft:"3vh"}}>{storedProjectState}</Text>
                </span>
            </Row>
        </Col>
    );
}

export default ProjectContainer;