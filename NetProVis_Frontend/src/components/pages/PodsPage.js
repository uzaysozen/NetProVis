import React, {useEffect, useState} from 'react';
import {Button, Col, Row, Typography} from 'antd';
import {Content} from "antd/es/layout/layout";
import {PlusOutlined} from '@ant-design/icons';
import axios from 'axios';

const {Title} = Typography;

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

    const activateHPA = (pod) => {
        axios.post('http://localhost:8000/activate_hpa', {selected_pod: JSON.stringify(pod)})
            .then(response => {
                console.log('HPA Activated:', response.data);
            })
            .catch(error => {
                console.log('Error activating HPA:', error);
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
                    <Button type="primary" shape="round" icon={<PlusOutlined />} size="large">
                        Add CNF
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
                                <Button type="primary" style={{marginTop: "15px"}} size="medium" onClick={() => activateHPA(item)}>Activate HPA</Button>
                            </Row>
                        </Col>
                    ))}
                </Row>
            ))}
        </Content>
    );
};

export default PodsPage;
