import React, {useState, useEffect} from 'react';
import {Content} from "antd/es/layout/layout";
import {jsPDF} from "jspdf";
import {Document, Page, pdfjs} from 'react-pdf';
import '../../styles/DashboardPage.css';
import {Button, Col, Row} from "antd";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faDownload} from "@fortawesome/free-solid-svg-icons";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const ReportsPage = () => {
    const [pdfData, setPdfData] = useState(null);

    useEffect(() => {
        const doc = createReport();
        setPdfData(doc.output("datauristring"));
    }, []);


    const downloadPdf = () => {
        const doc = createReport();
        doc.save("report.pdf");
    };

    const createReport = () => {
        const doc = new jsPDF();

        // Report Title
        doc.setFontSize(22);
        doc.setTextColor(33, 37, 41); // Dark gray
        doc.text("Kubernetes Cluster Monitoring Report", 20, 30);

        // Subtitle
        doc.setFontSize(16);
        doc.setTextColor(23, 162, 184); // Blue color
        doc.text("Cluster Overview", 20, 45);

        // Adding a line
        doc.setDrawColor(23, 162, 184); // Line color
        doc.line(20, 47, 190, 47); // (x1, y1, x2, y2)

        // Kubernetes Cluster Data
        doc.setFontSize(14);
        doc.setTextColor(33, 37, 41);
        doc.text("Total Pods: 10", 20, 60);
        doc.text("Active Services: 5", 20, 70);
        // ... other cluster details

        // CPU and Memory Logs Section
        doc.setTextColor(23, 162, 184); // Blue color
        doc.text("CPU and Memory Logs", 20, 90);
        doc.line(20, 92, 190, 92); // Line
        // ... CPU and memory log details

        // HPA Thresholds Section
        doc.setTextColor(23, 162, 184); // Blue color
        doc.text("HPA Thresholds", 20, 120);
        doc.line(20, 122, 190, 122);
        return doc;
    }

    return (
        <Content style={{backgroundColor: "#232323", color: "white"}}>
            <Row gutter={24} style={{marginTop: "20px"}}>
                <Col span={4}></Col>
                <Col span={12}>
                    <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%'}}>
                        <div style={{maxWidth: '600px', maxHeight: '800px', overflow: 'scroll'}}>
                            {pdfData && (
                                <Document file={pdfData}>
                                    <Page pageNumber={1}/>
                                </Document>
                            )}
                        </div>
                    </div>
                </Col>
                <Col span={4}>
                    <Button
                        type="primary"
                        shape="round"
                        icon={<FontAwesomeIcon icon={faDownload}/>}
                        size="large"
                        onClick={downloadPdf}
                    >
                        Download PDF
                    </Button>
                </Col>
            </Row>
        </Content>
    );
}

export default ReportsPage;
