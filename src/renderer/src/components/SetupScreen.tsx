import React, { useState, useEffect } from 'react';
import { ExamConfig, SystemInfo } from '../../../types/examlock';
import { AdminVaultModal } from './AdminVaultModal';
import { Shield, ShieldAlert, Monitor, Camera, Lock, CheckSquare, Square, ExternalLink, Play, Info, Globe } from 'lucide-react';

interface SetupScreenProps {
  onStartTest: (config: ExamConfig) => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ onStartTest }) => {
  const [candidateName, setCandidateName] = useState('Alex Rivera');
  const [candidateId, setCandidateId] = useState('EX-84920');
  const [testTitle, setTestTitle] = useState('HackerRank Software Engineer Assessment');
  const [testUrl, setTestUrl] = useState('https://www.hackerrank.com');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [webcamEnabled, setWebcamEnabled] = useState(true);
  const [allowCopyPaste, setAllowCopyPaste] = useState(false);
  const [reportWebhookUrl, setReportWebhookUrl] = useState('');
  const [adminVaultOpen, setAdminVaultOpen] = useState(false);

  // Consent Checkboxes
  const [consentFocus, setConsentFocus] = useState(false);
  const [consentCamera, setConsentCamera] = useState(false);
  const [consentWhitelist, setConsentWhitelist] = useState(false);

  // System Diagnostics
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [cameraAccess, setCameraAccess] = useState<'pending' | 'granted' | 'denied'>('pending');

  useEffect(() => {
    // Fetch system information via IPC
    if (window.examLockAPI?.getSystemInfo) {
      window.examLockAPI.getSystemInfo().then(info => {
        setSystemInfo(info);
      }).catch(() => {
        setSystemInfo({
          displaysCount: 1,
          os: 'macOS (Darwin)',
          hostname: 'localhost',
          platform: 'darwin',
          arch: 'arm64'
        });
      });
    }

    // Check camera availability
    navigator.mediaDevices?.getUserMedia({ video: true })
      .then(stream => {
        setCameraAccess('granted');
        stream.getTracks().forEach(t => t.stop());
      })
      .catch(() => {
        setCameraAccess('denied');
      });
  }, []);

  // Extract root domain for whitelist preview
  const getWhitelistedDomain = (url: string): string => {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      const hostname = parsed.hostname.toLowerCase();
      // Extract root domain e.g. hackerrank.com from www.hackerrank.com
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        return parts.slice(-2).join('.');
      }
      return hostname;
    } catch (e) {
      return 'invalid-url';
    }
  };

  const allowedDomain = getWhitelistedDomain(testUrl);
  const isUrlValid = allowedDomain !== 'invalid-url' && testUrl.trim().length > 0;
  const isFormValid = candidateName.trim() !== '' && 
                      candidateId.trim() !== '' && 
                      testTitle.trim() !== '' && 
                      isUrlValid && 
                      consentFocus && 
                      consentWhitelist && 
                      (!webcamEnabled || consentCamera);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    const formattedUrl = testUrl.startsWith('http') ? testUrl : `https://${testUrl}`;
    
    onStartTest({
      candidateName,
      candidateId,
      testTitle,
      testUrl: formattedUrl,
      allowedDomain,
      durationMinutes,
      webcamEnabled,
      allowCopyPaste,
      consentGiven: true,
      reportWebhookUrl: reportWebhookUrl.trim(),
    });
  };

  return (
    <div className="min-h-screen bg-soc-bg text-soc-text flex flex-col font-sans select-none overflow-y-auto">
      {/* Top Header Bar */}
      <header className="h-14 bg-soc-header border-b border-soc-border flex items-center justify-between px-6">
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 bg-soc-accent/20 border border-soc-accent flex items-center justify-center rounded-sm">
            <Shield className="w-4 h-4 text-soc-accent" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wider text-soc-text uppercase font-mono">
              EXAMLOCK <span className="text-soc-muted font-normal text-xs">v1.0.0</span>
            </h1>
            <p className="text-[11px] text-soc-muted font-mono">SECURE ASSESSMENT KIOSK ENVIRONMENT</p>
          </div>
        </div>

        <div className="flex items-center space-x-4 font-mono text-xs">
          <button
            type="button"
            onClick={() => setAdminVaultOpen(true)}
            className="flex items-center space-x-2 bg-soc-accent/20 border border-soc-accent hover:bg-soc-accent text-soc-accent hover:text-white px-3 py-1.5 rounded-sm transition-colors cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="font-semibold">EXAMINER AUDIT VAULT</span>
          </button>

          <div className="flex items-center space-x-2 bg-soc-panel border border-soc-border px-3 py-1 rounded-sm">
            <span className="w-2 h-2 rounded-full bg-soc-green"></span>
            <span className="text-soc-muted">STATUS:</span>
            <span className="text-soc-green font-semibold">KIOSK READY</span>
          </div>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Configuration (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Candidate & Test Info Section */}
            <div className="bg-soc-panel border border-soc-border p-5 rounded-sm space-y-4">
              <div className="flex items-center justify-between border-b border-soc-border pb-3">
                <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-soc-text flex items-center space-x-2">
                  <Lock className="w-3.5 h-3.5 text-soc-accent" />
                  <span>Session & Candidate Details</span>
                </h2>
                <span className="text-[10px] font-mono text-soc-muted">STEP 1 OF 2</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-soc-muted mb-1 uppercase">Candidate Full Name *</label>
                  <input
                    type="text"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="w-full bg-soc-bg border border-soc-border focus:border-soc-accent px-3 py-2 text-sm font-sans text-soc-text outline-none transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-soc-muted mb-1 uppercase">Candidate ID / Reg No *</label>
                  <input
                    type="text"
                    value={candidateId}
                    onChange={(e) => setCandidateId(e.target.value)}
                    placeholder="e.g. CAND-99412"
                    className="w-full bg-soc-bg border border-soc-border focus:border-soc-accent px-3 py-2 text-sm font-mono text-soc-text outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-soc-muted mb-1 uppercase">Assessment Title / Subject *</label>
                <input
                  type="text"
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  placeholder="e.g. Senior Backend Engineer Technical Assessment"
                  className="w-full bg-soc-bg border border-soc-border focus:border-soc-accent px-3 py-2 text-sm font-sans text-soc-text outline-none transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-soc-muted mb-1 uppercase">Test URL (HackerRank, Aptitude Link, or Custom URL) *</label>
                <input
                  type="url"
                  value={testUrl}
                  onChange={(e) => setTestUrl(e.target.value)}
                  placeholder="https://www.hackerrank.com/tests/abc123"
                  className="w-full bg-soc-bg border border-soc-border focus:border-soc-accent px-3 py-2 text-sm font-mono text-soc-text outline-none transition-colors"
                  required
                />

                {/* Whitelist Preview Badge */}
                <div className="mt-2 flex items-center justify-between bg-soc-bg/60 border border-soc-border p-2 text-xs font-mono">
                  <span className="text-soc-muted">WHITELISTED DOMAIN LOCK:</span>
                  {isUrlValid ? (
                    <span className="text-soc-accent bg-soc-accent/10 px-2 py-0.5 border border-soc-accent/30 font-semibold flex items-center space-x-1">
                      <Lock className="w-3 h-3" />
                      <span>*.{allowedDomain}</span>
                    </span>
                  ) : (
                    <span className="text-soc-red font-semibold">INVALID URL FORMAT</span>
                  )}
                </div>
              </div>
            </div>

            {/* Test Rules & Environment Toggles */}
            <div className="bg-soc-panel border border-soc-border p-5 rounded-sm space-y-4">
              <div className="flex items-center justify-between border-b border-soc-border pb-3">
                <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-soc-text flex items-center space-x-2">
                  <Shield className="w-3.5 h-3.5 text-soc-accent" />
                  <span>Proctoring & Constraint Rules</span>
                </h2>
                <span className="text-[10px] font-mono text-soc-muted">CONFIGURATION</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono text-soc-muted mb-1 uppercase">Duration (Minutes)</label>
                  <input
                    type="number"
                    min="0"
                    max="360"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                    className="w-full bg-soc-bg border border-soc-border focus:border-soc-accent px-3 py-2 text-sm font-mono text-soc-text outline-none"
                  />
                  <span className="text-[10px] text-soc-dim font-mono">Set 0 for untimed test</span>
                </div>

                <div className="flex items-center space-x-3 pt-4">
                  <input
                    type="checkbox"
                    id="webcamToggle"
                    checked={webcamEnabled}
                    onChange={(e) => setWebcamEnabled(e.target.checked)}
                    className="w-4 h-4 accent-soc-accent bg-soc-bg border-soc-border rounded-sm cursor-pointer"
                  />
                  <label htmlFor="webcamToggle" className="text-xs font-mono text-soc-text cursor-pointer">
                    Enable Webcam Proctoring & Snapshots
                  </label>
                </div>

                <div className="flex items-center space-x-3 pt-4">
                  <input
                    type="checkbox"
                    id="copyPasteToggle"
                    checked={allowCopyPaste}
                    onChange={(e) => setAllowCopyPaste(e.target.checked)}
                    className="w-4 h-4 accent-soc-accent bg-soc-bg border-soc-border rounded-sm cursor-pointer"
                  />
                  <label htmlFor="copyPasteToggle" className="text-xs font-mono text-soc-text cursor-pointer">
                    Allow Clipboard (Copy / Paste)
                  </label>
                </div>
              </div>
            </div>

            {/* Candidate Consent & Security Disclosure */}
            <div className="bg-soc-panel border border-soc-border p-5 rounded-sm space-y-4">
              <div className="flex items-center justify-between border-b border-soc-border pb-3">
                <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-soc-amber flex items-center space-x-2">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Security Disclosure & Candidate Consent</span>
                </h2>
                <span className="text-[10px] font-mono text-soc-amber">REQUIRED ACKNOWLEDGEMENT</span>
              </div>

              <div className="space-y-3 text-xs font-sans text-soc-text">
                <div 
                  onClick={() => setConsentFocus(!consentFocus)}
                  className="flex items-start space-x-3 p-2.5 bg-soc-bg/50 border border-soc-border hover:border-soc-borderHover cursor-pointer transition-colors"
                >
                  <div className="mt-0.5 text-soc-accent">
                    {consentFocus ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-soc-dim" />}
                  </div>
                  <div>
                    <p className="font-semibold font-mono text-[11px] text-soc-text uppercase">Window Focus & Keyboard Shortcuts Monitoring</p>
                    <p className="text-soc-muted text-[11px]">
                      I understand that leaving the test window (Alt+Tab), opening developer tools (F12), or attempting unauthorized shortcuts will log security flags and notify the proctor.
                    </p>
                  </div>
                </div>

                {webcamEnabled && (
                  <div 
                    onClick={() => setConsentCamera(!consentCamera)}
                    className="flex items-start space-x-3 p-2.5 bg-soc-bg/50 border border-soc-border hover:border-soc-borderHover cursor-pointer transition-colors"
                  >
                    <div className="mt-0.5 text-soc-accent">
                      {consentCamera ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-soc-dim" />}
                    </div>
                    <div>
                      <p className="font-semibold font-mono text-[11px] text-soc-text uppercase">Webcam Local Snapshot Consent</p>
                      <p className="text-soc-muted text-[11px]">
                        I consent to automated periodic webcam snapshots captured locally during the assessment session for integrity verification. No silent external uploads are performed.
                      </p>
                    </div>
                  </div>
                )}

                <div 
                  onClick={() => setConsentWhitelist(!consentWhitelist)}
                  className="flex items-start space-x-3 p-2.5 bg-soc-bg/50 border border-soc-border hover:border-soc-borderHover cursor-pointer transition-colors"
                >
                  <div className="mt-0.5 text-soc-accent">
                    {consentWhitelist ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-soc-dim" />}
                  </div>
                  <div>
                    <p className="font-semibold font-mono text-[11px] text-soc-text uppercase">Domain Lock Enforcement</p>
                    <p className="text-soc-muted text-[11px]">
                      I acknowledge that all outward link clicks or navigation outside <span className="font-mono text-soc-accent">*.{allowedDomain}</span> will be blocked and recorded as a security policy violation.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Launch Action Button */}
            <button
              type="submit"
              disabled={!isFormValid}
              className={`w-full py-3.5 font-mono text-xs uppercase tracking-wider font-semibold flex items-center justify-center space-x-2 border transition-all ${
                isFormValid 
                  ? 'bg-soc-accent hover:bg-soc-accentHover text-white border-soc-accent shadow-subtle cursor-pointer'
                  : 'bg-soc-panel text-soc-dim border-soc-border cursor-not-allowed'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>START SECURE ASSESSMENT KIOSK</span>
            </button>
          </form>
        </div>

        {/* Right Column: System Diagnostics & SOC Monitor Audit (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* System Readiness Panel */}
          <div className="bg-soc-panel border border-soc-border p-5 rounded-sm space-y-4">
            <div className="flex items-center justify-between border-b border-soc-border pb-3">
              <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-soc-text flex items-center space-x-2">
                <Monitor className="w-3.5 h-3.5 text-soc-accent" />
                <span>System Readiness Audit</span>
              </h2>
              <span className="text-[10px] font-mono text-soc-green">DIAGNOSTICS</span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between p-2.5 bg-soc-bg border border-soc-border">
                <span className="text-soc-muted">DISPLAY COUNT:</span>
                <span className={`px-2 py-0.5 font-semibold border text-[11px] ${
                  (systemInfo?.displaysCount || 1) === 1
                    ? 'bg-soc-greenBg text-soc-green border-soc-green/30'
                    : 'bg-soc-amberBg text-soc-amber border-soc-amber/30'
                }`}>
                  {systemInfo?.displaysCount || 1} DISPLAY(S) DETECTED
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-soc-bg border border-soc-border">
                <span className="text-soc-muted">WEBCAM SENSOR:</span>
                <span className={`px-2 py-0.5 font-semibold border text-[11px] ${
                  cameraAccess === 'granted'
                    ? 'bg-soc-greenBg text-soc-green border-soc-green/30'
                    : 'bg-soc-redBg text-soc-red border-soc-red/30'
                }`}>
                  {cameraAccess === 'granted' ? 'READY & PERMITTED' : cameraAccess === 'denied' ? 'ACCESS DENIED' : 'CHECKING...'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-soc-bg border border-soc-border">
                <span className="text-soc-muted">TARGET PROTOCOL:</span>
                <span className="text-soc-accent font-semibold">HTTPS / SECURE SSL</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-soc-bg border border-soc-border">
                <span className="text-soc-muted">OPERATING SYSTEM:</span>
                <span className="text-soc-text text-[11px]">{systemInfo?.os || 'macOS / Windows'}</span>
              </div>
            </div>
          </div>

          {/* Privacy & Security Notes */}
          <div className="bg-soc-panel border border-soc-border p-5 rounded-sm space-y-3">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-soc-text flex items-center space-x-2">
              <Info className="w-3.5 h-3.5 text-soc-accent" />
              <span>Security & Privacy Compliance</span>
            </h3>
            <ul className="text-xs font-sans text-soc-muted space-y-2 list-disc list-inside">
              <li>All test proctoring logs and webcam snapshots are stored strictly on your local filesystem.</li>
              <li>No background telemetry or unauthorized data is transmitted to external cloud servers.</li>
              <li>Emergency kiosk unlock shortcut: <code className="bg-soc-bg px-1.5 py-0.5 font-mono text-[11px] text-soc-amber border border-soc-border">Ctrl + Shift + Alt + E</code>.</li>
            </ul>
          </div>
        </div>
      </main>

      {/* Admin / Examiner Audit Vault Modal */}
      <AdminVaultModal
        isOpen={adminVaultOpen}
        onClose={() => setAdminVaultOpen(false)}
      />
    </div>
  );
};
