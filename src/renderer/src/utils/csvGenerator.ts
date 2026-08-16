import { SessionReport } from '../../../types/examlock';

export function generateCSVReport(report: SessionReport): string {
  const criticalCameraFlags = report.events.filter(
    (e) => e.type === 'NO_FACE_DETECTED' || e.type === 'PHONE_DETECTED' || e.type === 'MULTIPLE_FACES_DETECTED' || e.type === 'CAMERA_OBSTRUCTED'
  ).length;

  const focusLossCount = report.events.filter((e) => e.type === 'FOCUS_LOST').length;
  const shortcutBlockedCount = report.events.filter((e) => e.type === 'SHORTCUT_BLOCKED' || e.type === 'DEVTOOLS_ATTEMPT').length;

  // Header Row
  const csvRows: string[] = [];
  
  csvRows.push('=== EXAMLOCK PROCTORING AUDIT SUMMARY ===');
  csvRows.push('');
  csvRows.push('Metric,Value');
  csvRows.push(`Session ID,${escapeCSV(report.sessionId)}`);
  csvRows.push(`Candidate Name,${escapeCSV(report.candidateName)}`);
  csvRows.push(`Candidate ID,${escapeCSV(report.candidateId)}`);
  csvRows.push(`Assessment Title,${escapeCSV(report.testTitle)}`);
  csvRows.push(`Test URL,${escapeCSV(report.testUrl)}`);
  csvRows.push(`Allowed Domain Lock,${escapeCSV(report.allowedDomain)}`);
  csvRows.push(`Start Time,${escapeCSV(report.startTime)}`);
  csvRows.push(`End Time,${escapeCSV(report.endTime)}`);
  csvRows.push(`Duration (Seconds),${report.durationSeconds}`);
  csvRows.push(`Duration (Formatted),${Math.floor(report.durationSeconds / 60)}m ${report.durationSeconds % 60}s`);
  csvRows.push(`Trust Integrity Score,${report.trustScore}%`);
  csvRows.push(`Integrity Rating,${report.trustScore >= 80 ? 'HIGH TRUST' : 'ATTENTION REQUIRED / FLAGGED'}`);
  csvRows.push(`Total Security Flags,${report.totalFlags}`);
  csvRows.push(`Focus Loss Incidents,${focusLossCount}`);
  csvRows.push(`Blocked Shortcuts / DevTools,${shortcutBlockedCount}`);
  csvRows.push(`Camera AI Security Flags,${criticalCameraFlags}`);
  csvRows.push(`Connected Displays Count,${report.systemInfo.displaysCount}`);
  csvRows.push(`Candidate OS,${escapeCSV(report.systemInfo.os)}`);
  csvRows.push('');
  csvRows.push('=== DETAILED ITEMIZED SECURITY EVENT LOG ===');
  csvRows.push('Timestamp,Event Code,Severity,Title,Details,Flagged');

  report.events.forEach((evt) => {
    csvRows.push(
      `${escapeCSV(evt.timestamp)},${escapeCSV(evt.type)},${escapeCSV(evt.severity)},${escapeCSV(evt.title)},${escapeCSV(evt.detail)},${evt.flagged ? 'YES' : 'NO'}`
    );
  });

  return csvRows.join('\n');
}

function escapeCSV(str: string): string {
  if (!str) return '""';
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function downloadCSVFile(report: SessionReport) {
  const csvContent = generateCSVReport(report);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ExamLock_Proctoring_Summary_${report.candidateId}_${Date.now()}.csv`;
  a.click();
}
