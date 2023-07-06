import React, {useEffect, useState} from 'react';
import axios from 'axios';
import {Tag, Table, Modal, Button, Row, Col} from 'antd';
import {Typography} from 'antd';

const {Title, Text} = Typography;

const ProjectSelectModal = ({isDashboard, onDashboardReload}) => {
    const [projects, setProjects] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState('');

    const showModal = () => {
        setIsModalOpen(true);
    };

    const handleOk = () => {
        setIsModalOpen(false);
        localStorage.setItem('selectedProject', selectedProject)
        if (isDashboard) {
            onDashboardReload(true)
        }
    };

    const handleCancel = () => {
        setIsModalOpen(false);
    };

    const handleProjectSelect = (selectedRowKeys, selectedRows) => {
        const projectName = selectedRows.length > 0 ? selectedRows[0].name : '';
        setSelectedProject(projectName);
    };

    const columns = [
        {
            title: 'Project Number',
            dataIndex: 'projectNumber',
            key: 'projectNumber',
        },
        {
            title: 'Project Name',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'Lifecycle State',
            dataIndex: 'lifecycleState',
            key: 'lifecycleState',
            render: (_, {lifecycleState}) => {
                // Define the mapping of lifecycle states to colors
                const stateColors = {
                    ACTIVE: 'green',
                    DELETE_REQUESTED: 'red',
                    DELETE_IN_PROGRESS: 'orange',
                    LIFECYCLE_STATE_UNSPECIFIED: 'gray',
                };

                // Get the color for the current lifecycle state
                const color = stateColors[lifecycleState] || 'default-color';

                return (
                    <Tag color={color} key={lifecycleState}>
                        {lifecycleState}
                    </Tag>
                );
            }
        },
        {
            title: 'Create Time',
            key: 'createTime',
            dataIndex: 'createTime',
        },
    ];

    useEffect(() => {
        const storedProject = localStorage.getItem('selectedProject');
        if (storedProject) {
            setSelectedProject(storedProject);
        }

        axios
            .get('http://localhost:8000/projects')
            .then(response => {
                let data = [];
                for (let i = 0; i < response.data.length; i++) {
                    data.push(response.data[i]);
                    data[i].key = i + 1;
                }
                setProjects(data);
            })
            .catch(error => {
                console.log('Error:', error);
            });
    }, []);

    if (isDashboard) {
        return (
            <>
                <Modal className="project-modal" title="Choose Project:" open={isModalOpen} onOk={handleOk}
                       onCancel={handleCancel}>
                    <Table columns={columns} dataSource={projects}
                           rowSelection={{type: 'radio', onChange: handleProjectSelect}}/>
                </Modal>
                <Row>
                    <Col style={{marginTop: "10vh"}}>
                        <Row className="settings-row">
                            <Col>
                                <Title level={1} className="settings-title"> You have not selected a project... </Title>
                            </Col>
                        </Row>
                        <Row className="settings-row">
                            <Col>
                                <Button className="settings-project-btn" onClick={showModal}>Choose a Project</Button>
                            </Col>
                        </Row>
                    </Col>
                </Row>
            </>
        );
    } else {
        return (
            <>
                <Title level={3} className="settings-subtitle">Current Project: </Title>
                <Text className="settings-project">{selectedProject}</Text>
                <Modal className="project-modal" title="Choose Project:" open={isModalOpen} onOk={handleOk}
                       onCancel={handleCancel}>
                    <Table columns={columns} dataSource={projects}
                           rowSelection={{type: 'radio', onChange: handleProjectSelect}}/>
                </Modal>
                <Button className="settings-project-btn" onClick={showModal}>Change Project</Button>
            </>
        );
    }
};

export default ProjectSelectModal;
