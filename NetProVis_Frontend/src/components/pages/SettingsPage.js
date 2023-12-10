import React from 'react';
import '../../styles/SettingsPage.css';
import { Content } from "antd/es/layout/layout";
import { Col, Row, Switch } from "antd";
import { Typography } from 'antd';
import ProjectSelectModal from "../modals/ProjectSelectModal";
import {faGear} from "@fortawesome/free-solid-svg-icons";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

const {Title, Text} = Typography;

const SettingsPage = () => {


    return (
        <Content className="settings-content">
            <Row className="settings-container" align="top">
                <Col>
                    <Row className="settings-row">
                        <Col>
                            <span className="settings-span">
                                <FontAwesomeIcon className="settings-icon" icon={faGear}/>
                                <Title level={1} className="settings-title">Settings</Title>
                            </span>
                        </Col>
                    </Row>
                    <Row className="settings-row">
                        <Col>
                            <span className="settings-span">
                                <ProjectSelectModal isDashboard={false}/>
                            </span>
                        </Col>
                    </Row>
                    <Row className="settings-row">
                        <Col>
                            <span className="settings-span">
                                <Title level={3} className="settings-subtitle">Notifications: </Title>
                                <Switch defaultChecked className="settings-switch"/>
                                <Text className="settings-notification-text">In App</Text>
                                <Switch defaultChecked className="settings-switch"/>
                                <Text className="settings-notification-text">Email</Text>
                            </span>
                        </Col>
                    </Row>
                </Col>
            </Row>
        </Content>
    );
}

export default SettingsPage;
