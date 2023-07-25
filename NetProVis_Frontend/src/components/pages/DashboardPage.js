import React, {useEffect, useState} from 'react';
import '../../styles/DashboardPage.css';
import {Content} from "antd/es/layout/layout";
import {Col, Row} from "antd";
import ProjectSelectModal from "../modals/ProjectSelectModal";
import ProjectContainer from "./dashboard/projectContainer";
import PodsContainer from "./dashboard/podsContainer";
import ResourcesContainer from "./dashboard/resourcesContainer";
import TasksContainer from "./dashboard/tasksContainer";
import BigResourceChart from "./dashboard/bigChart";

const DashboardPage = () => {
    const storedProject = JSON.parse(localStorage.getItem('selectedProject'));
    console.log(storedProject)
    let storedProjectID;
    let storedProjectState;
    let storedProjectName;
    if (storedProject) {
        storedProjectName = storedProject.name;
        storedProjectID = storedProject.projectId;
        storedProjectState = storedProject.lifecycleState;
    }
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
                            <ProjectContainer
                                storedProjectName={storedProjectName}
                                storedProjectID={storedProjectID}
                                storedProjectState={storedProjectState}
                            />
                        </Row>
                    </Col>
                    <Col className="gutter-row" span={6}>
                        <Row className="dashboard-container">
                            <PodsContainer/>
                        </Row>
                    </Col>
                    <Col className="gutter-row" span={6}>
                        <Row className="dashboard-container">
                            <ResourcesContainer/>
                        </Row>
                    </Col>
                    <Col className="gutter-row" span={6}>
                        <Row className="dashboard-container">
                            <TasksContainer/>
                        </Row>
                    </Col>
                </Row>
                <Row gutter={24}>
                    <Col className="gutter-row" span={15}>
                        <Row className="dashboard-container">
                            <BigResourceChart/>
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
