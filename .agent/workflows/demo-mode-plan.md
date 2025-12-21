---
description: Demo Mode & Interactive Walkthrough Implementation Plan
---

# Demo Mode & Interactive Walkthrough Implementation Plan

## Overview
Implement a comprehensive demo/walkthrough system that guides users through the extension on first install and provides persistent help features.

## Core Features
1. **First-Time Installation Demo** - Automatic walkthrough on first install
2. **Extension UI Walkthrough** - Demo on LinkedIn page showing sidebar features
3. **Settings Page Walkthrough** - Step-by-step guide through all settings
4. **Info Modals** - Per-option help with descriptions and videos
5. **YouTube Video Integration** - Embedded player with external link option
6. **Persistent Demo Button** - Always accessible from sidebar
7. **Skip/Dismiss Functionality** - User can exit demo anytime

---

## Architecture & File Structure

### New Files to Create

```
src/
├── components/
│   ├── demo/
│   │   ├── DemoManager.tsx          # Main demo orchestration
│   │   ├── WalkthroughOverlay.tsx   # Spotlight/highlight overlay
│   │   ├── WalkthroughStep.tsx      # Individual step component
│   │   ├── InfoModal.tsx            # Help modal for options
│   │   ├── VideoPlayer.tsx          # YouTube video embed
│   │   └── demo.css                 # Demo styles
│   └── DemoButton.tsx               # Persistent demo trigger
├── services/
│   └── demoService.ts               # Demo state management
├── types/
│   └── demo.ts                      # Demo-related type definitions
└── constants/
    └── demoSteps.ts                 # Walkthrough step configurations
```

---

## Phase 1: Foundation & Types

### 1.1 Create Type Definitions
**File:** `src/types/demo.ts`

```typescript
export interface WalkthroughStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;          // CSS selector for highlight
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: 'click' | 'scroll' | 'wait';
  videoUrl?: string;                // Optional YouTube URL
  nextButtonText?: string;
  skipButtonText?: string;
  highlightPadding?: number;
}

export interface DemoFlow {
  id: 'first-install' | 'sidebar' | 'settings';
  title: string;
  steps: WalkthroughStep[];
  context: 'content' | 'popup' | 'settings';
}

export interface DemoState {
  hasSeenFirstInstall: boolean;
  hasCompletedSidebarDemo: boolean;
  hasCompletedSettingsDemo: boolean;
  currentDemoFlow?: string;
  currentStepIndex: number;
  dismissedInfoModals: string[];
}

export interface OptionInfo {
  optionId: string;
  title: string;
  description: string;
  usage: string;
  bestPractices?: string;
  videoUrl?: string;
  relatedOptions?: string[];
}
```

### 1.2 Create Demo Configuration
**File:** `src/constants/demoSteps.ts`

