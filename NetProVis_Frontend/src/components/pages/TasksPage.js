import React, {useEffect, useState} from 'react';
import '../../styles/DashboardPage.css';
import {Content} from "antd/es/layout/layout";
import {getTasks} from "../../util/api";
import {Col, ConfigProvider, List, Row, Typography} from "antd";
import {LoadingOutlined} from "@ant-design/icons";
import {faListCheck} from "@fortawesome/free-solid-svg-icons";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

const {Title} = Typography;

const TasksPage = () => {

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
        fetchData(); // initial fetch

        const intervalId = setInterval(() => {
            fetchData();
        }, 15000); // fetch data every 15 seconds

        return () => clearInterval(intervalId); // clear interval on component unmount
    }, []);

    return (

        <Content className="dashboard-content" >
            <Row gutter={24} style={{display: "flex", justifyContent: "center"}}>
                <Col className="dashboard-container" span={18}>
                    <Row style={{display: "flex", justifyContent: "center"}}>
                        <Col style={{marginRight: "15px", marginBottom: "15px"}}>
                            <FontAwesomeIcon icon={faListCheck} style={{fontSize: "30px", color: "#ffffff"}}/>
                        </Col>
                        <Col>
                            <Title level={3} className="dashboard-title">
                                Tasks
                            </Title>
                        </Col>
                    </Row>
                    <Row style={{display: "flex", justifyContent: "center"}}>
                        <div style={{
                            maxHeight: "70vh",
                            maxWidth: "120vh",
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
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    height: '4rem'
                                }}>
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
            </Row>
        </Content>
    );
}

export default TasksPage;
