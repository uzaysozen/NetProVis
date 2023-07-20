import React, {useEffect, useState} from 'react';
import {CalendarFilled, CodeSandboxSquareFilled} from "@ant-design/icons";
import {Badge, Col, ConfigProvider, Divider, List, Row, Skeleton, Typography} from "antd";

const {Title} = Typography;


const TasksContainer = () => {
    const data = [
        {
            title: 'Ant Design Title 1',
        },
        {
            title: 'Ant Design Title 2',
        },
        {
            title: 'Ant Design Title 3',
        },
        {
            title: 'Ant Design Title 4',
        },
        {
            title: 'Ant Design Title 5',
        },
        {
            title: 'Ant Design Title 6',
        },
        {
            title: 'Ant Design Title 7',
        },
        {
            title: 'Ant Design Title 8',
        },
        {
            title: 'Ant Design Title 9',
        },
        {
            title: 'Ant Design Title 10',
        },
        {
            title: 'Ant Design Title 11',
        },
    ];

    return (
        <Col>
            <Row>
                <span>
                    <Title level={3} className="dashboard-title">
                        Tasks
                        <CalendarFilled style={{marginLeft: "22vh", fontSize: "30px"}}/>
                    </Title>
                </span>
            </Row>
            <Row>
                <div style={{
                    maxHeight: "65px",
                    width: "100%",
                    overflowY: "auto",
                    border: '1px solid rgba(140, 140, 140, 0.35)'
                }}>
                    <ConfigProvider
                        theme={{
                            components: {
                                List: {
                                    colorTextDescription: '#ffffff',
                                },
                            },
                        }}
                    >
                        <List
                            itemLayout="horizontal"
                            dataSource={data}
                            renderItem={(item, index) => (
                                <List.Item style={{padding: 0, marginLeft: "5px"}}>
                                    <List.Item.Meta
                                        description={item.title}
                                    />
                                </List.Item>
                            )}
                        />
                    </ConfigProvider>

                </div>
            </Row>

        </Col>
    );
}

export default TasksContainer;