```typescript
import { DemoFlow, OptionInfo } from '../types/demo';

export const FIRST_INSTALL_DEMO: DemoFlow = {
  id: 'first-install',
  title: 'Welcome to LinkedIn AI Job Applier!',
  context: 'content',
  steps: [
    {
      id: 'welcome',
      title: 'Welcome! 👋',
      description: 'Thanks for installing LinkedIn AI Job Applier. Let\'s take a quick tour of the features.',
      position: 'center',
      nextButtonText: 'Start Tour',
      skipButtonText: 'Skip Tour'
    },
    {
      id: 'sidebar-intro',
      title: 'Your Control Panel',
      description: 'This sidebar gives you quick access to all controls while browsing jobs.',
      targetSelector: '#ai-job-applier-sidebar',
      position: 'left',
      highlightPadding: 10
    },
    // ... more steps
  ]
};

export const SIDEBAR_DEMO: DemoFlow = {
  id: 'sidebar',
  title: 'Sidebar Features',
  context: 'content',
  steps: [
    {
      id: 'start-button',
      title: 'Start Applying',
      description: 'Click here to begin auto-applying to jobs based on your configurations.',
      targetSelector: '[data-demo="start-button"]',
      position: 'right'
    },
    {
      id: 'job-config',
      title: 'Job Configurations',
      description: 'Configure job titles, locations, and types you want to target.',
      targetSelector: '[data-demo="job-config-section"]',
      position: 'right',
      videoUrl: 'https://youtube.com/watch?v=example1'
    },
    // ... more steps
  ]
};

export const SETTINGS_DEMO: DemoFlow = {
  id: 'settings',
  title: 'Settings Walkthrough',
  context: 'settings',
  steps: [
    {
      id: 'api-settings',
      title: 'API Configuration',
      description: 'Configure your AI provider tokens here. You can use multiple providers!',
      targetSelector: '[data-demo="api-settings-tab"]',
      position: 'bottom',
      videoUrl: 'https://youtube.com/watch?v=api-setup'
    },
    {
      id: 'resume-management',
      title: 'Resume Management',
      description: 'Upload and manage your resumes. The AI will use these for job matching.',
      targetSelector: '[data-demo="resume-section"]',
      position: 'bottom'
    },
    // ... more steps
  ]
};

export const OPTION_INFO_MAP: Record<string, OptionInfo> = {
  'ai-provider-selection': {
    optionId: 'ai-provider-selection',
    title: 'AI Provider Selection',
    description: 'Choose which AI provider to use for generating responses.',
    usage: 'Select from available providers like OpenAI, Anthropic, or Google Gemini. Each has different strengths.',
    bestPractices: 'Use multiple providers for fallback. OpenAI is great for general responses, Claude for detailed analysis.',
    videoUrl: 'https://youtube.com/watch?v=ai-providers',
    relatedOptions: ['api-tokens', 'model-selection']
  },
  'company-filter': {
    optionId: 'company-filter',
    title: 'Company Type Filter',
    description: 'Filter jobs by company type (Product vs Service companies).',
    usage: 'Enable this to focus only on product companies or service companies based on your preference.',
    videoUrl: 'https://youtube.com/watch?v=company-filter'
  },
  // ... more options
};
```

---

## Phase 2: Demo Service

### 2.1 Create Demo Service
**File:** `src/services/demoService.ts`

```typescript
import { DemoState, DemoFlow } from '../types/demo';

const STORAGE_KEY = 'demoState';

class DemoService {
  private state: DemoState;

  constructor() {
    this.state = {
      hasSeenFirstInstall: false,
      hasCompletedSidebarDemo: false,
      hasCompletedSettingsDemo: false,
      currentStepIndex: 0,
      dismissedInfoModals: []
    };
  }

  async initialize(): Promise<void> {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    if (stored[STORAGE_KEY]) {
      this.state = stored[STORAGE_KEY];
    }
  }

  async saveState(): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEY]: this.state });
  }

  async shouldShowFirstInstallDemo(): Promise<boolean> {
    await this.initialize();
    return !this.state.hasSeenFirstInstall;
  }

  async markFirstInstallComplete(): Promise<void> {
    this.state.hasSeenFirstInstall = true;
    await this.saveState();
  }

  async startDemo(flowId: DemoFlow['id']): Promise<void> {
    this.state.currentDemoFlow = flowId;
    this.state.currentStepIndex = 0;
    await this.saveState();
  }

  async nextStep(): Promise<void> {
    this.state.currentStepIndex++;
    await this.saveState();
  }

  async skipDemo(): Promise<void> {
    const flowId = this.state.currentDemoFlow;
    this.state.currentDemoFlow = undefined;
    this.state.currentStepIndex = 0;

    // Mark as completed
    if (flowId === 'first-install') {
      this.state.hasSeenFirstInstall = true;
    } else if (flowId === 'sidebar') {
      this.state.hasCompletedSidebarDemo = true;
    } else if (flowId === 'settings') {
      this.state.hasCompletedSettingsDemo = true;
    }

    await this.saveState();
  }

  async dismissInfoModal(optionId: string): Promise<void> {
    if (!this.state.dismissedInfoModals.includes(optionId)) {
      this.state.dismissedInfoModals.push(optionId);
      await this.saveState();
    }
  }

  getState(): DemoState {
    return { ...this.state };
  }
}

export const demoService = new DemoService();
```

