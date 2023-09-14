import React, {useState} from 'react';
import {Modal, Button, Radio, Row, Col, Input, Form, Alert, Result} from 'antd';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {deployCNF, stopHPA} from "../../util/api";
import {
    faBridge,
    faShieldAlt,
    faNetworkWired,
    faVirusCovid,
    faLock,
    faCloud,
    faGlobe,
    faEnvelope
} from '@fortawesome/free-solid-svg-icons';
import {LoadingOutlined} from "@ant-design/icons";

const CNFModal = ({isVisible, onClose}) => {
    const [selectedCNF, setSelectedCNF] = useState(null);
    const [loading, setLoading] = useState(false);
    const [validationError, setValidationError] = useState(null);
    const [success, setSuccess] = useState(false);

    const [form] = Form.useForm();
    const closeModal = () => {
        setSuccess(false);
        onClose();
    }

    const cnfs = [
        {name: 'Gateway', icon: faBridge},
        {name: 'Firewall', icon: faShieldAlt},
        {name: 'Load Balancer', icon: faNetworkWired},
        {name: 'IDS', icon: faVirusCovid},
        {name: 'VPN', icon: faLock},
        {name: 'CDN', icon: faCloud},
        {name: 'DNS Server', icon: faGlobe},
        {name: 'Message Broker', icon: faEnvelope}
    ];

    const handleDeployCNF = async () => {
        try {
            const values = await form.validateFields();
            console.log(`Deploying ${selectedCNF} to the cluster with CPU Limit: ${values.cpuLimit}, CPU Requested: ${values.cpuRequested}, Memory Limit: ${values.memoryLimit}, Memory Requested: ${values.memoryRequested}`);
            setLoading(true);
            setValidationError(null); // Clear validation error on successful submission
            await deployCNF(selectedCNF, values);
            setLoading(false);
            setSuccess(true);
        } catch (error) {
            console.log(`Error deploying ${selectedCNF}:`, error);
            setLoading(false);
            // Handle validation error
            setValidationError(error.message);
        }
    };


    return (
        <Modal
            title="Deploy CNF"
            open={isVisible}
            onCancel={closeModal}
            footer={!success && [
                <Button key="back" onClick={closeModal}>
                    Cancel
                </Button>,
                <Button key="submit" type="primary" onClick={handleDeployCNF} disabled={!selectedCNF}>
                    Deploy CNF
                </Button>
            ]}
            width={800}
        >
            {loading && (
                <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: "50vh"}}>
                    <LoadingOutlined style={{fontSize: 80}} spin/>
                    <span style={{marginLeft: "20px", fontSize: "30px"}}>Deploying pod...</span>
                </div>
            )}

            {success && (
                <Result
                    status="success"
                    title={`Successfully Deployed ${selectedCNF}`}
                    subTitle="CNF installation can take 1-5 minutes, please wait."
                />
            )}

            {validationError !== null && (
                <Alert
                    message="Validation Error"
                    description={validationError}
                    type="error"
                    showIcon
                    style={{marginBottom: '16px'}}
                />
            )}

            {!loading && !success && <Form form={form} name="deployCNFForm" initialValues={{}}>
                <Radio.Group
                    onChange={(e) => setSelectedCNF(e.target.value)}
                    value={selectedCNF}
                    style={{width: '100%', margin: '1vh', padding: '1vh'}}
                >
                    <Row gutter={16}>
                        {cnfs.map(cnf => (
                            <Col span={6} key={cnf.name}
                                 style={{textAlign: 'center', padding: '10px', marginTop: '1vh', marginBottom: '4vh'}}>
                                <FontAwesomeIcon icon={cnf.icon} size="2x" style={{marginBottom: '15px'}}/>
                                <br/>
                                <Radio value={cnf.name}>{cnf.name}</Radio>
                            </Col>
                        ))}
                    </Row>
                </Radio.Group>

                <Form.Item name="cpuLimit" label="CPU Limit (K8s Resource Units)" rules={[{required: true}]}>
                    <Input placeholder="e.g., 500m"/>
                </Form.Item>

                <Form.Item name="cpuRequested" label="CPU Requested (K8s Resource Units)" rules={[{required: true}]}>
                    <Input placeholder="e.g., 250m"/>
                </Form.Item>

                <Form.Item name="memoryLimit" label="Memory Limit (K8s Resource Units)" rules={[{required: true}]}>
                    <Input placeholder="e.g., 512Mi"/>
                </Form.Item>

                <Form.Item name="memoryRequested" label="Memory Requested (K8s Resource Units)"
                           rules={[{required: true}]}>
                    <Input placeholder="e.g., 256Mi"/>
                </Form.Item>
            </Form>}
        </Modal>
    );
};

export default CNFModal;
