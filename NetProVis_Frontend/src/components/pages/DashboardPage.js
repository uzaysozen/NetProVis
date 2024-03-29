import React, {useEffect, useState} from 'react';
import '../../styles/DashboardPage.css';
import {Content} from "antd/es/layout/layout";
import {Button, Col, Row} from "antd";
import ProjectSelectModal from "../modals/ProjectSelectModal";
import ProjectContainer from "./dashboard/projectContainer";
import PodsContainer from "./dashboard/podsContainer";
import ResourcesContainer from "./dashboard/resourcesContainer";
import TasksContainer from "./dashboard/tasksContainer";
import BigResourceChart from "./dashboard/bigResourceChart";
import {ReloadOutlined} from "@ant-design/icons";
import {getPods} from "../../util/api";
import ResourceValuesTable from "./dashboard/resourceValuesTable";
import NetworkStatsContainer from "./dashboard/networkStats";

const DashboardPage = () => {
    // State to manage manual reload
    const [reload, setReload] = useState(false);
    const [podsData, setPodsData] = useState([]);

    // Function to handle manual reload
    const handleReload = () => {
        setReload((prevReload) => !prevReload);
    };

    const fetchPodsData = () => {
        getPods()
            .then(response => {
                setPodsData(response.data)
            })
            .catch(error => {
                console.log('Error:', error);
            });
    };

    const storedProject = JSON.parse(localStorage.getItem('selectedProject'));
    let storedProjectID;
    let storedProjectState;
    let storedProjectName;
    if (storedProject) {
        storedProjectName = storedProject.name;
        storedProjectID = storedProject.projectId;
        storedProjectState = storedProject.lifecycleState;
    }

    useEffect(() => {
        setReload(true);
        fetchPodsData();
        setReload(false);
        // Automatic reload every 1 minute
        const interval = setInterval(() => {
            setReload(prevState => !prevState);
        }, 60000);

        return () => {
            clearInterval(interval)
            setInterval(() => {
                setReload(false);
            }, 3000);
            clearInterval(interval)
        }; // Clear the interval on unmount

    }, [reload]);

    if (storedProject) {
        return (
            <Content className="dashboard-content">
                {/* Manual Reload Button */}
                <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}>
                    <Button
                        type="primary"
                        shape="round"
                        size="large"
                        onClick={handleReload}
                        icon={<ReloadOutlined/>}
                        loading={reload}
                        style={{
                            fontSize: "16px",
                            fontWeight: "bold",
                            backgroundColor: reload ? "#1890ff" : "#00b347", // Loading and loaded colors
                            borderColor: reload ? "#1890ff" : "#00b347", // Loading and loaded colors
                            color: "white",
                            marginRight: "8px",
                        }}
                    >
                        {reload ? "Refreshing..." : "Refresh"}
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
                            <PodsContainer reload={reload} pods={podsData}/>
                        </Row>
                    </Col>
                    <Col className="gutter-row" span={6}>
                        <Row className="dashboard-container">
                            <ResourcesContainer reload={reload}/>
                        </Row>
                    </Col>
                    <Col className="gutter-row" span={6}>
                        <Row className="dashboard-container">
                            <TasksContainer reload={reload}/>
                        </Row>
                    </Col>
                </Row>
                <Row gutter={24}>
                    <Col className="gutter-row" span={15}>
                        <Row className="dashboard-container">
                            <BigResourceChart reload={reload} pods={podsData}/>
                        </Row>
                    </Col>
                    <Col className="gutter-row" span={9}>
                        <Row className="dashboard-container">
                            <NetworkStatsContainer reload={reload}/>
                        </Row>
                    </Col>
                </Row>
                <Row gutter={24}>
                    <Col className="gutter-row" span={24}>
                        <Row className="dashboard-container">
                            <ResourceValuesTable reload={reload}/>
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
