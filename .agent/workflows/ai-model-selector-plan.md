---
description: AI Model Selector Implementation Plan
---

# AI Model Selector Implementation Plan

## Overview
Enhance the AI Provider Settings to allow users to select from a comprehensive list of available models for each AI provider (Gemini, Claude, OpenAI), with the ability to search or manually input custom model names. Include notices about paid model requirements.

## Current State Analysis

### Existing Structure
- **File**: `src/settings/components/AIProviderSettings.tsx`
- **Current Model Field**: Simple text input (line 99-107)
- **Default Models**:
  - Gemini: `gemma-3-27b-it`
  - Claude: `claude-3-5-sonnet-20241022`
  - OpenAI: `gpt-4o`

### Type Definitions
- **AIProvider Interface** (`src/types/index.ts`):
  ```typescript
  export interface AIProvider {
    id: string;
    name: string;
    enabled: boolean;
    apiKey: string;
    model?: string;
    priority?: number;
  }
  ```

## Implementation Plan

### Phase 1: Create Model Definitions

**File**: `src/constants/aiModels.ts` (NEW)

Create a comprehensive model catalog for all AI providers:

```typescript
export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  isPaid: boolean;
  tier?: 'free' | 'pro' | 'premium';
  contextWindow?: number;
  pricing?: string;
  deprecated?: boolean;
}

export interface ProviderModels {
  [providerId: string]: ModelInfo[];
}
```

**Models to Include**:

1. **Google Gemini**:
   - `gemini-2.0-flash-exp` (Free)
   - `gemini-1.5-pro` (Free/Paid)
   - `gemini-1.5-flash` (Free)
   - `gemini-1.0-pro` (Free)
   - `gemma-3-27b-it` (Free)
   - `gemma-2-9b-it` (Free)
   - `text-embedding-004` (Embeddings)

2. **Anthropic Claude**:
   - `claude-3-5-sonnet-20241022` (Paid)
   - `claude-3-5-haiku-20241022` (Paid)
   - `claude-3-opus-20240229` (Paid)
   - `claude-3-sonnet-20240229` (Paid)
   - `claude-3-haiku-20240307` (Paid)

3. **OpenAI**:
   - `gpt-4o` (Paid)
   - `gpt-4o-mini` (Paid)
   - `gpt-4-turbo` (Paid)
   - `gpt-4` (Paid)
   - `gpt-3.5-turbo` (Paid)
   - `o1-preview` (Paid)
   - `o1-mini` (Paid)

### Phase 2: Create Model Selector Component

**File**: `src/settings/components/ModelSelector.tsx` (NEW)

Create a reusable model selector component with:
- **Searchable dropdown** (combobox pattern)
- **Model filtering** by name/description
- **Custom model input** option
- **Model information display** (tier, pricing, context window)
- **Paid model warning badge**

**Component Features**:
1. Dropdown showing all available models
2. Search/filter functionality
3. "Custom Model" option to manually type model name
4. Display model details on hover/selection
5. Visual indicators for paid models
6. Validation for custom model names

**Props Interface**:
```typescript
interface ModelSelectorProps {
  providerId: string;
  selectedModel: string;
  onModelChange: (model: string) => void;
  disabled?: boolean;
}
```

### Phase 3: Update AIProviderSettings Component

**File**: `src/settings/components/AIProviderSettings.tsx` (MODIFY)

**Changes**:
1. Import the new `ModelSelector` component
2. Replace the simple model input (lines 98-107) with `ModelSelector`
3. Add a global notice about paid models
4. Update styling for better UX

**Specific Updates**:
- **Line 2**: Add import for ModelSelector
- **Lines 98-107**: Replace text input with ModelSelector component
- **After line 122**: Add paid model notice section

### Phase 4: Add Styling

**Updates to Inline Styles** (lines 136-185):
- Add styles for model selector dropdown
- Add styles for search input
- Add styles for model info cards
- Add styles for paid model badges
- Add styles for warning notices

**New CSS Classes Needed**:
- `.model-selector-container`
- `.model-dropdown`
- `.model-option`
- `.model-search`
- `.paid-badge`
- `.model-info`
- `.notice-box`
- `.custom-model-input`

