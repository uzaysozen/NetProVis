import React, {useEffect, useState} from 'react';
import {Button, Col, Row, Typography} from 'antd';
import {Content} from "antd/es/layout/layout";
import {LoadingOutlined} from '@ant-design/icons';
import {getPods, activateHPA, stopHPA} from '../../util/api';
import '../../styles/PodsPage.css';
import CNFModal from "../modals/CNFModal";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {faCloudUploadAlt, faCube} from '@fortawesome/free-solid-svg-icons';
import yaml from 'js-yaml';

const {Title} = Typography;

function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

const HPAButton = ({resource, actionType, pod, loadingState, onClickAction, disabled}) => {
    const loadingKey = `${pod.metadata.name}_${resource}`;
    const buttonTextMap = {
        activate: `Activate HPA for ${resource !== 'cpu' ? capitalizeFirstLetter(resource) : resource.toString().toUpperCase()}`,
        stop: `Stop HPA for ${resource !== 'cpu' ? capitalizeFirstLetter(resource) : resource.toString().toUpperCase()}`
    };

    return (
        <Button
            shape="round"
            type="primary"
            danger={actionType === 'stop'}
            size="medium"
            disabled={disabled}
            style={{marginTop: "15px", marginLeft: resource !== 'cpu' ? "15px" : "0"}}
            onClick={() => onClickAction(pod, resource)}
            loading={loadingState[loadingKey]}
        >
            {buttonTextMap[actionType]}
        </Button>
    );
};


const PodDetails = ({ pod }) => {
    const formattedYaml = yaml.dump(pod);
    const preStyle = {
        maxHeight: '200px',  // Adjust the maximum height as needed
        overflowY: 'auto',   // Add vertical scrollbar when content overflows
        whiteSpace: 'pre-wrap'  // Preserve line breaks and wrap text
    };

    return (
        <div>
            <h3>Pod Details:</h3>
            <pre style={preStyle}>{formattedYaml}</pre>
        </div>
    );
};


const PodItem = ({ item, activatedResource, loading, handleActivate, handleStop }) => {
    const [showDetails, setShowDetails] = useState(false);

    const toggleDetails = () => {
        setShowDetails(!showDetails);
    };

    return (
        <Col md={12} className="gutter-row">
            <Row className="dashboard-container">
                <Row align="middle" gutter={8}>
                    <Col style={{ marginRight: "10px", marginBottom: "15px" }}>
                        <FontAwesomeIcon icon={faCube} size="2x" style={{ color: "#1890ff" }} />
                    </Col>
                    <Col>
                        <Title level={3} className="dashboard-title">
                            {item.metadata.name}
                        </Title>
                    </Col>
                </Row>
                {['cpu', 'memory', 'all'].map(resource => (
                    activatedResource === resource ? (
                        <HPAButton
                            key={resource}
                            resource={resource}
                            disabled={false}
                            actionType="stop"
                            pod={item}
                            loadingState={loading}
                            onClickAction={handleStop}
                        />
                    ) : (
                        <HPAButton
                            key={resource}
                            resource={resource}
                            disabled={resource !== 'all' && activatedResource === 'all'}
                            actionType="activate"
                            pod={item}
                            loadingState={loading}
                            onClickAction={handleActivate}
                        />
                    )
                ))}
                <Button
                    type="default"
                    shape="round"
                    size="medium"
                    style={{ marginTop: "15px", marginLeft: "60px" }}
                    onClick={toggleDetails}
                >
                    {showDetails ? "Hide Details" : "See Details"}
                </Button>
                {showDetails && <PodDetails pod={item} />}
            </Row>
        </Col>
    );
};


const WorkloadsPage = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState({});
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [loadingData, setLoadingData] = useState(true); // set to true initially to indicate loading
    const initialActivatedState = localStorage.getItem('activatedState');
    const [activated, setActivated] = useState(initialActivatedState ?
        JSON.parse(initialActivatedState) : {});

    const handleActivate = async (pod, resource) => {
        const loadingKey = `${pod.metadata.name}_${resource}`;
        setLoading(prev => ({...prev, [loadingKey]: true}));
        try {
            const response = await activateHPA(pod, resource);
            console.log('HPA Activated:', response.data);
            setActivated(prev => ({...prev, [pod.metadata.name]: resource}));
        } catch (error) {
            console.log('Error activating HPA:', error);
        }
        setLoading(prev => ({...prev, [loadingKey]: false}));
    };

    const handleStop = async (pod, resource) => {
        const loadingKey = `${pod.metadata.name}_${resource}`;
        setLoading(prev => ({...prev, [loadingKey]: true}));
        try {
            const response = await stopHPA(pod, resource);
            console.log('HPA Stopped:', response.data);
            setActivated(prev => ({...prev, [pod.metadata.name]: ''}));
        } catch (error) {
            console.log('Error stopping HPA:', error);
        }
        setLoading(prev => ({...prev, [loadingKey]: false}));
    };

    const fetchData = async () => {
        setLoadingData(true);
        try {
            const response = await getPods();
            setData(response.data);
            setLoadingData(false);
        } catch (error) {
            console.log('Error:', error);
        }
        setLoadingData(false);
        const storedState = localStorage.getItem('activatedState');
        if (storedState) setActivated(JSON.parse(storedState));
    };

    useEffect(() => {
        fetchData(); // Fetch data initially

        const interval = setInterval(() => {
            fetchData(); // Fetch data every 10 seconds
        }, 10000);

        return () => clearInterval(interval); // Clear interval on component unmount
    }, []);

    useEffect(() => {
        localStorage.setItem('activatedState', JSON.stringify(activated));
    }, [activated]);

    return (
        <Content className="dashboard-content">
            <Row gutter={24} className="add-button-row">
                <Col>
                    <Button
                        type="primary"
                        shape="round"
                        icon={<FontAwesomeIcon icon={faCloudUploadAlt} />}
                        size="large"
                        onClick={() => setIsModalVisible(true)}
                    >
                        Deploy CNF
                    </Button>
                </Col>
            </Row>
            <CNFModal isVisible={isModalVisible} onClose={() => setIsModalVisible(false)}/>

            {loadingData &&
            <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: "50vh"}}>
                <LoadingOutlined style={{ fontSize: 80}} spin/>
                <span style={{marginLeft: "20px", fontSize: "30px"}}>Loading pods...</span>
            </div>}

            {!loadingData && data.length === 0 && <div>No pod data available.</div>}

            {!loadingData && data.length > 0 && (
                <Row gutter={24} className="pod-row">
                    {data.map((item, index) => (
                        <PodItem
                            key={index}
                            item={item}
                            activatedResource={activated[item.metadata.name] || ""}
                            loading={loading}
                            handleActivate={handleActivate}
                            handleStop={handleStop}
                        />
                    ))}
                </Row>
            )}
        </Content>
    );

};

export default WorkloadsPage;
