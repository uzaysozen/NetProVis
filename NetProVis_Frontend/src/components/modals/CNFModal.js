import React, { useState } from 'react';
import { Modal, Button, Radio, Row, Col } from 'antd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { deployCNF } from "../../util/api";
import { faBridge, faShieldAlt, faNetworkWired, faVirusCovid, faLock, faCloud, faGlobe, faEnvelope } from '@fortawesome/free-solid-svg-icons';


const CNFModal = ({ isVisible, onClose }) => {
    const [selectedCNF, setSelectedCNF] = useState(null);

    const cnfs = [
        { name: 'Gateway', icon: faBridge },
        { name: 'Firewall', icon: faShieldAlt },
        { name: 'Load Balancer', icon: faNetworkWired },
        { name: 'IDS', icon: faVirusCovid },
        { name: 'VPN', icon: faLock },
        { name: 'CDN', icon: faCloud },
        { name: 'DNS Server', icon: faGlobe },
        { name: 'Message Broker', icon: faEnvelope }
    ];

    const handleDeployCNF = () => {
        console.log(`Deploying ${selectedCNF} to the cluster.`);
        deployCNF(selectedCNF);
        onClose();
    };

    return (
        <Modal
            title="Deploy CNF"
            open={isVisible}
            onCancel={onClose}
            footer={[
                <Button key="back" onClick={onClose}>
                    Cancel
                </Button>,
                <Button key="submit" type="primary" onClick={handleDeployCNF} disabled={!selectedCNF}>
                    Deploy CNF
                </Button>
            ]}
            width={800}
        >
            <Radio.Group
                onChange={(e) => setSelectedCNF(e.target.value)}
                value={selectedCNF}
                style={{ width: '100%', margin: '1vh', padding: '3vh' }}
            >
                <Row gutter={16}>
                    {cnfs.map(cnf => (
                        <Col span={6} key={cnf.name} style={{ textAlign: 'center', padding: '10px', marginTop: '1vh', marginBottom: '4vh' }}>
                            <FontAwesomeIcon icon={cnf.icon} size="2x" style={{ marginBottom: '15px' }} />
                            <br />
                            <Radio value={cnf.name}>{cnf.name}</Radio>
                        </Col>
                    ))}
                </Row>
            </Radio.Group>
        </Modal>
    );
};

export default CNFModal;