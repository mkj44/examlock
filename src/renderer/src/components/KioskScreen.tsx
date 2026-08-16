import React, { useState, useEffect, useRef } from 'react';
import { ExamConfig, SecurityEvent, SecurityEventType } from '../../../types/examlock';
import { initWebcamStream, captureVideoFrame, stopWebcamStream } from '../utils/webcam';
import { analyzeWebcamFrame } from '../utils/webcamAI';
import { Shield, ShieldAlert, Clock, Lock, Camera, AlertTriangle, X, Terminal, ChevronRight, CheckCircle2 } from 'lucide-react';

interface KioskScreenProps {
  config: ExamConfig;
  onEndTest: (events: SecurityEvent[], snapshots: { timestamp: string; dataUrl: string }[], durationSeconds: number) => void;
}

export const KioskScreen: React.FC<KioskScreenProps> = ({ config, onEndTest }) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [snapshots, setSnapshots] = useState<{ timestamp: string; dataUrl: string }[]>([]);
  const [activeToast, setActiveToast] = useState<{ title: string; detail: string; severity: 'warning' | 'critical' } | null>(null);
  const [showEndModal, setShowEndModal] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(true);

  // Webview & Camera Refs
  const webviewRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const lastVisionStatusRef = useRef<string>('CLEAR');

  // Log Security Event helper
  const addSecurityEvent = (
    type: SecurityEventType,
    title: string,
    detail: string,
    severity: 'info' | 'warning' | 'critical' = 'warning',
    flagged: boolean = true
  ) => {
    const now = new Date();
    const isoTimestamp = now.toISOString();
    const displayTimestamp = now.toTimeString().substring(0, 8);

    const newEvent: SecurityEvent = {
      id: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: displayTimestamp,
      rawTimestamp: now.getTime(),
      type,
      title,
      detail,
      severity,
      flagged
    };

    setEvents((prev) => [newEvent, ...prev]);

    if (flagged && severity !== 'info') {
      setActiveToast({ title, detail, severity });
      setTimeout(() => {
        setActiveToast(null);
      }, 4000);
    }
  };

  // 1. Session Timer & Periodic Snapshot Interval
  useEffect(() => {
    // Initial Test Started Log
    addSecurityEvent('TEST_STARTED', 'Kiosk Session Initialized', `Started test for candidate ${config.candidateName} (${config.candidateId})`, 'info', false);

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Auto End test if duration specified and timer reaches 0
  useEffect(() => {
    if (config.durationMinutes > 0) {
      const maxSeconds = config.durationMinutes * 60;
      if (elapsedSeconds >= maxSeconds) {
        addSecurityEvent('TEST_ENDED', 'Time Expired', 'Assessment timer reached 0:00. Auto-submitting session.', 'critical', true);
        handleFinalSubmission();
      }
    }
  }, [elapsedSeconds]);

  // 2. Webcam Initialization, Periodic Snapshots & Camera AI Vision Analysis
  useEffect(() => {
    let snapshotInterval: NodeJS.Timeout | null = null;
    let aiAnalysisInterval: NodeJS.Timeout | null = null;

    if (config.webcamEnabled && videoRef.current) {
      initWebcamStream(videoRef.current).then((stream) => {
        mediaStreamRef.current = stream;

        // Take initial snapshot after 3 seconds
        setTimeout(() => {
          takeSnapshot();
        }, 3000);

        // Periodic snapshots every 30 seconds
        snapshotInterval = setInterval(() => {
          takeSnapshot();
        }, 30000);

        // Camera AI Vision Analysis every 4 seconds
        aiAnalysisInterval = setInterval(async () => {
          if (videoRef.current) {
            const vision = await analyzeWebcamFrame(videoRef.current);
            if (vision.status !== 'CLEAR') {
              // Only flag if status changed or every 12s
              if (lastVisionStatusRef.current !== vision.status) {
                lastVisionStatusRef.current = vision.status;
                const typeMap: Record<string, SecurityEventType> = {
                  'NO_FACE_DETECTED': 'NO_FACE_DETECTED',
                  'MULTIPLE_FACES_DETECTED': 'MULTIPLE_FACES_DETECTED',
                  'PHONE_DETECTED': 'PHONE_DETECTED',
                  'CAMERA_OBSTRUCTED': 'CAMERA_OBSTRUCTED'
                };
                const titleMap: Record<string, string> = {
                  'NO_FACE_DETECTED': 'Candidate Absent / Face Missing',
                  'MULTIPLE_FACES_DETECTED': 'Multiple Persons Detected',
                  'PHONE_DETECTED': 'Mobile Phone / Screen Detected',
                  'CAMERA_OBSTRUCTED': 'Camera Lens Obstructed'
                };

                addSecurityEvent(
                  typeMap[vision.status] || 'NO_FACE_DETECTED',
                  titleMap[vision.status] || 'Camera Security Flag',
                  vision.detail,
                  'critical',
                  true
                );
              }
            } else {
              lastVisionStatusRef.current = 'CLEAR';
            }
          }
        }, 4000);
      });
    }

    return () => {
      if (snapshotInterval) clearInterval(snapshotInterval);
      if (aiAnalysisInterval) clearInterval(aiAnalysisInterval);
      stopWebcamStream(mediaStreamRef.current);
    };
  }, [config.webcamEnabled]);

  const takeSnapshot = () => {
    if (videoRef.current) {
      const dataUrl = captureVideoFrame(videoRef.current);
      if (dataUrl) {
        const timestamp = new Date().toISOString();
        setSnapshots((prev) => [...prev, { timestamp, dataUrl }]);
        addSecurityEvent('WEBCAM_SNAPSHOT', 'Proctoring Snapshot Saved', 'Periodic local webcam frame captured', 'info', false);
        
        if (window.examLockAPI?.saveSnapshot) {
          window.examLockAPI.saveSnapshot(dataUrl);
        }
      }
    }
  };

  // 3. Electron IPC Listeners for Focus Loss, Shortcut Interception, and Display Changes
  useEffect(() => {
    if (!window.examLockAPI) return;

    // Window Blur Listener (Candidate switched app/tab)
    const cleanupBlur = window.examLockAPI.onWindowBlur(() => {
      addSecurityEvent('FOCUS_LOST', 'Window Focus Lost', 'Candidate navigated away or switched applications', 'critical', true);
    });

    // Window Focus Listener
    const cleanupFocus = window.examLockAPI.onWindowFocus(() => {
      addSecurityEvent('FOCUS_REGAINED', 'Window Focus Regained', 'Candidate returned to ExamLock window', 'info', false);
    });

    // Keyboard Shortcut Interception Listener
    const cleanupShortcut = window.examLockAPI.onShortcutAttempt((shortcut) => {
      addSecurityEvent('SHORTCUT_BLOCKED', 'Blocked Shortcut Attempt', `Attempted system shortcut: ${shortcut}`, 'warning', true);
    });

    // Display Monitor Count Listener
    const cleanupDisplay = window.examLockAPI.onDisplayChange((count) => {
      if (count > 1) {
        addSecurityEvent('MULTI_MONITOR_DETECTED', 'Multi-Monitor Detected', `Connected displays changed to ${count}`, 'critical', true);
      }
    });

    return () => {
      cleanupBlur();
      cleanupFocus();
      cleanupShortcut();
      cleanupDisplay();
    };
  }, []);

  // Calculate Flag Count
  const totalFlags = events.filter((e) => e.flagged).length;

  // Format Elapsed / Remaining Time
  const formatTime = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getTimerDisplay = () => {
    if (config.durationMinutes === 0) {
      return { text: formatTime(elapsedSeconds), label: 'ELAPSED', isWarning: false };
    }
    const remaining = Math.max(0, config.durationMinutes * 60 - elapsedSeconds);
    return { text: formatTime(remaining), label: 'REMAINING', isWarning: remaining < 300 };
  };

  const timerInfo = getTimerDisplay();

  const handleFinalSubmission = () => {
    stopWebcamStream(mediaStreamRef.current);
    if (window.examLockAPI?.exitKiosk) {
      window.examLockAPI.exitKiosk();
    }
    onEndTest(events, snapshots, elapsedSeconds);
  };

  return (
    <div className="h-screen w-screen bg-soc-bg text-soc-text flex flex-col font-sans select-none overflow-hidden">
      {/* Top Fixed Security Status Bar */}
      <header className="h-11 bg-soc-header border-b border-soc-border flex items-center justify-between px-4 z-40">
        {/* Left: Candidate Pill & Test Title */}
        <div className="flex items-center space-x-3">
          <div className="w-5 h-5 bg-soc-accent/20 border border-soc-accent flex items-center justify-center rounded-sm">
            <Shield className="w-3 h-3 text-soc-accent" />
          </div>

          <div className="flex items-center space-x-2 font-mono text-xs">
            <span className="bg-soc-panel border border-soc-border px-2 py-0.5 font-semibold text-soc-text">
              ID: {config.candidateId}
            </span>
            <span className="text-soc-muted truncate max-w-[200px] sm:max-w-[300px]">
              {config.testTitle}
            </span>
          </div>
        </div>

        {/* Center: Live Timer & Whitelist Status */}
        <div className="flex items-center space-x-6 font-mono text-xs">
          <div className="flex items-center space-x-2 bg-soc-bg border border-soc-border px-3 py-1">
            <Clock className={`w-3.5 h-3.5 ${timerInfo.isWarning ? 'text-soc-red animate-pulse' : 'text-soc-accent'}`} />
            <span className="text-soc-muted">{timerInfo.label}:</span>
            <span className={`font-bold ${timerInfo.isWarning ? 'text-soc-red' : 'text-soc-text'}`}>
              {timerInfo.text}
            </span>
          </div>

          <div className="hidden md:flex items-center space-x-2 bg-soc-bg border border-soc-border px-3 py-1 text-[11px]">
            <Lock className="w-3 h-3 text-soc-green" />
            <span className="text-soc-muted">DOMAIN LOCK:</span>
            <span className="text-soc-green font-semibold">*.{config.allowedDomain}</span>
          </div>
        </div>

        {/* Right: Live Flag Counter & End Test Action */}
        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-2 border px-2.5 py-1 font-mono text-xs font-semibold ${
            totalFlags > 0 
              ? 'bg-soc-redBg border-soc-red/50 text-soc-red animate-flag-pulse'
              : 'bg-soc-greenBg border-soc-green/30 text-soc-green'
          }`}>
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>FLAGS: {totalFlags}</span>
          </div>

          <button
            onClick={() => setShowEndModal(true)}
            className="bg-soc-red/20 border border-soc-red hover:bg-soc-red hover:text-white text-soc-red px-3 py-1 font-mono text-xs uppercase font-semibold transition-colors cursor-pointer"
          >
            END TEST
          </button>
        </div>
      </header>

      {/* Main Kiosk Content: Embedded Webview + Security Console */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left/Center: Webview Embedded Assessment Frame */}
        <div className="flex-1 bg-soc-bg flex flex-col relative">
          <webview
            ref={webviewRef}
            src={config.testUrl}
            className="w-full h-full border-none"
            partition="persist:examlock_session"
            allowpopups={false}
          />
        </div>

        {/* Right: Collapsible Security Log & Proctor Console */}
        <div className={`${sidePanelOpen ? 'w-80' : 'w-8'} bg-soc-panel border-l border-soc-border flex flex-col transition-all duration-200 z-30`}>
          {/* Panel Toggle Bar */}
          <div className="h-8 bg-soc-header border-b border-soc-border flex items-center justify-between px-2 font-mono text-[11px]">
            {sidePanelOpen && (
              <span className="flex items-center space-x-1.5 text-soc-muted font-semibold uppercase">
                <Terminal className="w-3 h-3 text-soc-accent" />
                <span>Security Console</span>
              </span>
            )}
            <button
              onClick={() => setSidePanelOpen(!sidePanelOpen)}
              className="text-soc-muted hover:text-soc-text p-1 cursor-pointer"
              title={sidePanelOpen ? 'Collapse Log Console' : 'Expand Log Console'}
            >
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${sidePanelOpen ? '' : 'rotate-180'}`} />
            </button>
          </div>

          {sidePanelOpen && (
            <div className="flex-1 flex flex-col p-3 space-y-4 overflow-hidden">
              {/* Optional Webcam Self-View Box */}
              {config.webcamEnabled && (
                <div className="bg-soc-bg border border-soc-border p-2 rounded-sm space-y-1.5">
                  <div className="flex items-center justify-between font-mono text-[10px] text-soc-muted">
                    <span className="flex items-center space-x-1">
                      <Camera className="w-3 h-3 text-soc-green" />
                      <span>PROCTOR CAM</span>
                    </span>
                    <span className="text-soc-green font-semibold">LIVE</span>
                  </div>
                  <div className="relative aspect-video bg-black border border-soc-border overflow-hidden rounded-sm">
                    <video
                      ref={videoRef}
                      muted
                      playsInline
                      className="w-full h-full object-cover transform -scale-x-100"
                    />
                  </div>
                </div>
              )}

              {/* Real-time Monospace Event Log Stream */}
              <div className="flex-1 flex flex-col min-h-0 bg-soc-bg border border-soc-border p-2">
                <div className="flex items-center justify-between font-mono text-[10px] text-soc-muted border-b border-soc-border pb-1 mb-2">
                  <span>AUDIT EVENT STREAM</span>
                  <span>{events.length} LOGS</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 font-mono text-[11px] pr-1">
                  {events.map((evt) => (
                    <div
                      key={evt.id}
                      className={`p-2 border border-soc-border ${
                        evt.severity === 'critical'
                          ? 'bg-soc-redBg/60 text-soc-red border-soc-red/30'
                          : evt.severity === 'warning'
                          ? 'bg-soc-amberBg/60 text-soc-amber border-soc-amber/30'
                          : 'bg-soc-panel text-soc-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] mb-0.5">
                        <span className="font-bold">[{evt.timestamp}]</span>
                        <span className="uppercase text-[9px] px-1 bg-soc-bg border border-current">
                          {evt.type}
                        </span>
                      </div>
                      <p className="font-semibold text-soc-text text-[11px] leading-tight">{evt.title}</p>
                      <p className="text-[10px] text-soc-muted mt-0.5 truncate">{evt.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security Warning Toast Notification */}
      {activeToast && (
        <div className="absolute top-14 left-1/2 transform -translate-x-1/2 z-50 bg-soc-panel border border-soc-amber p-4 shadow-2xl max-w-lg w-full flex items-start space-x-3 animate-bounce">
          <div className="p-2 bg-soc-amberBg border border-soc-amber text-soc-amber">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-mono font-bold uppercase text-soc-amber">
              SECURITY AUDIT ALERT: {activeToast.title}
            </h4>
            <p className="text-xs text-soc-text mt-1">{activeToast.detail}</p>
            <p className="text-[10px] font-mono text-soc-muted mt-1">
              This event has been logged to your proctoring audit trail.
            </p>
          </div>
          <button
            onClick={() => setActiveToast(null)}
            className="text-soc-muted hover:text-soc-text cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* End Test Confirmation Modal */}
      {showEndModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-none z-50 flex items-center justify-center p-4">
          <div className="bg-soc-panel border border-soc-border max-w-md w-full p-6 space-y-5">
            <div className="flex items-center space-x-3 border-b border-soc-border pb-3">
              <div className="p-2 bg-soc-amberBg border border-soc-amber text-soc-amber">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-mono font-bold uppercase text-soc-text">
                  Confirm Assessment Completion
                </h3>
                <p className="text-xs text-soc-muted">Session Termination Verification</p>
              </div>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="bg-soc-bg border border-soc-border p-3 space-y-1">
                <div className="flex justify-between text-soc-muted">
                  <span>TIME ELAPSED:</span>
                  <span className="text-soc-text font-bold">{formatTime(elapsedSeconds)}</span>
                </div>
                <div className="flex justify-between text-soc-muted">
                  <span>TOTAL SECURITY FLAGS:</span>
                  <span className={`font-bold ${totalFlags > 0 ? 'text-soc-red' : 'text-soc-green'}`}>
                    {totalFlags} EVENT(S)
                  </span>
                </div>
              </div>
              <p className="text-soc-muted text-[11px] font-sans">
                Are you sure you want to end this test session? Ending the session will compile your proctoring log report.
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setShowEndModal(false)}
                className="flex-1 py-2 font-mono text-xs uppercase border border-soc-border hover:border-soc-borderHover text-soc-text cursor-pointer"
              >
                RETURN TO TEST
              </button>
              <button
                onClick={handleFinalSubmission}
                className="flex-1 py-2 font-mono text-xs uppercase font-bold bg-soc-red hover:bg-soc-red/90 text-white border border-soc-red cursor-pointer"
              >
                CONFIRM & SUBMIT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
