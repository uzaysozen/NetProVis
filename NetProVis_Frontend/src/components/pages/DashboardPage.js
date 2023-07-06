import React, {useEffect, useState} from 'react';
import '../../styles/DashboardPage.css';
import {Content} from "antd/es/layout/layout";
import {Col, Row} from "antd";
import { Typography } from 'antd';
import ProjectSelectModal from "../modals/ProjectSelectModal";
const {Title, Text} = Typography;

const DashboardPage = () => {
    const storedProject = localStorage.getItem('selectedProject');
    const [reload, setReload] = useState(false);

    const handleReload = (value) => {
        setReload(value);
    };

    useEffect(() => {
        if (reload) {
            setReload((prevState) => !prevState);
        }
    }, [reload]);

    if (storedProject) {
        return (
            <Content className="dashboard-content">
                <Row gutter={24}>
                    <Col className="gutter-row" span={6}>
                        <Row className="dashboard-container">
                            <Col>
                                <Title level={2} className="dashboard-title">
                                    {storedProject}
                                </Title>
                            </Col>
                        </Row>
                    </Col>
                    <Col className="gutter-row" span={6}>
                        <Row className="dashboard-container">

                        </Row>
                    </Col>
                    <Col className="gutter-row" span={6}>
                        <Row className="dashboard-container">

                        </Row>
                    </Col>
                    <Col className="gutter-row" span={6}>
                        <Row className="dashboard-container">

                        </Row>
                    </Col>
                </Row>
                <Row gutter={24}>
                    <Col className="gutter-row" span={15}>
                        <Row className="dashboard-container">

                        </Row>
                    </Col>
                    <Col className="gutter-row" span={9}>
                        <Row className="dashboard-container">

                        </Row>
                    </Col>
                </Row>
                <Row gutter={24}>
                    <Col className="gutter-row" span={24}>
                        <Row className="dashboard-container">

                        </Row>
                    </Col>
                </Row>
            </Content>
        );
    } else {
        return (
            <Content className="dashboard-content">
                <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}>
                    <ProjectSelectModal isDashboard={true} onDashboardReload={handleReload}/>
                </div>
            </Content>
        );
    }
}

export default DashboardPage;