---

## Phase 3: UI Components

### 3.1 Walkthrough Overlay Component
**File:** `src/components/demo/WalkthroughOverlay.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import { WalkthroughStep } from '../../types/demo';
import './demo.css';

interface WalkthroughOverlayProps {
  step: WalkthroughStep;
  onNext: () => void;
  onSkip: () => void;
  totalSteps: number;
  currentStep: number;
}

export const WalkthroughOverlay: React.FC<WalkthroughOverlayProps> = ({
  step,
  onNext,
  onSkip,
  totalSteps,
  currentStep
}) => {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (step.targetSelector) {
      const element = document.querySelector(step.targetSelector);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
        
        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [step.targetSelector]);

  const getTooltipPosition = () => {
    if (!targetRect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    const padding = step.highlightPadding || 10;
    
    switch (step.position) {
      case 'top':
        return {
          top: `${targetRect.top - padding - 20}px`,
          left: `${targetRect.left + targetRect.width / 2}px`,
          transform: 'translate(-50%, -100%)'
        };
      case 'bottom':
        return {
          top: `${targetRect.bottom + padding + 20}px`,
          left: `${targetRect.left + targetRect.width / 2}px`,
          transform: 'translate(-50%, 0)'
        };
      case 'left':
        return {
          top: `${targetRect.top + targetRect.height / 2}px`,
          left: `${targetRect.left - padding - 20}px`,
          transform: 'translate(-100%, -50%)'
        };
      case 'right':
        return {
          top: `${targetRect.top + targetRect.height / 2}px`,
          left: `${targetRect.right + padding + 20}px`,
          transform: 'translate(0, -50%)'
        };
      default:
        return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }
  };

  return (
    <div className="walkthrough-overlay">
      {/* Dark backdrop with spotlight */}
      <div className="walkthrough-backdrop">
        {targetRect && (
          <div
            className="walkthrough-spotlight"
            style={{
              top: targetRect.top - (step.highlightPadding || 10),
              left: targetRect.left - (step.highlightPadding || 10),
              width: targetRect.width + (step.highlightPadding || 10) * 2,
              height: targetRect.height + (step.highlightPadding || 10) * 2,
              borderRadius: '8px'
            }}
          />
        )}
      </div>

      {/* Tooltip card */}
      <div className="walkthrough-tooltip" style={getTooltipPosition()}>
        <div className="walkthrough-header">
          <h3>{step.title}</h3>
          <button className="walkthrough-close" onClick={onSkip}>✕</button>
        </div>

        <div className="walkthrough-body">
          <p>{step.description}</p>
          
          {step.videoUrl && (
            <div className="walkthrough-video-preview">
              <a href={step.videoUrl} target="_blank" rel="noopener noreferrer">
                📹 Watch Tutorial Video
              </a>
            </div>
          )}
        </div>

        <div className="walkthrough-footer">
          <div className="walkthrough-progress">
            Step {currentStep + 1} of {totalSteps}
          </div>
          <div className="walkthrough-actions">
            <button className="btn-secondary" onClick={onSkip}>
              {step.skipButtonText || 'Skip Tour'}
            </button>
            <button className="btn-primary" onClick={onNext}>
              {step.nextButtonText || 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

### 3.2 Demo Manager Component
**File:** `src/components/demo/DemoManager.tsx`

```tsx
import React, { useState, useEffect } from 'react';
import { DemoFlow } from '../../types/demo';
import { demoService } from '../../services/demoService';
import { WalkthroughOverlay } from './WalkthroughOverlay';

interface DemoManagerProps {
  flow: DemoFlow;
  onComplete: () => void;
}

