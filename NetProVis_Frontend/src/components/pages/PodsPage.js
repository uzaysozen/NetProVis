import React, {useEffect, useState} from 'react';
import {Button, Col, Row, Typography} from 'antd';
import {Content} from "antd/es/layout/layout";
import {PlusOutlined} from '@ant-design/icons';
import axios from 'axios';

const {Title, Text} = Typography;

const PodsPage = () => {
    const [data, setData] = useState([]);
    const fetchData = () => {
        axios
            .get('http://localhost:8000/get_apps')
            .then(response => {
                console.log(response.data);
                setData(response.data);
            })
            .catch(error => {
                console.log('Error:', error);
            });
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Split data into chunks of two items each
    const chunkedData = [];
    for (let i = 0; i < data.length; i += 2) {
        chunkedData.push(data.slice(i, i + 2));
    }

    return (
        <Content className={'dashboard-content'}>
            <Row gutter={24} style={{justifyContent: 'flex-end', marginBottom: '20px'}}>
                <Col>
                    <Button style={{backgroundColor: '#2196f3', height: '3rem'}}>
                        <span>
                            <Text style={{color: 'white'}} strong>
                                Add CNF
                            </Text>
                            <Text style={{marginLeft: '5px', fontSize: '20px', color: 'white'}}>
                                <PlusOutlined/>
                            </Text>
                        </span>
                    </Button>

                </Col>
            </Row>
            {chunkedData.map((rowItems, rowIndex) => (
                <Row key={rowIndex} gutter={24} style={{display: 'flex', alignItems: 'flex-start'}}>
                    {rowItems.map(item => (
                        <Col key={item.metadata.name} className="gutter-row" span={12}>
                            <Row className="dashboard-container">
                                <Title style={{color: 'white', margin: '0'}} level={3}>
                                    {item.spec.selector.matchLabels.app}
                                </Title>
                                {/* Add content for this column */}
                            </Row>
                        </Col>
                    ))}
                </Row>
            ))}
        </Content>
    );
};

export default PodsPage;
