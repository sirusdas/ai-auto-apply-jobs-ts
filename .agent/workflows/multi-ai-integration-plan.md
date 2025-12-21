---
description: Multi-AI Provider Integration Plan
---

# Multi-AI Provider Integration Plan

## Overview
This plan outlines the changes needed to integrate multiple AI providers (Claude, ChatGPT, etc.) alongside the existing Gemini integration, with options to enable/disable specific APIs.

---

## 1. Type Definitions & Models (`src/types/index.ts`)

### Changes Required:
**Add new interfaces for AI configuration**

```typescript
export interface AIProvider {
  id: string; // 'gemini' | 'claude' | 'chatgpt' | 'openai'
  name: string; // Display name
  enabled: boolean;
  apiKey: string;
  model?: string; // Optional model selection
  priority?: number; // For fallback ordering
}

export interface AISettings {
  providers: AIProvider[];
  primaryProvider: string; // ID of primary AI provider
  enableFallback: boolean; // Use other providers if primary fails
  timeout?: number; // Per-request timeout in ms
}

export interface AIRequest {
  provider: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIResponse {
  provider: string;
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: string;
}
```

---

## 2. AI Service Abstraction Layer (`src/utils/aiService.ts` - NEW FILE)

### Purpose:
Create a unified interface for all AI providers with provider-specific implementations.

### Structure:
```typescript
// Base AI Provider Interface
interface IAIProvider {
  id: string;
  name: string;
  sendRequest(prompt: string, options?: any): Promise<AIResponse>;
  validateApiKey(apiKey: string): Promise<boolean>;
}

// Implementations needed:
- GeminiProvider
- ClaudeProvider (Anthropic)
- ChatGPTProvider (OpenAI)
- OpenAIProvider (for other OpenAI models)

// Main AI Service
class AIService {
  - getProvider(providerId: string): IAIProvider
  - sendRequest(prompt: string, providerId?: string): Promise<AIResponse>
  - sendRequestWithFallback(prompt: string): Promise<AIResponse>
  - testConnection(providerId: string): Promise<boolean>
}
```

### Key Functions:
- Provider selection based on settings
- Automatic fallback if primary provider fails
- Unified error handling
- Request/response standardization

---

## 3. Settings UI Components

### 3.1. New Component: `src/settings/components/AIProviderSettings.tsx`

**Purpose:** Manage multiple AI providers with enable/disable toggles

**Features:**
- List of all available AI providers
- Enable/disable toggle for each provider
- API key input field (masked)
- Model selection dropdown (if applicable)
- "Set as Primary" button
- Test connection button
- Priority ordering (drag-and-drop or up/down buttons)

**UI Structure:**
```
AI Provider Settings
├── Primary Provider Selection
├── Provider Cards (repeatable)
│   ├── Provider Name & Logo/Icon
│   ├── Enable/Disable Toggle
│   ├── API Key Input (with show/hide)
│   ├── Model Selection Dropdown
│   ├── Test Connection Button
│   ├── Set as Primary Button
│   └── Priority Badge/Indicator
├── Fallback Settings
│   ├── Enable Auto-Fallback Toggle
│   └── Timeout Configuration
└── Save All Settings Button
```

### 3.2. Update: `src/settings/components/AccessTokenSettings.tsx`

**Changes:**
- Rename to `GeminiSettings.tsx` OR
- Keep as is but clarify it's specifically for Gemini
- Move to `AIProviderSettings.tsx` as a sub-component

### 3.3. Update: `src/settings/index.ts`

**Changes:**
```typescript
// Add new case in renderComponent
case 'ai-providers':
  componentElement = React.createElement(AIProviderSettings, {});
  break;

// Update gemini case to route to new AI settings
case 'gemini':
  // Keep for backward compatibility OR redirect to ai-providers
  componentElement = React.createElement(AIProviderSettings, { defaultTab: 'gemini' });
  break;
```

### 3.4. Update: `src/settings/settings.html`

**Changes:**
```html
<!-- Update navigation tabs -->
<li><button data-tab="ai-providers">AI Providers</button></li>

<!-- OR keep separate if needed -->
<li><button data-tab="gemini">Gemini API</button></li>
<li><button data-tab="claude">Claude API</button></li>
<li><button data-tab="chatgpt">ChatGPT API</button></li>
```

---

## 4. Background Service Updates (`src/background/index.ts`)

### Changes Required:

#### 4.1. Replace hardcoded Gemini calls
**Current locations:**
- Line 100-120: `handleCompanyFiltering`
- Line 124-191: `handleJobMatch`
- Line 336-411: `handleQuestionAnswering`

