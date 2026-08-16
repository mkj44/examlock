# ExamLock — Proctored Kiosk Exam Browser

**ExamLock** is a production-grade, locked-down desktop Safe Exam Browser (SEB) application designed for high-stakes online assessments (HackerRank, aptitude test platforms, coding challenges, or custom assessment links).

It provides a secure, monitored kiosk environment with real-time security proctoring, window switch detection, domain whitelisting, shortcut interception, optional webcam snapshots, and post-session audit reporting.

---

## 🔒 Key Features

### 1. Setup & Consent Control Center
- **Candidate Metadata**: Collect candidate name, ID, assessment title, and target test URL.
- **Auto-Domain Whitelisting**: Automatically parses target URL hostnames (e.g. `hackerrank.com`) and enforces sub-domain lock (`*.hackerrank.com`).
- **System Readiness Audit**: Checks display counts (detecting multi-monitor setups) and camera permissions prior to test start.
- **Privacy & Transparency Consent**: Explicit consent checkboxes detailing monitored parameters (Focus loss, local camera snapshots, clipboard restriction).

### 2. Kiosk & Security Proctoring Mode
- **Fullscreen Lockdown**: Frameless, fullscreen window with `alwaysOnTop` and global keyboard shortcut interception (`Alt+Tab`, `Alt+F4`, `Cmd+Tab`, `F12`, `Ctrl+N/T/W`).
- **Domain Navigation Whitelisting**: Intercepts outward link navigation and popup attempts outside the whitelisted test domain.
- **Focus & Event Detection**: Tracks and logs window blur/focus loss, shortcut attempts, multi-monitor configuration changes, and right-click context menu attempts.
- **Non-Intrusive Alert Toast**: Displays immediate warning notifications to the candidate when a security flag is raised.
- **Webcam Proctoring (Optional)**: Displays a live self-view thumbnail and captures periodic local camera snapshots every 30 seconds.
- **Fixed Top Status Bar**: Shows candidate ID pill, live countdown/elapsed timer, domain lock badge, live flag count badge, and an "End Test" confirmation modal.

### 3. Post-Test Session Report & Export
- **Executive Audit Dashboard**: Duration summary, total flags, and calculated Trust Integrity Score (e.g. `95% High Trust`).
- **Filterable Security Log**: Timeline of all events filterable by type (`ALL`, `FOCUS`, `SHORTCUT`, `SYSTEM`, `WEBCAM`).
- **Webcam Snapshot Gallery**: Local thumbnail gallery of periodic candidate captures.
- **PDF & JSON Export**: One-click generation of formal PDF Proctoring Audit Reports and raw JSON session logs.

---

## 🎨 Design Language (SOC Security Dashboard)

ExamLock intentionally avoids generic AI templates or playful SaaS landing page aesthetics. Instead, it follows an enterprise SOC (Security Operations Center) design language:
- **Color Palette**: Dark enterprise slate (`#0F1115` background, `#14161B` panels, `#242832` borders) with restrained status accents (muted amber `#D9A441`, desaturated blue `#4A7FA7`, warning crimson `#D94A4A`).
- **Typography**: IBM Plex Sans paired with **IBM Plex Mono / monospace typography** for candidate IDs, timestamps, domain locks, and audit streams.
- **Layout**: Information-dense micro-grid with 1px low-contrast borders and subtle 100ms state transitions.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation

```bash
# Clone or navigate to the repository
cd /Users/mayank/gfg_recruit

# Install dependencies
npm install
```

### Running in Development Mode

```bash
# Start Vite React dev server & Electron app
npm run electron:dev
```

### Building & Packaging

```bash
# Build TypeScript and Vite bundles
npm run build

# Package desktop app executable using electron-builder
npm run package
```

Outputs packaged installers for macOS (`.dmg`), Windows (`.exe`), or Linux (`.AppImage`) in the `release/` directory.

---

## 🛠️ Emergency Admin Exit
During an active kiosk test session, administrators can trigger an emergency exit back to the desktop using:
- **Mac**: `Cmd + Shift + Option + E`
- **Windows / Linux**: `Ctrl + Shift + Alt + E`

---

## 🛡️ Security & Privacy Disclosures
- **Local Storage Only**: All security audit logs and webcam snapshots are stored strictly on the candidate's local disk (`appData/ExamLock/sessions`).
- **Zero External Telemetry**: ExamLock does not transmit candidate data or snapshots to third-party tracking servers.
