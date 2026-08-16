import jsPDF from 'jspdf';
import { SessionReport } from '../../../types/examlock';

export function generatePDFReport(report: SessionReport): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Dark slate header styling matching SOC design theme
  doc.setFillColor(15, 17, 21); // #0F1115
  doc.rect(0, 0, 210, 35, 'F');

  // Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(225, 228, 234);
  doc.text('EXAMLOCK PROCTORING AUDIT REPORT', 14, 18);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(138, 146, 163);
  doc.text(`SESSION ID: ${report.sessionId} | GENERATED: ${new Date().toISOString()}`, 14, 26);

  // Section 1: Candidate & Exam Details Table
  doc.setLineWidth(0.3);
  doc.setDrawColor(36, 40, 50);
  
  let y = 45;
  doc.setFontSize(12);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('1. SESSION METADATA', 14, y);

  y += 6;
  doc.setFontSize(10);
  doc.setFont('Helvetica', 'normal');
  
  const metaFields = [
    ['Candidate Name:', report.candidateName, 'Candidate ID:', report.candidateId],
    ['Test Title:', report.testTitle, 'Allowed Domain:', report.allowedDomain],
    ['Start Time:', report.startTime, 'End Time:', report.endTime],
    ['Duration:', `${Math.floor(report.durationSeconds / 60)}m ${report.durationSeconds % 60}s`, 'Total Security Flags:', `${report.totalFlags}`],
    ['Integrity Score:', `${report.trustScore}%`, 'OS / System:', `${report.systemInfo.os} (${report.systemInfo.displaysCount} display(s))`]
  ];

  metaFields.forEach((row) => {
    doc.setFont('Helvetica', 'bold');
    doc.text(row[0], 14, y);
    doc.setFont('Helvetica', 'normal');
    doc.text(row[1], 50, y);

    doc.setFont('Helvetica', 'bold');
    doc.text(row[2], 115, y);
    doc.setFont('Helvetica', 'normal');
    doc.text(row[3], 155, y);
    y += 7;
  });

  // Divider
  y += 4;
  doc.setDrawColor(200, 200, 200);
  doc.line(14, y, 196, y);
  y += 8;

  // Section 2: Security Events Log
  doc.setFontSize(12);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('2. AUDIT LOG & SECURITY EVENTS', 14, y);
  y += 6;

  // Table header
  doc.setFillColor(240, 242, 245);
  doc.rect(14, y, 182, 7, 'F');
  doc.setFontSize(9);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(50, 50, 50);
  doc.text('TIMESTAMP', 16, y + 5);
  doc.text('EVENT CODE', 55, y + 5);
  doc.text('SEVERITY', 105, y + 5);
  doc.text('DETAILS / DESCRIPTION', 135, y + 5);

  y += 9;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);

  if (report.events.length === 0) {
    doc.text('No security events or focus loss flags recorded.', 16, y);
    y += 8;
  } else {
    report.events.forEach((evt) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setTextColor(evt.severity === 'critical' ? 200 : evt.severity === 'warning' ? 180 : 80, evt.severity === 'critical' ? 30 : evt.severity === 'warning' ? 120 : 80, 30);
      doc.text(evt.timestamp.substring(11, 19), 16, y);
      doc.text(evt.type, 55, y);
      doc.text(evt.severity.toUpperCase(), 105, y);
      doc.setTextColor(40, 40, 40);
      doc.text(evt.detail.substring(0, 40), 135, y);
      y += 6;
    });
  }

  // Footer page numbers
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`ExamLock Automated Security Audit | Page ${i} of ${pages}`, 14, 288);
  }

  return doc.output('blob');
}
