import React from 'react';
import '../../styles/dashboard.css';
import { theme } from "antd";
import { Content } from "antd/es/layout/layout";

const TasksPage = () => {
    const {
        token: { colorBgContainer },
    } = theme.useToken();

    return (
        <Content
            style={{
                margin: '24px 16px',
                padding: 24,
                minHeight: 'calc(20vh - 48px)',
                background: colorBgContainer,
            }}
        >
            Tasks Page
        </Content>
    );
}

export default TasksPage;