**New approach:**
```typescript
import { AIService } from '../utils/aiService';

const aiService = new AIService();

async function handleJobMatch(jobDetails: any, resume: string) {
  // Get AI settings from storage
  const settings = await chrome.storage.local.get(['aiSettings']);
  
  const prompt = `...`; // Existing prompt
  
  try {
    const response = await aiService.sendRequestWithFallback(prompt);
    return JSON.parse(response.content);
  } catch (error) {
    throw new Error(`AI request failed: ${error.message}`);
  }
}
```

#### 4.2. Add new message handlers
```typescript
if (request.action === 'testAIConnection') {
  const { providerId, apiKey } = request;
  // Test connection logic
}

if (request.action === 'getAISettings') {
  // Return current AI settings
}

if (request.action === 'saveAISettings') {
  const { aiSettings } = request;
  // Validate and save settings
}
```

---

## 5. Content Script Updates (`src/content/applyHandler.ts`)

### Changes Required:

#### 5.1. Update `fetchAIAnswers` function (Line 356-381)
**Current:**
```typescript
const tokenRes = await chrome.storage.local.get(['accessToken', ...]);
chrome.runtime.sendMessage({ action: 'answerJobQuestions', accessToken: tokenRes.accessToken });
```

**Updated:**
```typescript
const settings = await chrome.storage.local.get(['aiSettings', 'compressedResumeYAML', 'plainTextResume']);

chrome.runtime.sendMessage({
  action: 'answerJobQuestions',
  inputs: questions.inputs,
  radios: questions.radios,
  dropdowns: questions.dropdowns,
  checkboxes: questions.checkboxes,
  resume: settings.compressedResumeYAML || settings.plainTextResume || "",
  aiSettings: settings.aiSettings // Pass entire AI settings
}, (res) => {
  // Handle response
});
```

#### 5.2. No major structural changes needed
- The content script delegates AI work to background script
- Background script handles provider selection and fallback

---

## 6. Resume Management Updates (`src/popup/components/ResumeManagement.tsx`)

### Changes Required:

#### Update `handleGenerateResume` function (Line 23-167)

**Current logic:**
```typescript
if (planType.toLowerCase() === 'pro') {
  // Use custom AI API
} else {
  // Use Gemini API
}
```

**Updated logic:**
```typescript
// Get AI settings instead of checking plan type
const aiSettings = await chrome.storage.local.get(['aiSettings']);

if (!aiSettings.aiSettings || !aiSettings.aiSettings.providers.some(p => p.enabled)) {
  setStatus({ type: 'error', message: 'No AI provider enabled. Please configure AI settings.' });
  return;
}

// Use AI service
const response = await chrome.runtime.sendMessage({
  action: 'generateResume',
  prompt: prompt,
  aiSettings: aiSettings.aiSettings
});
```

**Alternative:** Keep Pro API as a separate provider

---

## 7. Storage Schema Migration

### New Storage Keys:
```typescript
aiSettings: {
  providers: [
    {
      id: 'gemini',
      name: 'Google Gemini',
      enabled: true,
      apiKey: 'existing_accessToken_value',
      model: 'gemma-3-27b-it',
      priority: 1
    },
    {
      id: 'claude',
      name: 'Anthropic Claude',
      enabled: false,
      apiKey: '',
      model: 'claude-3-5-sonnet-20241022',
      priority: 2
    },
    {
      id: 'chatgpt',
      name: 'OpenAI ChatGPT',
      enabled: false,
      apiKey: '',
      model: 'gpt-4o',
      priority: 3
    }
  ],
  primaryProvider: 'gemini',
  enableFallback: true,
  timeout: 30000
}
```

### Migration Function (`src/utils/migration.ts` - NEW FILE):
```typescript
async function migrateToMultiAI() {
  const existing = await chrome.storage.local.get(['accessToken']);
  
  if (existing.accessToken && !existing.aiSettings) {
    // Migrate existing Gemini token to new structure
    await chrome.storage.local.set({
      aiSettings: {
        providers: [{
          id: 'gemini',
          name: 'Google Gemini',
          enabled: true,
          apiKey: existing.accessToken,
          model: 'gemma-3-27b-it',
          priority: 1
        }],
        primaryProvider: 'gemini',
        enableFallback: false,
        timeout: 30000
      }
    });
  }
}

// Call in background/index.ts on extension startup
```

---

## 8. API Provider Implementations

### 8.1. Gemini Provider (`src/utils/providers/geminiProvider.ts`)
- Move existing Gemini logic here
- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}`
- Models: `gemma-3-27b-it`, `gemini-1.5-pro`, etc.

### 8.2. Claude Provider (`src/utils/providers/claudeProvider.ts`)
- Endpoint: `https://api.anthropic.com/v1/messages`
- Headers: `x-api-key`, `anthropic-version: 2023-06-01`
- Models: `claude-3-5-sonnet-20241022`, `claude-3-opus-20240229`, etc.

