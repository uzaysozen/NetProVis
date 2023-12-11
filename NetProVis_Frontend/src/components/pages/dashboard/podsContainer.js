import React from 'react';
import {Badge, Col, ConfigProvider, List, Row, Spin, Typography} from "antd";
import {CodeSandboxSquareFilled, LoadingOutlined} from "@ant-design/icons";
import {Link} from "react-router-dom";

const {Title} = Typography;

const PodsContainer = ({reload, pods}) => {

    return (
        <Col>
            <Row align="middle" gutter={8}>
                <Col style={{marginRight: "10px", marginBottom: "15px"}}>
                    <CodeSandboxSquareFilled style={{ fontSize: "30px", color: "#1890ff" }} />
                </Col>
                <Col>
                    <Title level={3} className="dashboard-title">
                        Workloads
                    </Title>
                </Col>
            </Row>
            <ConfigProvider
                theme={{
                    components: {
                        List: {
                            colorTextDescription: 'rgba(255,255,255,0.9)',
                            colorSplit: 'rgba(140, 140, 140, 0.35)'
                        },
                    },
                }}
            >
                {reload ? (
                    <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '4rem'}}>
                        <Spin indicator={<LoadingOutlined style={{fontSize: 40}} spin/>}/>
                    </div>
                ) : (
                    <Row>
                        <div style={{
                            height: '4rem',
                            width: "100%",
                            overflowY: "auto",
                            border: '1px solid rgba(140, 140, 140, 0.35)'
                        }}>
                            <List
                                itemLayout="horizontal"
                                dataSource={pods}
                                renderItem={(item, index) => (
                                    <List.Item style={{padding: 0, marginLeft: "5px"}}
                                               actions={[<Link to="/pods">Details</Link>]}>
                                        <List.Item.Meta
                                            avatar={<Badge color="green" size="default"/>}
                                            description={item.metadata.name}
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