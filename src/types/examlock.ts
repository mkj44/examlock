export interface ExamConfig {
  candidateName: string;
  candidateId: string;
  testTitle: string;
  testUrl: string;
  allowedDomain: string;
  durationMinutes: number; // 0 for unlimited
  webcamEnabled: boolean;
  allowCopyPaste: boolean;
  consentGiven: boolean;
}

export type SecurityEventType = 
  | 'FOCUS_LOST' 
  | 'FOCUS_REGAINED'
  | 'SHORTCUT_BLOCKED'
  | 'DEVTOOLS_ATTEMPT'
  | 'MULTI_MONITOR_DETECTED'
  | 'NAV_BLOCKED'
  | 'CONTEXT_MENU_BLOCKED'
  | 'CLIPBOARD_ATTEMPT'
  | 'WEBCAM_SNAPSHOT'
  | 'NO_FACE_DETECTED'
  | 'MULTIPLE_FACES_DETECTED'
  | 'PHONE_DETECTED'
  | 'CAMERA_OBSTRUCTED'
  | 'TEST_STARTED'
  | 'TEST_ENDED';

export interface SecurityEvent {
  id: string;
  timestamp: string; // ISO string or HH:mm:ss
  rawTimestamp: number;
  type: SecurityEventType;
  title: string;
  detail: string;
  severity: 'info' | 'warning' | 'critical';
  flagged: boolean;
}

export interface SystemInfo {
  displaysCount: number;
  os: string;
  hostname: string;
  platform: string;
  arch: string;
}

export interface SessionReport {
  sessionId: string;
  candidateName: string;
  candidateId: string;
  testTitle: string;
  testUrl: string;
  allowedDomain: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  totalFlags: number;
  trustScore: number; // 0-100%
  systemInfo: SystemInfo;
  events: SecurityEvent[];
  snapshots: { timestamp: string; dataUrl: string }[];
}

export interface ExamLockAPI {
  startKiosk: (config: ExamConfig) => Promise<{ success: boolean; error?: string }>;
  exitKiosk: () => Promise<{ success: boolean }>;
  getSystemInfo: () => Promise<SystemInfo>;
  logEvent: (event: Omit<SecurityEvent, 'id' | 'timestamp' | 'rawTimestamp'>) => Promise<void>;
  saveSnapshot: (dataUrl: string) => Promise<string>;
  exportReport: (report: SessionReport, format: 'json' | 'pdf') => Promise<{ success: boolean; filePath?: string; error?: string }>;
  onWindowBlur: (callback: () => void) => () => void;
  onWindowFocus: (callback: () => void) => () => void;
  onShortcutAttempt: (callback: (shortcut: string) => void) => () => void;
  onDisplayChange: (callback: (count: number) => void) => () => void;
}

declare global {
  interface Window {
    examLockAPI: ExamLockAPI;
  }
}