### 8.3. ChatGPT/OpenAI Provider (`src/utils/providers/openaiProvider.ts`)
- Endpoint: `https://api.openai.com/v1/chat/completions`
- Headers: `Authorization: Bearer {apiKey}`
- Models: `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo`, etc.

---

## 9. Error Handling & Fallback Logic

### Priority:
1. Try primary provider
2. If fails and fallback enabled:
   - Try next enabled provider by priority
   - Continue until success or all fail
3. Log all attempts
4. Return error if all providers fail

### Error Types:
- API key invalid
- Rate limit exceeded
- Timeout
- Network error
- Invalid response format

### User Notifications:
- Show which provider was used
- Alert if fallback was triggered
- Display clear error messages

---

## 10. Testing Checklist

### Unit Tests:
- [ ] AI Service provider selection
- [ ] Fallback logic
- [ ] Response parsing for each provider
- [ ] API key validation

### Integration Tests:
- [ ] End-to-end application flow with different providers
- [ ] Provider switching mid-session
- [ ] Fallback during actual job application

### UI Tests:
- [ ] Enable/disable providers
- [ ] API key save and retrieve
- [ ] Primary provider selection
- [ ] Test connection functionality

---

## 11. Documentation Updates

### User Documentation:
- How to get API keys for each provider
- How to configure providers
- Understanding fallback behavior
- Cost comparison (if applicable)

### Developer Documentation:
- Adding new AI providers
- AI Service architecture
- Provider interface contract

---

## 12. Backwards Compatibility

### Considerations:
- Existing users have `accessToken` in storage
- Migration should be automatic on extension update
- Old settings UI should redirect to new AI settings
- No data loss during migration

---

## 13. Optional Enhancements

### Future Features:
1. **Token Usage Tracking**
   - Track API calls per provider
   - Display usage statistics
   - Budget alerts

2. **Provider-Specific Settings**
   - Temperature, max tokens, etc.
   - System prompts per provider
   - Response caching

3. **Hybrid Mode**
   - Use different providers for different tasks
   - E.g., Claude for resumes, GPT for form filling

4. **Local AI Support**
   - Ollama integration
   - LM Studio integration

---

## 14. Implementation Order

### Phase 1: Foundation (Critical)
1. Create type definitions
2. Create AI Service abstraction layer
3. Implement provider classes (Gemini, Claude, OpenAI)
4. Add migration logic

### Phase 2: UI (High Priority)
5. Create AIProviderSettings component
6. Update settings navigation
7. Update background message handlers

### Phase 3: Integration (High Priority)
8. Update background/index.ts AI calls
9. Update content/applyHandler.ts
10. Update ResumeManagement.tsx

### Phase 4: Testing & Polish (Medium Priority)
11. Add error handling
12. Add validation
13. Test all providers
14. Update documentation

### Phase 5: Enhancements (Low Priority)
15. Usage tracking
16. Advanced settings
17. Provider-specific optimizations

---

## 15. File Changes Summary

### New Files:
- `src/types/index.ts` - Add AI interfaces
- `src/utils/aiService.ts` - AI service abstraction
- `src/utils/providers/geminiProvider.ts`
- `src/utils/providers/claudeProvider.ts`
- `src/utils/providers/openaiProvider.ts`
- `src/utils/migration.ts` - Storage migration
- `src/settings/components/AIProviderSettings.tsx`

### Modified Files:
- `src/background/index.ts` - Replace Gemini calls with AI service
- `src/content/applyHandler.ts` - Update AI request handling
- `src/popup/components/ResumeManagement.tsx` - Use AI service
- `src/settings/index.ts` - Add new tab routing
- `src/settings/settings.html` - Add AI providers tab
- `src/types/index.ts` - Add AI types

### Optional Changes:
- `src/settings/components/AccessTokenSettings.tsx` - Deprecate or repurpose
- `package.json` - Add any new dependencies

---

## 16. Dependencies

### No new npm packages required for basic implementation
All AI providers can be accessed via fetch API.

### Optional:
- TypeScript AI SDK packages for better type safety
- Rate limiting library
- Request retry library

---

## 17. Security Considerations

1. **API Key Storage**
   - Encrypt API keys in storage
   - Never log API keys
   - Clear API keys on extension uninstall

2. **Request Validation**
   - Validate all user inputs
   - Sanitize prompts
   - Prevent prompt injection

3. **Rate Limiting**
   - Implement client-side rate limiting
   - Respect provider rate limits
   - Add cooldown periods

---

## End of Plan
