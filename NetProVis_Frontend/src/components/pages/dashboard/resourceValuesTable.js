import React from "react";
import { Col, ConfigProvider, Row, Space, Spin, Table, Tag, Typography } from "antd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGaugeMed } from "@fortawesome/free-solid-svg-icons";
import { LoadingOutlined } from "@ant-design/icons";
import '../../../styles/Table.css'

const { Title } = Typography;

const ResourceValuesTable = ({ reload }) => {
    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'Value',
            dataIndex: 'value',
            key: 'value',
        },
        {
            title: 'Unit',
            dataIndex: 'unit',
            key: 'unit',
        },
        {
            title: 'Last Updated',
            dataIndex: 'last_updated',
            key: 'last_updated',
        },
        {
            title: 'Status',
            key: 'status',
            dataIndex: 'status',
            render: (_, { statuses }) => (
                <>
                    {statuses.map((status) => {
                        let color = status.length > 5 ? 'green' : 'geekblue';
                        if (status === 'critical') {
                            color = 'volcano';
                        }
                        return (
                            <Tag color={color} key={status}>
                                {status.toUpperCase()}
                            </Tag>
                        );
                    })}
                </>
            ),
        },
    ];
    const data = [
        {
            key: '1',
            name: 'node_network_transmit_bytes ',
            value: 98765432,
            unit: 'B',
            last_updated: '19 May, 2021 : 10:10 AM',
            statuses: ['healthy']
        },
        {
            key: '2',
            name: 'node_network_receive_bytes ',
            value: 120456789,
            unit: 'B',
            last_updated: '19 May, 2021 : 10:10 AM',
            statuses: ['healthy']
        },
        {
            key: '3',
            name: 'node_network_latency_milliseconds',
            value: 30,
            unit: 'ms',
            last_updated: '19 May, 2021 : 10:10 AM',
            statuses: ['critical'],
        },
        {
            key: '4',
            name: 'node_network_transmit_bytes ',
            value: 98765432,
            unit: 'B',
            last_updated: '19 May, 2021 : 10:10 AM',
            statuses: ['healthy']
        },
        {
            key: '5',
            name: 'node_network_receive_bytes ',
            value: 120456789,
            unit: 'B',
            last_updated: '19 May, 2021 : 10:10 AM',
            statuses: ['healthy']
        },
        {
            key: '6',
            name: 'node_network_latency_milliseconds',
            value: 30,
            unit: 'ms',
            last_updated: '19 May, 2021 : 10:10 AM',
            statuses: ['critical'],
        },
    ];
    return reload ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '4rem' }}>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 40 }} spin />} />
        </div>
    ) : (
        <Col>
            <Row align="middle" gutter={8} style={{ marginBottom: "20px" }}>
                <Col style={{ marginRight: "10px", marginBottom: "15px" }}>
                    <FontAwesomeIcon icon={faGaugeMed} size="2x" style={{ color: "#1890ff" }} />
                </Col>
                <Col>
                    <Title level={3} className="dashboard-title">
                        Metrics
                    </Title>
                </Col>
            </Row>

            <ConfigProvider theme={{
                    components: {
                        Table: {
                            colorBgContainer: 'transparent',
                            colorText: '#ffffff',
                            colorTextHeading: '#ffffff',
                            colorSplit: 'transparent'
                        },
                        Pagination: {
                            colorText: '#ffffff',
                            colorTextDisabled: '#888888'
                        }
                    },
                }}>
                <Table
                    columns={columns}
                    dataSource={data}
                    pagination={{ pageSize: 5 }} // Set pagination item limit to 5
                />
            </ConfigProvider>
        </Col>
    );
};

export default ResourceValuesTable;
