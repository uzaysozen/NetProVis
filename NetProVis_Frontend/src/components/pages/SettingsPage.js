import React from 'react';
import '../../styles/SettingsPage.css';
import {Content} from "antd/es/layout/layout";
import {Button, Col, Row, Switch} from "antd";
import {SettingFilled} from "@ant-design/icons";
import {Typography} from 'antd';
import ProjectSelectModal from "../modals/ProjectSelectModal";

const {Title, Text} = Typography;

const SettingsPage = () => {


    return (
        <Content className="settings-content">
            <Row className="settings-container" align="top">
                <Col>
                    <Row className="settings-row">
                        <Col>
                            <span className="settings-span">
                                <SettingFilled className="settings-icon"/>
                                <Title level={1} className="settings-title">Settings</Title>
                            </span>
                        </Col>
                    </Row>
                    <Row className="settings-row">
                        <Col>
                            <span className="settings-span">
                                <Title level={3} className="settings-subtitle">Current Project: </Title>
                                <Text className="settings-project">my_project</Text>
                                <ProjectSelectModal/>
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
                    <Row className="settings-row">
                        <Col>
                            <span className="settings-span">
                                <Button className="settings-save-btn">Save</Button>
                            </span>
                        </Col>
                    </Row>
                </Col>
            </Row>
        </Content>
    );
}

export default SettingsPage;
