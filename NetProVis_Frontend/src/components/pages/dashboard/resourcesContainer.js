import React, { useEffect, useState } from 'react';
import { Col, ConfigProvider, Row, Statistic, Typography } from "antd";
import {LoadingOutlined, PercentageOutlined, PieChartFilled} from "@ant-design/icons";
import axios from "axios";

const { Title } = Typography;

const ResourcesContainer = ({ reload }) => {
  const [cpuUsage, setCpu] = useState(0);
  const [memoryUsage, setMemory] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    setLoading(true);
    axios
      .get('http://localhost:8000/get_cluster_cpu')
      .then(response => {
        setCpu(response.data);
        setLoading(false); // Stop loading animation on success
      })
      .catch(error => {
        console.log('Error:', error);
        setLoading(false); // Stop loading animation on error
      });
    axios
      .get('http://localhost:8000/get_cluster_memory')
      .then(response => {
        setMemory(response.data);
      })
      .catch(error => {
        console.log('Error:', error);
      });
  };

  useEffect(() => {
    fetchData();
  }, [reload]); // Fetch data again whenever 'reload' changes

  return (
    <Col>
      <Row>
        <span>
          <Title level={3} className="dashboard-title">
            Resources
            <PieChartFilled style={{ marginLeft: "14vh", fontSize: "30px" }} />
          </Title>
        </span>
      </Row>
      <ConfigProvider
        theme={{
          components: {
            Statistic: {
              colorText: '#ffffff',
              colorTextHeading: '#ffffff',
              colorTextDescription: 'rgba(255,255,255,0.85)'
            },
          },
        }}
      >
        {/* Conditionally render loading spinner or content */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '4rem' }}>
            <LoadingOutlined style={{fontSize: 40}} spin/>
          </div>
        ) : (
          <Row gutter={16}>
            <Col span={12}>
              <Statistic style={{ marginLeft: "6vh" }} title="CPU" value={cpuUsage.toFixed(2)} suffix={<PercentageOutlined />} />
            </Col>
            <Col span={12}>
              <Statistic style={{ marginLeft: "2vh" }} title="RAM" value={memoryUsage.toFixed(2)} suffix={<PercentageOutlined />} />
            </Col>
          </Row>
        )}
      </ConfigProvider>
    </Col>
  );
}

export default ResourcesContainer;
