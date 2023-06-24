import React, {useEffect, useState} from 'react';
import axios from 'axios';
import {Tag, Table, Modal, Button, Radio} from 'antd';

const ProjectSelectModal = () => {
    const [projects, setProjects] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const showModal = () => {
        setIsModalOpen(true);
    };

    const handleOk = () => {
        setIsModalOpen(false);
    };
    const handleCancel = () => {
        setIsModalOpen(false);
    };

    const columns = [
        {
            title: 'Select',
            key: 'select',
            render: (_, select) => (
                <Radio key={select}></Radio>
            ),
        },
        {
            title: 'Project Number',
            dataIndex: 'projectNumber',
            key: 'projectNumber'
        },
        {
            title: 'Project ID',
            dataIndex: 'projectId',
            key: 'projectId'
        },
        {
            title: 'Lifecycle State',
            dataIndex: 'lifecycleState',
            key: 'lifecycleState',
            render: (_, {lifecycleState}) => (
                <Tag color="green" key={lifecycleState}>
                    {lifecycleState}
                </Tag>
            ),
        },
        {
            title: 'Create Time',
            key: 'createTime',
            dataIndex: 'createTime'

        },
    ];

    useEffect(() => {
        axios
            .get('http://localhost:8000/projects')
            .then(response => {
                setProjects(response.data);
                console.log("Data source: ", response.data);
            })
            .catch(error => {
                console.log('Error:', error);
            });
    }, []);

    return (
        <>
            <Modal className="project-modal" title="Choose Project:" open={isModalOpen} onOk={handleOk}
                   onCancel={handleCancel}>
                <Table columns={columns} dataSource={projects}/>
            </Modal>
            <Button className="settings-project-btn" onClick={showModal}>Change Project</Button>
        </>
    );
};

export default ProjectSelectModal;