### Phase 5: Add Paid Model Notice

**Location**: After providers list, before actions (around line 123)

**Notice Content**:
```
⚠️ Important Notice About Paid Models

Many AI models listed here require paid subscriptions or API credits:
• Free models are clearly marked and can be used immediately
• Paid models require you to purchase API access directly from the provider
• This extension does not provide or pay for AI API access
• Please ensure you have active API credits before selecting a paid model

For more information about pricing:
• Google Gemini: https://ai.google.dev/pricing
• Anthropic Claude: https://www.anthropic.com/pricing
• OpenAI: https://openai.com/api/pricing
```

### Phase 6: Type Updates

**File**: `src/types/index.ts` (MODIFY)

Add new type for model metadata (if needed for future features):
```typescript
export interface ModelMetadata {
  displayName: string;
  isPaid: boolean;
  tier: string;
  description: string;
}
```

## User Experience Flow

1. **User opens AI Provider Settings**
2. **User enables a provider** (e.g., Claude)
3. **Model field appears** with current selection
4. **User clicks model selector**:
   - Dropdown shows all available models
   - Search bar at top to filter
   - Each model shows:
     - Model name
     - Description
     - Paid/Free badge
     - Context window (if applicable)
5. **User can either**:
   - Select from preset models
   - Choose "Custom Model" and type their own
6. **Paid models show warning icon** next to them
7. **Global notice** reminds about paid model requirements

## Technical Considerations

### 1. State Management
- Keep model selection in existing `settings.providers[x].model` field
- Add local state for search/filter in ModelSelector
- Preserve custom model names when saving

### 2. Validation
- Allow any string as model name (for custom models)
- Warn if unknown model is entered
- Save exactly what user types (no transformation)

### 3. Backward Compatibility
- Existing model values should work as-is
- If saved model not in list, show as "Custom Model"
- Don't break existing settings

### 4. Performance
- Lazy load model info on dropdown open
- Debounce search input
- Memoize filtered results

## Testing Checklist

- [ ] All default models appear in dropdown
- [ ] Search filters models correctly
- [ ] Custom model input works
- [ ] Paid badges show correctly
- [ ] Warning notice is visible
- [ ] Settings save correctly
- [ ] Settings load correctly
- [ ] Unknown models display as custom
- [ ] All three providers work independently
- [ ] Keyboard navigation in dropdown
- [ ] Accessibility (ARIA labels, focus management)

## Files to Create/Modify

### Create:
1. ✅ `src/constants/aiModels.ts` - Model definitions
2. ✅ `src/settings/components/ModelSelector.tsx` - Selector component

### Modify:
3. ✅ `src/settings/components/AIProviderSettings.tsx` - Integrate selector
4. ✅ `src/types/index.ts` - Add model metadata types (optional)

## Optional Enhancements (Future)

- Real-time model availability check via API
- Model performance comparisons
- Cost estimator based on token usage
- Model recommendations based on task
- Recently used models section
- Favorite models feature

## Implementation Priority

### Must Have (P0):
- ✅ Model list constants
- ✅ ModelSelector component with search
- ✅ Custom model input option
- ✅ Paid model indicators
- ✅ Warning notice

### Should Have (P1):
- Model descriptions
- Tier/pricing info
- Keyboard navigation
- Accessibility features

### Nice to Have (P2):
- Model availability check
- Cost estimates
- Performance metrics
- Model recommendations

## Estimated Effort

- **Model definitions**: 30 minutes
- **ModelSelector component**: 2 hours
- **Integration**: 1 hour
- **Styling**: 1 hour
- **Testing**: 1 hour
- **Total**: ~5-6 hours

## Success Criteria

✅ Users can easily find and select models from comprehensive lists
✅ Users can input custom model names not in the list
✅ Paid models are clearly identified
✅ Users are informed about API purchase requirements
✅ The feature works seamlessly with existing settings
✅ All providers have complete model listings
✅ Search/filter works smoothly
✅ Settings persist correctly
