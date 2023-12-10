import React, {useEffect, useState} from "react";
import { Col, ConfigProvider, Row, Spin, Table, Tag, Typography } from "antd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGaugeMed } from "@fortawesome/free-solid-svg-icons";
import { LoadingOutlined } from "@ant-design/icons";
import '../../../styles/Table.css'
import {getNetworkStatsTable} from "../../../util/api";

const { Title } = Typography;

const ResourceValuesTable = ({ reload }) => {
    const [networkStatsTable, setNetworkStatsTable] = useState([])
    const [loading, setLoading] = useState(false);

    const fetchData = () => {
        setLoading(true);
        getNetworkStatsTable()
            .then(response => {
                setNetworkStatsTable(populateTable(response.data));
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

    const populateTable = (table) => {
        var data = []
        for (var i = 1; i <= table.length; i++) {
            data.push({
                key: i.toString(),
                name: table[i-1]["Name"],
                value: table[i-1]["Value"],
                unit: table[i-1]["Unit"],
                last_updated: table[i-1]["LastUpdated"],
            })
        }
        return data
    }

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
                {loading ? (
                        <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '4rem'}}>
                            <Spin indicator={<LoadingOutlined style={{fontSize: 40}} spin/>}/>
                        </div>
                    ) : (
                <Table
                    columns={columns}
                    dataSource={networkStatsTable}
                    pagination={{ pageSize: 5 }} // Set pagination item limit to 5
                />)}
            </ConfigProvider>
        </Col>
    );
};

export default ResourceValuesTable;
