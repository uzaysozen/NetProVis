import React, {useState, useEffect} from 'react';
import {Content} from "antd/es/layout/layout";
import {jsPDF} from "jspdf";
import {Document, Page, pdfjs} from 'react-pdf';
import '../../styles/DashboardPage.css';
import {Button, Col, Row} from "antd";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faDownload} from "@fortawesome/free-solid-svg-icons";
import {getReportDetails, getTasks} from "../../util/api";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const ReportsPage = () => {
    const [reportDetails, setReportDetails] = useState({});
    const [pageCount, setPageCount] = useState(0); // State for the number of pages
    const [pdfUri, setPdfUri] = useState(""); // State to store the URI of the PDF

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (Object.keys(reportDetails).length > 0) {
            const doc = createReport(reportDetails); // Generate the report
            setPdfUri(doc.output("datauristring")); // Update the URI state
            setPageCount(doc.internal.getNumberOfPages()); // Update the page count
        }
    }, [reportDetails]); // Dependency on reportDetails

    const fetchData = async () => {
        try {
            const response = await getReportDetails();
            setReportDetails(response.data);
        } catch (error) {
            console.log('Error:', error);
        }
    };

    const downloadPdf = () => {
        if (pdfUri) {
            const link = document.createElement("a");
            link.href = pdfUri;
            link.download = "report.pdf";
            link.click();
        }
    };

    const createReport = (reportData) => {
        const doc = new jsPDF();
        console.log(reportData.workloads);
        // Report Title
        doc.setFontSize(22);
        doc.setTextColor(33, 37, 41); // Dark gray
        doc.text("Kubernetes Cluster Monitoring Report", 20, 30);

        let currentY = 60; // Start after Report Title

        currentY = addSection(doc, "Project Overview", reportData.project, currentY); // Project Overview

        currentY = addSection(doc, "Cluster Overview", reportData.cluster, currentY); // Cluster Overview

        currentY = addWorkloadsSection(doc, "Workloads", reportData.workloads, currentY); // Workloads Section

        addListSection(doc, "Recent Tasks", reportData.tasks, currentY); // Recent Tasks Section

        return doc;
    };

    const addSection = (doc, title, data, startY) => {
        const pageHeight = doc.internal.pageSize.height;
        let currentY;
        doc.setFontSize(16);
        doc.setTextColor(23, 162, 184); // Blue color
        currentY = checkAndAddPage(doc, startY + 12, pageHeight);
        doc.text(title, 20, startY);
        doc.line(20, startY + 2, 190, startY + 2); // Line

        // Add key-value like text
        for (const key in data) {
            if (typeof data[key] === "string") {
                currentY = checkAndAddPage(doc, currentY, pageHeight);
                doc.setFontSize(14);
                doc.setTextColor(33, 37, 41);
                doc.text(`${capitalizeFirstLetter(key)}: ${data[key]}`, 20, currentY);
                currentY += 10;
            }
        }

        return currentY;
    };

    const addListSection = (doc, title, list, startY) => {
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;
        const margin = 20; // Left and right margin
        const maxLineWidth = pageWidth - 2 * margin;
        let currentY;
        doc.setFontSize(16);
        doc.setTextColor(23, 162, 184); // Blue color
        currentY = checkAndAddPage(doc, startY + 12, pageHeight);
        doc.text(title, margin, startY);
        doc.line(margin, startY + 2, pageWidth - margin, startY + 2); // Line

        for (const item in list) {
            // Get each info to display
            const textLine = `- ${list[item]}`;

            // Check if a new page is needed
            currentY = checkAndAddPage(doc, currentY, pageHeight);

            // Split text if it's too long
            if (doc.getTextWidth(textLine) > maxLineWidth) {
                const lines = doc.splitTextToSize(textLine, maxLineWidth);
                lines.forEach(line => {
                    currentY = checkAndAddPage(doc, currentY, pageHeight);
                    doc.setFontSize(14);
                    doc.setTextColor(33, 37, 41);
                    doc.text(line, margin, currentY);
                    currentY += 10;
                });
            } else {
                doc.setFontSize(14);
                doc.setTextColor(33, 37, 41);
                doc.text(textLine, margin, currentY);
                currentY += 10;
            }
        }
        return currentY;
    };

    const addWorkloadsSection = (doc, title, workloads, startY) => {
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;
        const margin = 20; // Left and right margin
        const maxLineWidth = pageWidth - 2 * margin;

        doc.setFontSize(16);
        doc.setTextColor(23, 162, 184); // Blue color
        checkAndAddPage(doc, startY, pageHeight);
        doc.text(title, margin, startY);
        doc.line(margin, startY + 2, pageWidth - margin, startY + 2); // Line

        let currentY = startY + 12;
        workloads.forEach(workload => {
            // Extract general information
            const kind = workload.kind || "N/A";
            const name = workload.metadata?.name || "N/A";
            const namespace = workload.metadata?.namespace || "N/A";
            const replicas = workload.spec?.replicas || "N/A";

            const workloadInfo = `Kind: ${kind}, Name: ${name}, Namespace: ${namespace}, Replicas: ${replicas}`;

            // Check if a new page is needed
            checkAndAddPage(doc, currentY, pageHeight);

            // Split text if it's too long
            if (doc.getTextWidth(workloadInfo) > maxLineWidth) {
                const lines = doc.splitTextToSize(workloadInfo, maxLineWidth);
                lines.forEach(line => {
                    checkAndAddPage(doc, currentY, pageHeight);
                    doc.setFontSize(14);
                    doc.setTextColor(33, 37, 41);
                    doc.text(line, margin, currentY);
                    currentY += 10;
                });
            } else {
                doc.setFontSize(14);
                doc.setTextColor(33, 37, 41);
                doc.text(workloadInfo, margin, currentY);
                currentY += 10;
            }
        });
        return currentY;
    };

    const checkAndAddPage = (doc, currentY, pageHeight) => {
        if (currentY >= pageHeight - 20) {
            doc.addPage();
            currentY = 20;
        }
        return currentY;
    };

    const capitalizeFirstLetter = (str) => {
        if (!str) return str;
        return str.charAt(0).toUpperCase() + str.slice(1);
    };

    return (
        <Content style={{backgroundColor: "#232323", color: "white"}}>
            <Row gutter={24} style={{marginTop: "20px"}}>
                <Col span={4}></Col>
                <Col span={12}>
                    <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%'}}>
                        <div style={{maxWidth: '600px', maxHeight: '800px', overflow: 'scroll'}}>
                            {pdfUri && (
                                <Document file={pdfUri}>
                                    {Array.from({ length: pageCount }, (_, index) => (
                                        <Page key={index} pageNumber={index + 1}/>
                                    ))}
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
