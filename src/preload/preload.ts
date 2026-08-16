import { contextBridge, ipcRenderer } from 'electron';
import { ExamConfig, SessionReport, SystemInfo, SecurityEvent } from '../types/examlock';

contextBridge.exposeInMainWorld('examLockAPI', {
  startKiosk: (config: ExamConfig) => ipcRenderer.invoke('start-kiosk', config),
  exitKiosk: () => ipcRenderer.invoke('exit-kiosk'),
  getSystemInfo: (): Promise<SystemInfo> => ipcRenderer.invoke('get-system-info'),
  logEvent: (event: Omit<SecurityEvent, 'id' | 'timestamp' | 'rawTimestamp'>) => ipcRenderer.invoke('log-event', event),
  saveSnapshot: (dataUrl: string) => ipcRenderer.invoke('save-snapshot', dataUrl),
  exportReport: (report: SessionReport, format: 'json' | 'pdf') => ipcRenderer.invoke('export-report', report, format),

  onWindowBlur: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('on-window-blur', handler);
    return () => ipcRenderer.removeListener('on-window-blur', handler);
  },

  onWindowFocus: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('on-window-focus', handler);
    return () => ipcRenderer.removeListener('on-window-focus', handler);
  },

  onShortcutAttempt: (callback: (shortcut: string) => void) => {
    const handler = (_event: any, shortcut: string) => callback(shortcut);
    ipcRenderer.on('on-shortcut-attempt', handler);
    ipcRenderer.on('on-emergency-exit', () => callback('Emergency Admin Exit'));
    return () => {
      ipcRenderer.removeListener('on-shortcut-attempt', handler);
    };
  },

  onDisplayChange: (callback: (count: number) => void) => {
    const handler = (_event: any, count: number) => callback(count);
    ipcRenderer.on('on-display-change', handler);
    return () => ipcRenderer.removeListener('on-display-change', handler);
  },
});
