import React, { useState } from 'react';
import { ExamConfig, SecurityEvent, SessionReport, SystemInfo } from '../../../types/examlock';
import { generatePDFReport } from '../utils/reportGenerator';
import { downloadCSVFile } from '../utils/csvGenerator';
import { Shield, ShieldCheck, ShieldAlert, Download, FileText, ArrowLeft, Clock, Monitor, Camera, Filter, CheckCircle2 } from 'lucide-react';

interface PostTestReportProps {
  config: ExamConfig;
  events: SecurityEvent[];
  snapshots: { timestamp: string; dataUrl: string }[];
  durationSeconds: number;
  onReset: () => void;
}

export const PostTestReport: React.FC<PostTestReportProps> = ({
  config,
  events,
  snapshots,
  durationSeconds,
  onReset,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  // System info stub
  const systemInfo: SystemInfo = {
    displaysCount: 1,
    os: 'macOS / Windows',
    hostname: 'localhost',
    platform: 'desktop',
    arch: 'x64'
  };

  const flaggedEvents = events.filter((e) => e.flagged);
  const totalFlags = flaggedEvents.length;

  const criticalCameraFlags = flaggedEvents.filter(
    (e) => e.type === 'NO_FACE_DETECTED' || e.type === 'PHONE_DETECTED' || e.type === 'MULTIPLE_FACES_DETECTED' || e.type === 'CAMERA_OBSTRUCTED'
  ).length;

  const otherFlags = totalFlags - criticalCameraFlags;

  // Deduct 20% per camera violation, 10% per focus/shortcut violation
  const trustScore = Math.max(0, 100 - (criticalCameraFlags * 20 + otherFlags * 10));
  const isHighIntegrity = trustScore >= 80;

  const sessionReport: SessionReport = {
    sessionId: `SESS-${Date.now().toString().slice(-6)}`,
    candidateName: config.candidateName,
    candidateId: config.candidateId,
    testTitle: config.testTitle,
    testUrl: config.testUrl,
    allowedDomain: config.allowedDomain,
    startTime: new Date(Date.now() - durationSeconds * 1000).toISOString(),
    endTime: new Date().toISOString(),
    durationSeconds,
    totalFlags,
    trustScore,
    systemInfo,
    events,
    snapshots,
  };

  // Auto-Save Report to Examiner Audit Vault & Remote Webhook on completion
  React.useEffect(() => {
    if (window.examLockAPI?.saveSessionReport) {
      window.examLockAPI.saveSessionReport(sessionReport, config.reportWebhookUrl).then((res) => {
        if (res.webhookStatus && res.webhookStatus !== 'NOT_CONFIGURED') {
          setExportMessage(`Report synced to server webhook status: ${res.webhookStatus}`);
        }
      });
    }
  }, []);

  const filteredEvents = events.filter((evt) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'FOCUS') return evt.type === 'FOCUS_LOST' || evt.type === 'FOCUS_REGAINED';
    if (filterType === 'SHORTCUT') return evt.type === 'SHORTCUT_BLOCKED' || evt.type === 'DEVTOOLS_ATTEMPT';
    if (filterType === 'SYSTEM') return evt.type === 'MULTI_MONITOR_DETECTED' || evt.type === 'NAV_BLOCKED';
    if (filterType === 'WEBCAM') return evt.type === 'WEBCAM_SNAPSHOT';
    return true;
  });

  const handleExportJSON = async () => {
    if (window.examLockAPI?.exportReport) {
      const res = await window.examLockAPI.exportReport(sessionReport, 'json');
      if (res.success) {
        setExportMessage(`Report exported successfully to: ${res.filePath}`);
      }
    } else {
      // Browser fallback download
      const blob = new Blob([JSON.stringify(sessionReport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ExamLock_Report_${config.candidateId}.json`;
      a.click();
      setExportMessage('Exported JSON audit file.');
    }
  };

  const handleExportPDF = () => {
    const pdfBlob = generatePDFReport(sessionReport);
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ExamLock_Audit_Report_${config.candidateId}.pdf`;
    a.click();
    setExportMessage('Downloaded PDF proctoring audit report.');
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="min-h-screen bg-soc-bg text-soc-text flex flex-col font-sans select-none">
      {/* Top Header */}
      <header className="h-14 bg-soc-header border-b border-soc-border flex items-center justify-between px-6">
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 bg-soc-accent/20 border border-soc-accent flex items-center justify-center rounded-sm">
            <Shield className="w-4 h-4 text-soc-accent" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wider text-soc-text uppercase font-mono">
              SESSION AUDIT REPORT <span className="text-soc-muted font-normal text-xs">| {sessionReport.sessionId}</span>
            </h1>
            <p className="text-[11px] text-soc-muted font-mono">POST-TEST PROCTORING SUMMARY</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={onReset}
            className="flex items-center space-x-2 bg-soc-panel border border-soc-border hover:border-soc-borderHover px-3 py-1.5 text-soc-text cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>RETURN TO SETUP</span>
          </button>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Export Status Toast */}
        {exportMessage && (
          <div className="p-3 bg-soc-greenBg border border-soc-green text-soc-green font-mono text-xs flex items-center justify-between">
            <span>{exportMessage}</span>
            <button onClick={() => setExportMessage(null)} className="cursor-pointer font-bold">×</button>
          </div>
        )}

        {/* Executive Summary Cards (4 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Trust Score Rating */}
          <div className="bg-soc-panel border border-soc-border p-4 rounded-sm space-y-2">
            <div className="flex items-center justify-between text-soc-muted font-mono text-xs">
              <span>INTEGRITY SCORE</span>
              {isHighIntegrity ? <ShieldCheck className="w-4 h-4 text-soc-green" /> : <ShieldAlert className="w-4 h-4 text-soc-amber" />}
            </div>
            <div className="flex items-baseline space-x-2">
              <span className={`text-3xl font-mono font-bold ${isHighIntegrity ? 'text-soc-green' : 'text-soc-amber'}`}>
                {trustScore}%
              </span>
              <span className="text-xs font-mono text-soc-muted">
                {isHighIntegrity ? 'HIGH TRUST' : 'AUDIT REQUIRED'}
              </span>
            </div>
          </div>

          {/* Time Spent */}
          <div className="bg-soc-panel border border-soc-border p-4 rounded-sm space-y-2">
            <div className="flex items-center justify-between text-soc-muted font-mono text-xs">
              <span>TEST DURATION</span>
              <Clock className="w-4 h-4 text-soc-accent" />
            </div>
            <div className="text-2xl font-mono font-bold text-soc-text">
              {formatDuration(durationSeconds)}
            </div>
          </div>

          {/* Flags Count */}
          <div className="bg-soc-panel border border-soc-border p-4 rounded-sm space-y-2">
            <div className="flex items-center justify-between text-soc-muted font-mono text-xs">
              <span>SECURITY FLAGS</span>
              <ShieldAlert className={`w-4 h-4 ${totalFlags > 0 ? 'text-soc-red' : 'text-soc-green'}`} />
            </div>
            <div className={`text-2xl font-mono font-bold ${totalFlags > 0 ? 'text-soc-red' : 'text-soc-green'}`}>
              {totalFlags} EVENT(S)
            </div>
          </div>

          {/* Candidate ID */}
          <div className="bg-soc-panel border border-soc-border p-4 rounded-sm space-y-2">
            <div className="flex items-center justify-between text-soc-muted font-mono text-xs">
              <span>CANDIDATE METADATA</span>
              <Monitor className="w-4 h-4 text-soc-muted" />
            </div>
            <div className="font-mono text-xs text-soc-text truncate">
              <p className="font-bold">{config.candidateName}</p>
              <p className="text-soc-muted text-[11px]">{config.candidateId}</p>
            </div>
          </div>
        </div>

        {/* Middle Section: Export Actions & Audit Log */}
        <div className="bg-soc-panel border border-soc-border p-5 rounded-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-soc-border pb-3 gap-3">
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-soc-text flex items-center space-x-2">
              <FileText className="w-4 h-4 text-soc-accent" />
              <span>Proctoring Audit Log ({events.length} total recorded events)</span>
            </h2>

            {/* Export Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <button
                onClick={() => {
                  downloadCSVFile(sessionReport);
                  setExportMessage('Downloaded Proctoring CSV Audit Summary file.');
                }}
                className="flex items-center space-x-1.5 bg-soc-greenBg border border-soc-green text-soc-green hover:bg-soc-green hover:text-white px-3 py-1.5 font-semibold cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>EXPORT CSV AUDIT</span>
              </button>

              <button
                onClick={handleExportPDF}
                className="flex items-center space-x-1.5 bg-soc-accent hover:bg-soc-accentHover text-white px-3 py-1.5 font-semibold cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>EXPORT PDF</span>
              </button>

              <button
                onClick={handleExportJSON}
                className="flex items-center space-x-1.5 bg-soc-bg border border-soc-border hover:border-soc-borderHover text-soc-text px-3 py-1.5 font-semibold cursor-pointer transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>EXPORT JSON</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center space-x-2 font-mono text-xs overflow-x-auto pb-1">
            <span className="text-soc-muted flex items-center space-x-1 mr-2 text-[11px]">
              <Filter className="w-3 h-3" />
              <span>FILTER:</span>
            </span>
            {['ALL', 'FOCUS', 'SHORTCUT', 'SYSTEM', 'WEBCAM'].map((f) => (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={`px-2.5 py-1 border transition-colors cursor-pointer text-[11px] ${
                  filterType === f
                    ? 'bg-soc-accent/20 border-soc-accent text-soc-accent font-bold'
                    : 'bg-soc-bg border-soc-border text-soc-muted hover:text-soc-text'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Audit Event Table */}
          <div className="bg-soc-bg border border-soc-border overflow-hidden">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-soc-header border-b border-soc-border text-[11px] text-soc-muted">
                <tr>
                  <th className="p-3">TIMESTAMP</th>
                  <th className="p-3">EVENT TYPE</th>
                  <th className="p-3">SEVERITY</th>
                  <th className="p-3">TITLE / EVENT DETAILS</th>
                  <th className="p-3 text-right">FLAGGED</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soc-border text-soc-text">
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-soc-muted text-xs">
                      No security events matching filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((evt) => (
                    <tr key={evt.id} className="hover:bg-soc-panel/50 transition-colors">
                      <td className="p-3 text-soc-muted text-[11px]">{evt.timestamp}</td>
                      <td className="p-3 font-semibold text-soc-text text-[11px]">{evt.type}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 border text-[10px] uppercase font-semibold ${
                          evt.severity === 'critical'
                            ? 'bg-soc-redBg text-soc-red border-soc-red/30'
                            : evt.severity === 'warning'
                            ? 'bg-soc-amberBg text-soc-amber border-soc-amber/30'
                            : 'bg-soc-bg text-soc-muted border-soc-border'
                        }`}>
                          {evt.severity}
                        </span>
                      </td>
                      <td className="p-3">
                        <p className="font-semibold text-soc-text">{evt.title}</p>
                        <p className="text-[11px] text-soc-muted truncate max-w-lg">{evt.detail}</p>
                      </td>
                      <td className="p-3 text-right">
                        {evt.flagged ? (
                          <span className="text-soc-red font-bold text-[11px]">FLAGGED</span>
                        ) : (
                          <span className="text-soc-muted text-[11px]">INFO</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Section: Local Webcam Snapshots Gallery (if proctoring enabled) */}
        {config.webcamEnabled && (
          <div className="bg-soc-panel border border-soc-border p-5 rounded-sm space-y-4">
            <div className="flex items-center justify-between border-b border-soc-border pb-3">
              <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-soc-text flex items-center space-x-2">
                <Camera className="w-4 h-4 text-soc-accent" />
                <span>Webcam Snapshot Audit Gallery ({snapshots.length} local captures)</span>
              </h2>
            </div>

            {snapshots.length === 0 ? (
              <p className="text-xs font-mono text-soc-muted">No webcam snapshots recorded during this session.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {snapshots.map((s, idx) => (
                  <div key={idx} className="bg-soc-bg border border-soc-border p-1.5 space-y-1">
                    <div className="aspect-video bg-black overflow-hidden relative">
                      <img src={s.dataUrl} alt={`Snapshot ${idx}`} className="w-full h-full object-cover" />
                    </div>
                    <p className="font-mono text-[9px] text-soc-muted text-center truncate">
                      {s.timestamp.substring(11, 19)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
