import React, {useEffect, useState} from 'react';
import {CalendarFilled, LoadingOutlined, PieChartFilled} from "@ant-design/icons";
import {Col, ConfigProvider, List, Row, Typography} from "antd";
import {getTasks} from "../../../util/api";

const {Title} = Typography;


const TasksContainer = ({reload}) => {
    const [tasks, setTasks] = useState([])
    const [loading, setLoading] = useState(false)

    const fetchData = () => {
        setLoading(true);
        getTasks()
            .then(response => {
                setTasks(response.data.reverse());
                setLoading(false);
            })
            .catch(error => {
                console.log('Error:', error);
                setLoading(true);
            });
    };

    useEffect(() => {
        fetchData()
    }, [reload]);

    return (
        <Col>
            <Row align="middle" gutter={8}>
                <Col style={{marginRight: "10px", marginBottom: "15px"}}>
                    <CalendarFilled style={{fontSize: "30px", color: "#1890ff"}}/>
                </Col>
                <Col>
                    <Title level={3} className="dashboard-title">
                        Tasks
                    </Title>
                </Col>
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
                                    colorText: '#ffffff',
                                    colorSplit: 'rgba(140, 140, 140, 0.35)'
                                },
                            },
                        }}
                    > {loading ? (
                        <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '4rem'}}>
                            <LoadingOutlined style={{fontSize: 40}} spin/>
                        </div>
                    ) : (
                        <List
                            itemLayout="horizontal"
                            dataSource={tasks}
                            renderItem={(item, index) => (
                                <List.Item style={{padding: 0, marginLeft: "5px"}}>
                                    <List.Item.Meta
                                        title={JSON.parse(item).date}
                                        description={JSON.parse(item).task}
                                    />
                                </List.Item>
                            )}
                        />)}
                    </ConfigProvider>
                </div>
            </Row>
        </Col>
    );
}

export default TasksContainer;