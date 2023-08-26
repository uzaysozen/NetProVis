import React, {useEffect, useState} from 'react';
import {Badge, Col, ConfigProvider, List, Row, Typography} from "antd";
import {CodeSandboxSquareFilled, LoadingOutlined} from "@ant-design/icons";
import axios from "axios";

const {Title} = Typography;

const PodsContainer = ({reload}) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState([]);

    const fetchData = () => {
        setLoading(true);
        axios
            .get('http://localhost:8000/get_apps')
            .then(response => {
                setData(response.data)
                setLoading(false);
            })
            .catch(error => {
                console.log('Error:', error);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchData();
    }, [reload]);

    return (
        <Col>
            <Row>
                <span>
                    <Title level={3} className="dashboard-title">
                        Pods
                        <CodeSandboxSquareFilled style={{marginLeft: "22vh", fontSize: "30px"}}/>
                    </Title>
                </span>
            </Row>
            <ConfigProvider
                theme={{
                    components: {
                        List: {
                            colorTextDescription: 'rgba(255,255,255,0.9)'
                        },
                    },
                }}
            >
                {loading ? (
                    <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '4rem'}}>
                        <LoadingOutlined style={{fontSize: 40}} spin/>
                    </div>
                ) : (
                    <Row>
                        <div style={{
                            height: '4rem',
                            width: "100%",
                            overflowY: "auto",
                        }}>
                            <List
                                itemLayout="horizontal"
                                dataSource={data}
                                renderItem={(item, index) => (
                                    <List.Item style={{padding: 0, marginLeft: "5px"}}
                                               actions={[<a key="list-details-see">Details</a>]}>
                                        <List.Item.Meta
                                            avatar={<Badge color="green" size="default"/>}
                                            description={item.spec.selector.matchLabels.app}
                                        />
                                    </List.Item>
                                )}
                            />
                        </div>
                    </Row>
                )}
            </ConfigProvider>
        </Col>
    );
}

export default PodsContainer;