export const DemoManager: React.FC<DemoManagerProps> = ({ flow, onComplete }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isActive, setIsActive] = useState(true);

  const currentStep = flow.steps[currentStepIndex];
  const isLastStep = currentStepIndex === flow.steps.length - 1;

  const handleNext = async () => {
    if (isLastStep) {
      await demoService.skipDemo(); // Mark as complete
      setIsActive(false);
      onComplete();
    } else {
      setCurrentStepIndex(prev => prev + 1);
      await demoService.nextStep();
    }
  };

  const handleSkip = async () => {
    await demoService.skipDemo();
    setIsActive(false);
    onComplete();
  };

  if (!isActive || !currentStep) return null;

  return (
    <WalkthroughOverlay
      step={currentStep}
      onNext={handleNext}
      onSkip={handleSkip}
      totalSteps={flow.steps.length}
      currentStep={currentStepIndex}
    />
  );
};
```

### 3.3 Info Modal Component
**File:** `src/components/demo/InfoModal.tsx`

```tsx
import React from 'react';
import { OptionInfo } from '../../types/demo';
import { VideoPlayer } from './VideoPlayer';
import './demo.css';

interface InfoModalProps {
  info: OptionInfo;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ info, onClose }) => {
  return (
    <div className="info-modal-overlay" onClick={onClose}>
      <div className="info-modal-content" onClick={e => e.stopPropagation()}>
        <div className="info-modal-header">
          <h2>{info.title}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="info-modal-body">
          <section className="info-section">
            <h3>Description</h3>
            <p>{info.description}</p>
          </section>

          <section className="info-section">
            <h3>How to Use</h3>
            <p>{info.usage}</p>
          </section>

          {info.bestPractices && (
            <section className="info-section">
              <h3>💡 Best Practices</h3>
              <p>{info.bestPractices}</p>
            </section>
          )}

          {info.videoUrl && (
            <section className="info-section">
              <h3>📹 Tutorial Video</h3>
              <VideoPlayer videoUrl={info.videoUrl} />
            </section>
          )}

          {info.relatedOptions && info.relatedOptions.length > 0 && (
            <section className="info-section">
              <h3>Related Options</h3>
              <ul>
                {info.relatedOptions.map(opt => (
                  <li key={opt}>{opt}</li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="info-modal-footer">
          <button className="btn-primary" onClick={onClose}>Got it!</button>
        </div>
      </div>
    </div>
  );
};
```

### 3.4 Video Player Component
**File:** `src/components/demo/VideoPlayer.tsx`

```tsx
import React, { useState } from 'react';

interface VideoPlayerProps {
  videoUrl: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoUrl }) => {
  const [showEmbed, setShowEmbed] = useState(false);

  // Extract YouTube video ID
  const getYouTubeId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const videoId = getYouTubeId(videoUrl);

  if (!videoId) {
    return (
      <div className="video-player-error">
        <p>Invalid video URL</p>
        <a href={videoUrl} target="_blank" rel="noopener noreferrer">
          Open Link
        </a>
      </div>
    );
  }

  return (
    <div className="video-player-container">
      {!showEmbed ? (
        <div className="video-player-preview">
          <img
            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
            alt="Video thumbnail"
          />
          <button
            className="video-play-button"
            onClick={() => setShowEmbed(true)}
          >
            ▶ Play Video
          </button>
        </div>
      ) : (
        <div className="video-player-embed">
          <iframe
            width="100%"
            height="315"
            src={`https://www.youtube-nocookie.com/embed/${videoId}`}
            title="Tutorial Video"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      <div className="video-player-actions">
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="video-external-link"
        >
          Watch on YouTube →
        </a>
      </div>
    </div>
  );
};
```

### 3.5 Persistent Demo Button
**File:** `src/components/DemoButton.tsx`

```tsx
import React, { useState } from 'react';
import { demoService } from '../services/demoService';

interface DemoButtonProps {
  onStartDemo: () => void;
}

export const DemoButton: React.FC<DemoButtonProps> = ({ onStartDemo }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="demo-button-container">
      <button
        className="demo-trigger-button"
        onClick={() => setIsExpanded(!isExpanded)}
        title="Help & Demo"
      >
        <span className="demo-icon">?</span>
      </button>

      {isExpanded && (
        <div className="demo-menu">
          <div className="demo-menu-header">
            <h4>Help & Tutorials</h4>
            <button onClick={() => setIsExpanded(false)}>✕</button>
          </div>
          <div className="demo-menu-items">
            <button
              className="demo-menu-item"
              onClick={() => {
                onStartDemo();
                setIsExpanded(false);
              }}
            >
              🎬 Start Demo Tour
            </button>
            <a
              href="https://youtube.com/playlist?list=YOUR_PLAYLIST"
              target="_blank"
              rel="noopener noreferrer"
              className="demo-menu-item"
            >
              📚 Video Tutorials
            </a>
            <a
              href="https://your-docs-url.com"
              target="_blank"
              rel="noopener noreferrer"
              className="demo-menu-item"
            >
              📖 Documentation
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
```

---

## Phase 4: Integration

### 4.1 Content Script Integration
**File:** `src/content/index.ts` (additions)

```typescript
import { demoService } from '../services/demoService';
import { DemoManager } from '../components/demo/DemoManager';
import { FIRST_INSTALL_DEMO, SIDEBAR_DEMO } from '../constants/demoSteps';

// On content script load
async function initializeDemo() {
  const shouldShow = await demoService.shouldShowFirstInstallDemo();
  
  if (shouldShow) {
    // Show first install demo
    showDemo(FIRST_INSTALL_DEMO);
  }
}

function showDemo(flow: DemoFlow) {
  const container = document.createElement('div');
  container.id = 'ai-job-applier-demo-root';
  document.body.appendChild(container);

  const root = ReactDOM.createRoot(container);
  root.render(
    <DemoManager
      flow={flow}
      onComplete={() => {
        root.unmount();
        container.remove();
      }}
    />
  );
}

// Add demo button to sidebar
function addDemoButton() {
  const sidebar = document.querySelector('#ai-job-applier-sidebar');
  if (sidebar) {
    const demoContainer = document.createElement('div');
    demoContainer.className = 'sidebar-demo-button';
    
    const root = ReactDOM.createRoot(demoContainer);
    root.render(
      <DemoButton onStartDemo={() => showDemo(SIDEBAR_DEMO)} />
    );
    
    sidebar.appendChild(demoContainer);
  }
}
```

### 4.2 Settings Page Integration
**File:** `src/settings/index.ts` (additions)

```typescript
import { demoService } from '../services/demoService';
import { SETTINGS_DEMO, OPTION_INFO_MAP } from '../constants/demoSteps';
import { InfoModal } from '../components/demo/InfoModal';

// Add info buttons to each setting option
function addInfoButtons() {
  const options = document.querySelectorAll('[data-option-id]');
  
  options.forEach(option => {
    const optionId = option.getAttribute('data-option-id');
    if (!optionId || !OPTION_INFO_MAP[optionId]) return;

    const infoButton = document.createElement('button');
    infoButton.className = 'info-button';
    infoButton.innerHTML = 'ℹ️';
    infoButton.title = 'Learn more';
    
    infoButton.addEventListener('click', () => {
      showInfoModal(optionId);
    });

    option.appendChild(infoButton);
  });
}

function showInfoModal(optionId: string) {
  const info = OPTION_INFO_MAP[optionId];
  if (!info) return;

  const container = document.createElement('div');
  container.id = 'info-modal-root';
  document.body.appendChild(container);

  const root = ReactDOM.createRoot(container);
  root.render(
    <InfoModal
      info={info}
      onClose={() => {
        root.unmount();
        container.remove();
      }}
    />
  );
}

// Check if should show settings demo
async function checkSettingsDemo() {
  const state = demoService.getState();
  
  if (state.hasSeenFirstInstall && !state.hasCompletedSettingsDemo) {
    // Show settings demo after a short delay
    setTimeout(() => {
      showDemo(SETTINGS_DEMO);
    }, 1000);
  }
}
```

### 4.3 Update Manifest Permissions
**File:** `manifest.json`

Ensure you have:
```json
{
  "permissions": [
    "storage"
  ],
  "web_accessible_resources": [
    {
      "resources": ["*.css", "*.js"],
      "matches": ["https://www.linkedin.com/*"]
    }
  ]
}
```

---

## Phase 5: Styling

### 5.1 Demo Styles
**File:** `src/components/demo/demo.css`

```css
/* Walkthrough Overlay */
.walkthrough-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 999999;
  pointer-events: none;
}

.walkthrough-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  pointer-events: all;
}

.walkthrough-spotlight {
  position: absolute;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7);
  border: 2px solid #4A90E2;
  pointer-events: none;
  transition: all 0.3s ease;
  animation: pulse-border 2s infinite;
}

@keyframes pulse-border {
  0%, 100% { border-color: #4A90E2; }
  50% { border-color: #7FB3FF; }
}

.walkthrough-tooltip {
  position: absolute;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  max-width: 400px;
  pointer-events: all;
  z-index: 1000000;
}

.walkthrough-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.walkthrough-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.walkthrough-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.2s;
}

.walkthrough-close:hover {
  background: #f0f0f0;
}

.walkthrough-body {
  padding: 20px;
}

.walkthrough-body p {
  margin: 0 0 15px 0;
  color: #666;
  line-height: 1.6;
}

.walkthrough-video-preview {
  margin-top: 15px;
}

.walkthrough-video-preview a {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #4A90E2;
  text-decoration: none;
  font-weight: 500;
  padding: 8px 12px;
  border-radius: 6px;
  background: #f0f7ff;
  transition: background 0.2s;
}

.walkthrough-video-preview a:hover {
  background: #e0f0ff;
}

.walkthrough-footer {
  padding: 15px 20px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.walkthrough-progress {
  font-size: 14px;
  color: #999;
}

.walkthrough-actions {
  display: flex;
  gap: 10px;
}

.btn-secondary, .btn-primary {
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  font-size: 14px;
}

.btn-secondary {
  background: #f0f0f0;
  color: #666;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.btn-primary {
  background: #4A90E2;
  color: white;
}

.btn-primary:hover {
  background: #3A80D2;
}

/* Info Modal */
.info-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999998;
  backdrop-filter: blur(4px);
}

.info-modal-content {
  background: white;
  border-radius: 16px;
  max-width: 700px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 16px 64px rgba(0, 0, 0, 0.3);
}

.info-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e0e0e0;
  position: sticky;
  top: 0;
  background: white;
  z-index: 1;
}

.info-modal-header h2 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.info-modal-body {
  padding: 24px;
}

.info-section {
  margin-bottom: 24px;
}

.info-section h3 {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 12px 0;
}

.info-section p {
  margin: 0;
  color: #666;
  line-height: 1.6;
}

.info-section ul {
  margin: 8px 0 0 0;
  padding-left: 20px;
  color: #666;
}

.info-modal-footer {
  padding: 20px 24px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: flex-end;
  position: sticky;
  bottom: 0;
  background: white;
}

/* Video Player */
.video-player-container {
  background: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;
}

.video-player-preview {
  position: relative;
  cursor: pointer;
}

.video-player-preview img {
  width: 100%;
  display: block;
}

.video-play-button {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 24px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.video-play-button:hover {
  background: rgba(0, 0, 0, 0.9);
}

.video-player-embed {
  position: relative;
  padding-bottom: 56.25%; /* 16:9 */
  height: 0;
}

.video-player-embed iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.video-player-actions {
  padding: 12px;
  text-align: center;
}

.video-external-link {
  color: #4A90E2;
  text-decoration: none;
  font-weight: 500;
}

.video-external-link:hover {
  text-decoration: underline;
}

/* Demo Button */
.demo-button-container {
  position: relative;
}

.demo-trigger-button {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  font-size: 20px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.demo-trigger-button:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.5);
}

.demo-icon {
  font-style: normal;
}

.demo-menu {
  position: absolute;
  bottom: 50px;
  right: 0;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  min-width: 200px;
  overflow: hidden;
  animation: slideUp 0.2s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.demo-menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
}

.demo-menu-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.demo-menu-header button {
  background: none;
  border: none;
  font-size: 18px;
  color: #999;
  cursor: pointer;
  padding: 0;
}

.demo-menu-items {
  padding: 8px 0;
}

.demo-menu-item {
  display: block;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: none;
  text-align: left;
  color: #333;
  cursor: pointer;
  transition: background 0.2s;
  text-decoration: none;
  font-size: 14px;
}

.demo-menu-item:hover {
  background: #f8f9fa;
}

/* Info Button */
.info-button {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
  padding: 4px;
  margin-left: 8px;
}

.info-button:hover {
  opacity: 1;
}
```

---

## Phase 6: Testing & Refinement

### 6.1 Test Checklist

- [ ] First install demo triggers correctly
- [ ] All walkthrough steps highlight correct elements
- [ ] Tooltips position correctly (top/bottom/left/right/center)
- [ ] Skip functionality works at any step
- [ ] Demo state persists across sessions
- [ ] Info buttons appear on all settings options
- [ ] Info modals display correct content
- [ ] YouTube videos load and play correctly
- [ ] External YouTube links work
- [ ] Demo button is always accessible in sidebar
- [ ] Demo can be restarted from demo button
- [ ] All animations are smooth
- [ ] Mobile/responsive behavior (if applicable)

### 6.2 Edge Cases to Handle

1. **Element Not Found**: Handle gracefully if target element doesn't exist
2. **Z-Index Conflicts**: Ensure demo overlay is always on top
3. **Scrolling**: Auto-scroll to highlighted elements
4. **Multiple Demos**: Prevent multiple demos running simultaneously
5. **Storage Limits**: Keep demo state minimal
6. **Performance**: Lazy load video embeds

---

## Implementation Order

1. **Phase 1**: Set up types and constants (1-2 hours)
2. **Phase 2**: Implement demo service (1 hour)
3. **Phase 3**: Build UI components (3-4 hours)
4. **Phase 4**: Integrate into existing pages (2-3 hours)
5. **Phase 5**: Style and polish (2-3 hours)
6. **Phase 6**: Test and refine (2-3 hours)

**Total Estimated Time**: 11-17 hours

---

## Key Implementation Notes

### Data Attributes for Demo Targeting

Add `data-demo` attributes to key UI elements:

```tsx
// In sidebar component
<button data-demo="start-button" onClick={startApplying}>
  Start Applying
</button>

<div data-demo="job-config-section">
  {/* Job config UI */}
</div>

// In settings page
<div data-demo="api-settings-tab" className="tab">
  API Settings
</div>

// For info buttons
<div data-option-id="ai-provider-selection" className="setting-row">
  {/* Setting content */}
</div>
```

### Message Passing for Cross-Context Demos

Since content scripts and settings pages are separate contexts:

```typescript
// In background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CHECK_DEMO_STATE') {
    demoService.initialize().then(() => {
      sendResponse(demoService.getState());
    });
    return true;
  }
});
```

### Performance Optimization

- Lazy load demo components only when needed
- Use React.lazy() for demo components
- Defer demo check until after main UI renders
- Cache video thumbnails

---

## Future Enhancements

1. **Interactive Demos**: Allow users to try actions during demo
2. **Audio Narration**: Add voiceover explanations
3. **Progress Tracking**: Track which features users have tried
4. **Contextual Help**: Show relevant tips based on user actions
5. **Multi-language Support**: Translate demo content
6. **Analytics**: Track demo completion rates
7. **Custom Paths**: Different demos for different user types
8. **Onboarding Checklist**: Gamify the setup process

---

## Success Metrics

- % of users completing first-install demo
- % of users clicking info buttons
- % of users watching videos
- Feature adoption rate after demo
- User feedback scores
- Support ticket reduction

---

## Documentation Links to Create

1. Create demo step definitions for each feature
2. Record tutorial videos for key features
3. Write option descriptions for info modals
4. Create troubleshooting guide
5. Build FAQ section
