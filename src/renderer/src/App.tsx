import React, { useState } from 'react';
import { ExamConfig, SecurityEvent } from '../../types/examlock';
import { SetupScreen } from './components/SetupScreen';
import { KioskScreen } from './components/KioskScreen';
import { PostTestReport } from './components/PostTestReport';

type ScreenState = 'setup' | 'kiosk' | 'report';

export const App: React.FC = () => {
  const [screen, setScreen] = useState<ScreenState>('setup');
  const [examConfig, setExamConfig] = useState<ExamConfig | null>(null);
  const [sessionEvents, setSessionEvents] = useState<SecurityEvent[]>([]);
  const [sessionSnapshots, setSessionSnapshots] = useState<{ timestamp: string; dataUrl: string }[]>([]);
  const [sessionDurationSeconds, setSessionDurationSeconds] = useState<number>(0);

  const handleStartTest = async (config: ExamConfig) => {
    setExamConfig(config);
    setSessionEvents([]);
    setSessionSnapshots([]);
    setSessionDurationSeconds(0);

    if (window.examLockAPI?.startKiosk) {
      await window.examLockAPI.startKiosk(config);
    }

    setScreen('kiosk');
  };

  const handleEndTest = (
    events: SecurityEvent[],
    snapshots: { timestamp: string; dataUrl: string }[],
    durationSeconds: number
  ) => {
    setSessionEvents(events);
    setSessionSnapshots(snapshots);
    setSessionDurationSeconds(durationSeconds);
    setScreen('report');
  };

  const handleReset = () => {
    setScreen('setup');
    setExamConfig(null);
    setSessionEvents([]);
    setSessionSnapshots([]);
  };

  return (
    <div className="w-full h-full min-h-screen bg-soc-bg text-soc-text font-sans">
      {screen === 'setup' && (
        <SetupScreen onStartTest={handleStartTest} />
      )}

      {screen === 'kiosk' && examConfig && (
        <KioskScreen
          config={examConfig}
          onEndTest={handleEndTest}
        />
      )}

      {screen === 'report' && examConfig && (
        <PostTestReport
          config={examConfig}
          events={sessionEvents}
          snapshots={sessionSnapshots}
          durationSeconds={sessionDurationSeconds}
          onReset={handleReset}
        />
      )}
    </div>
  );
};

export default App;
