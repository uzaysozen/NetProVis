import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { List, Card, Dropdown, Button, Menu, Typography } from 'antd';
import {DownOutlined, LogoutOutlined} from '@ant-design/icons';
import '../../styles/dashboard.css';

const { Text } = Typography;

const ProjectSelect = ({ signOut }) => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    axios
      .get('http://localhost:8000/projects')
      .then(response => {
        setProjects(response.data);
      })
      .catch(error => {
        console.log('Error:', error);
      });
  }, []);

  const handleProjectSelect = projectId => {
    const selected = projects.find(project => project.projectId === projectId);
    setSelectedProject(selected);
  };

  const menu = (
    <Menu onClick={({ key }) => handleProjectSelect(key)}>
      {projects.map(project => (
        <Menu.Item key={project.projectId} value={project.projectId}>
          {project.name}
        </Menu.Item>
      ))}
    </Menu>
  );

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Dashboard Page</h1>
      <Button className="sign-out-button" onClick={signOut}>
        Sign Out <LogoutOutlined />
      </Button>

      <Card className="projects-card">
        <h2>Projects:</h2>
        <Dropdown overlay={menu} trigger={['click']}>
          <Button className="dropdown-button">
            {selectedProject ? selectedProject.name : 'Select Project'} <DownOutlined />
          </Button>
        </Dropdown>

        {selectedProject && (
          <Card className="project-details-card">
            <h3 className="ant-card-head-title">{selectedProject.projectId}</h3>
            <List>
              <List.Item>
                <Text strong>Project Number:</Text> {selectedProject.projectNumber}
              </List.Item>
              <List.Item>
                <Text strong>Project ID:</Text> {selectedProject.projectId}
              </List.Item>
              <List.Item>
                <Text strong>Lifecycle State:</Text> {selectedProject.lifecycleState}
              </List.Item>
              <List.Item>
                <Text strong>Create Time:</Text> {selectedProject.createTime}
              </List.Item>
            </List>
          </Card>
        )}
      </Card>
    </div>
  );
};

export default ProjectSelect;
