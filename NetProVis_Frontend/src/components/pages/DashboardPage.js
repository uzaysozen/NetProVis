import React, {useEffect, useState} from 'react';
import '../../styles/DashboardPage.css';
import {Content} from "antd/es/layout/layout";
import {Button, Col, Row, Spin} from "antd";
import ProjectSelectModal from "../modals/ProjectSelectModal";
import ProjectContainer from "./dashboard/projectContainer";
import PodsContainer from "./dashboard/podsContainer";
import ResourcesContainer from "./dashboard/resourcesContainer";
import TasksContainer from "./dashboard/tasksContainer";
import BigResourceChart from "./dashboard/bigChart";
import {ReloadOutlined} from "@ant-design/icons";

const DashboardPage = () => {
    // State to manage manual reload
    const [reload, setReload] = useState(false);

    // Function to handle manual reload
    const handleReload = () => {
        setReload((prevReload) => !prevReload);
    };

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

    useEffect(() => {
        // Automatic reload every 1 minute
        const interval = setInterval(() => {
            setReload(prevState => !prevState);
        }, 60000);

        return () => {clearInterval(interval)
        setInterval(() => {
            setReload(false);
        }, 3000);
        clearInterval(interval)}; // Clear the interval on unmount

    }, [reload]);

    if (storedProject) {
        return (
            <Content className="dashboard-content">
                {/* Manual Reload Button */}
                {/* Manual Reload Button */}
                <div style={{display: "flex", justifyContent: "center", alignItems: "center", marginTop: "20px"}}>
                    <Button
                        type="text"
                        onClick={handleReload}
                        style={{
                            color: "white",
                            background: "transparent",
                            border: "none",
                            fontSize: "24px",
                            outline: "none",
                        }}
                    >
                        {reload ? (
                            <Spin indicator={<ReloadOutlined style={{fontSize: "24px", color: "white"}} spin/>}/>
                        ) : (
                            <ReloadOutlined style={{fontSize: "24px"}}/>
                        )}
                    </Button>
                </div>
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
                            <ResourcesContainer reload={reload}/>
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
                            {/* Add content here for the right side */}
                        </Row>
                    </Col>
                </Row>
                <Row gutter={24}>
                    <Col className="gutter-row" span={24}>
                        <Row className="dashboard-container">
                            {/* Add content here for the bottom */}
                        </Row>
                    </Col>
                </Row>
            </Content>
        );
    } else {
        return (
            <Content className="dashboard-content">
                <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}>
                    {/* Pass the callback function as a prop */}
                    <ProjectSelectModal isDashboard={true} onDashboardReload={handleReload}/>
                </div>
            </Content>
        );
    }
}

export default DashboardPage;
