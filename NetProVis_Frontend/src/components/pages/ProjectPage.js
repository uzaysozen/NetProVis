import React from 'react';
import '../../styles/ProjectPage.css';
import { Content } from "antd/es/layout/layout";
import { Col, Row, Switch } from "antd";
import { Typography } from 'antd';
import ProjectSelectModal from "../modals/ProjectSelectModal";
import {faDiagramProject} from "@fortawesome/free-solid-svg-icons";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

const {Title, Text} = Typography;

const ProjectPage = () => {


    return (
        <Content className="project-content">
            <Row className="project-container" align="top">
                <Col>
                    <Row className="project-row">
                        <Col>
                            <span className="project-span">
                                <FontAwesomeIcon className="project-icon" icon={faDiagramProject}/>
                                <Title level={1} className="project-title">Select a project</Title>
                            </span>
                        </Col>
                    </Row>
                    <Row className="project-row">
                        <Col>
                            <span className="project-span">
                                <ProjectSelectModal isDashboard={false}/>
                            </span>
                        </Col>
                    </Row>

                </Col>
            </Row>
        </Content>
    );
}

export default ProjectPage;
