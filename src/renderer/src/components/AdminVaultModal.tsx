import React, { useState, useEffect } from 'react';
import { SessionReport } from '../../../types/examlock';
import { generatePDFReport } from '../utils/reportGenerator';
import { Shield, ShieldAlert, ShieldCheck, X, Search, FileText, Download, Clock, Camera, Filter, ExternalLink, ChevronRight, UserCheck } from 'lucide-react';

interface AdminVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminVaultModal: React.FC<AdminVaultModalProps> = ({ isOpen, onClose }) => {
  const [reports, setReports] = useState<SessionReport[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState<SessionReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && window.examLockAPI?.getAllPastReports) {
      setLoading(true);
      window.examLockAPI.getAllPastReports().then((data) => {
        setReports(data);
        setLoading(false);
      }).catch(() => {
        setLoading(false);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredReports = reports.filter(
    (r) =>
      r.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.candidateId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.testTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportPDF = (report: SessionReport) => {
    const pdfBlob = generatePDFReport(report);
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ExamLock_Audit_Report_${report.candidateId}.pdf`;
    a.click();
  };

  const handleExportJSON = async (report: SessionReport) => {
    if (window.examLockAPI?.exportReport) {
      await window.examLockAPI.exportReport(report, 'json');
    } else {
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ExamLock_Report_${report.candidateId}.json`;
      a.click();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="bg-soc-panel border border-soc-border max-w-5xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden rounded-sm">
        {/* Header Bar */}
        <div className="h-14 bg-soc-header border-b border-soc-border flex items-center justify-between px-6">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 bg-soc-accent/20 border border-soc-accent flex items-center justify-center rounded-sm">
              <Shield className="w-4 h-4 text-soc-accent" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-wider text-soc-text uppercase font-mono">
                EXAMINER AUDIT VAULT <span className="text-soc-muted font-normal text-xs">| ADMIN DASHBOARD</span>
              </h2>
              <p className="text-[11px] text-soc-muted font-mono">CENTRALIZED CANDIDATE PROCTORING RECORDS</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-soc-muted hover:text-soc-text p-1.5 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Side: Candidates List */}
          <div className="w-full md:w-1/2 border-r border-soc-border flex flex-col bg-soc-bg">
            {/* Search Input */}
            <div className="p-3 border-b border-soc-border">
              <div className="flex items-center space-x-2 bg-soc-panel border border-soc-border px-3 py-1.5">
                <Search className="w-4 h-4 text-soc-muted" />
                <input
                  type="text"
                  placeholder="Search by candidate name, ID, or assessment title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-transparent font-mono text-xs text-soc-text outline-none"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-soc-border">
              {loading ? (
                <div className="p-8 text-center font-mono text-xs text-soc-muted">
                  Loading examiner audit records...
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="p-8 text-center font-mono text-xs text-soc-muted space-y-2">
                  <UserCheck className="w-8 h-8 text-soc-dim mx-auto" />
                  <p>No candidate proctoring records found.</p>
                  <p className="text-[11px] text-soc-dim">Completed test sessions will automatically register here.</p>
                </div>
              ) : (
                filteredReports.map((report) => (
                  <div
                    key={report.sessionId}
                    onClick={() => setSelectedReport(report)}
                    className={`p-4 cursor-pointer transition-colors space-y-2 ${
                      selectedReport?.sessionId === report.sessionId
                        ? 'bg-soc-accent/10 border-l-4 border-l-soc-accent'
                        : 'hover:bg-soc-panel'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="font-bold text-soc-text">{report.candidateName}</span>
                      <span className={`px-2 py-0.5 border text-[10px] font-bold ${
                        report.trustScore >= 80
                          ? 'bg-soc-greenBg text-soc-green border-soc-green/30'
                          : 'bg-soc-amberBg text-soc-amber border-soc-amber/30'
                      }`}>
                        {report.trustScore}% TRUST
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-soc-muted">
                      <span>ID: {report.candidateId}</span>
                      <span>FLAGS: {report.totalFlags}</span>
                    </div>

                    <p className="text-[11px] text-soc-dim truncate font-sans">{report.testTitle}</p>

                    <div className="flex items-center justify-between text-[10px] font-mono text-soc-dim pt-1 border-t border-soc-border/50">
                      <span>{new Date(report.endTime).toLocaleString()}</span>
                      <span className="flex items-center space-x-1 text-soc-accent">
                        <span>Inspect</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Side: Selected Candidate Inspection Drawer */}
          <div className="hidden md:flex flex-1 flex-col bg-soc-panel p-5 overflow-y-auto">
            {selectedReport ? (
              <div className="space-y-5">
                {/* Header Summary */}
                <div className="border-b border-soc-border pb-4 space-y-2">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-soc-muted">SESSION ID: {selectedReport.sessionId}</span>
                    <span className="text-soc-accent">{new Date(selectedReport.endTime).toLocaleDateString()}</span>
                  </div>
                  <h3 className="text-base font-bold font-mono text-soc-text">{selectedReport.candidateName}</h3>
                  <p className="text-xs text-soc-muted font-mono">ID: {selectedReport.candidateId} | Assessment: {selectedReport.testTitle}</p>

                  <div className="flex items-center space-x-3 pt-2 font-mono text-xs">
                    <button
                      onClick={() => handleExportPDF(selectedReport)}
                      className="flex items-center space-x-1.5 bg-soc-accent hover:bg-soc-accentHover text-white px-3 py-1 font-semibold cursor-pointer transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>EXPORT PDF</span>
                    </button>

                    <button
                      onClick={() => handleExportJSON(selectedReport)}
                      className="flex items-center space-x-1.5 bg-soc-bg border border-soc-border hover:border-soc-borderHover text-soc-text px-3 py-1 font-semibold cursor-pointer transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>EXPORT JSON</span>
                    </button>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-3 font-mono text-xs">
                  <div className="bg-soc-bg border border-soc-border p-3 space-y-1">
                    <span className="text-[10px] text-soc-muted">TRUST SCORE</span>
                    <p className={`text-lg font-bold ${selectedReport.trustScore >= 80 ? 'text-soc-green' : 'text-soc-amber'}`}>
                      {selectedReport.trustScore}%
                    </p>
                  </div>

                  <div className="bg-soc-bg border border-soc-border p-3 space-y-1">
                    <span className="text-[10px] text-soc-muted">TOTAL FLAGS</span>
                    <p className={`text-lg font-bold ${selectedReport.totalFlags > 0 ? 'text-soc-red' : 'text-soc-green'}`}>
                      {selectedReport.totalFlags}
                    </p>
                  </div>

                  <div className="bg-soc-bg border border-soc-border p-3 space-y-1">
                    <span className="text-[10px] text-soc-muted">DURATION</span>
                    <p className="text-lg font-bold text-soc-text">
                      {Math.floor(selectedReport.durationSeconds / 60)}m {selectedReport.durationSeconds % 60}s
                    </p>
                  </div>
                </div>

                {/* Audit Event Trail */}
                <div className="space-y-2">
                  <h4 className="text-xs font-mono font-bold uppercase text-soc-muted">
                    Proctoring Audit Trail ({selectedReport.events.length} Events)
                  </h4>
                  <div className="bg-soc-bg border border-soc-border p-2 space-y-2 max-h-48 overflow-y-auto font-mono text-xs">
                    {selectedReport.events.map((evt) => (
                      <div key={evt.id} className="p-2 border border-soc-border bg-soc-panel space-y-0.5">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-soc-muted">[{evt.timestamp}]</span>
                          <span className={`font-bold ${evt.severity === 'critical' ? 'text-soc-red' : 'text-soc-amber'}`}>
                            {evt.type}
                          </span>
                        </div>
                        <p className="font-semibold text-soc-text text-[11px]">{evt.title}</p>
                        <p className="text-[10px] text-soc-muted">{evt.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Snapshot Previews */}
                {selectedReport.snapshots && selectedReport.snapshots.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-mono font-bold uppercase text-soc-muted">
                      Webcam Snapshot Captures ({selectedReport.snapshots.length})
                    </h4>
                    <div className="grid grid-cols-4 gap-2">
                      {selectedReport.snapshots.slice(0, 8).map((snap, idx) => (
                        <div key={idx} className="bg-soc-bg border border-soc-border p-1 aspect-video overflow-hidden">
                          <img src={snap.dataUrl} alt={`Snap ${idx}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center font-mono text-xs text-soc-muted space-y-2">
                <Shield className="w-10 h-10 text-soc-dim" />
                <p>Select a candidate from the left to inspect their complete proctoring audit trail & camera snapshots.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
