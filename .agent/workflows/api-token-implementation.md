---
description: API Token Management Implementation Plan
---

# API Token Management Implementation Plan

This plan outlines the steps to implement a robust API Token management system based on the reference documentation, integrated with the current TypeScript/React architecture.

## Phase 1: Core Token Service Layer

### Step 1.1: Create Token Service Module
**File**: `src/utils/tokenService.ts`

**Tasks**:
- Create TypeScript service with proper types
- Implement token encryption/decryption (upgrade from base64 to more secure method)
- Add storage functions (save, get, remove)
- Create token validation functions with retry logic
- Implement caching mechanism with timestamp tracking

**Key Features**:
- Constants for API endpoints and keys
- `encryptToken()` and `decryptToken()` functions
- `saveToken(token: string): Promise<void>`
- `getToken(): Promise<string | null>`
- `getTokenData(): Promise<TokenData | null>`
- `validateToken(retryCount?: number, reqToken?: string, operation?: string): Promise<ValidationResult>`
- `validateTokenWithCache(token?: string): Promise<ValidationResult>`
- `shouldValidate(): Promise<boolean>`
- `scheduleNextValidation(): void`
- `initializeValidationSchedule(): Promise<void>`

**Types to Define**:
```typescript
interface TokenData {
  valid: boolean;
  planType: 'Free' | 'Pro' | 'Enterprise';
  expires_at: string;
  usage_count: number;
  last_validated: string;
  last_error: ErrorInfo | null;
}

interface ValidationResult {
  valid: boolean;
  data?: any;
  error?: string;
}

interface ErrorInfo {
  message: string;
  timestamp: string;
}
```

### Step 1.2: Update Background Script
**File**: `src/background/index.ts`

**Tasks**:
- Import tokenService functions
- Add `fetchToken` handler (already exists, needs enhancement)
- Store plan type after validation
- Handle token validation requests from UI
- Implement periodic validation check (setInterval)

**Message Handlers to Add/Update**:
- `fetchToken` - validate token with API endpoint
- `validateTokenCache` - use cached validation
- `clearToken` - remove all token-related storage

## Phase 2: UI Components

### Step 2.1: Enhanced Token Settings Component
**File**: `src/settings/components/TokenSettings.tsx` (New file, separate from popup)

**Features to Implement**:
1. **Input Field**: Password-type input with show/hide toggle
2. **Buttons**: 
   - Save Token (validates + saves if valid and unused)
   - Clear Token (with confirmation dialog)
   - Validate Token (manual validation trigger)
3. **Status Display**:
   - Valid/Invalid indicator with color coding
   - Token expiry date and countdown
   - Warning when expiry < 7 days
   - Usage count display
   - Plan type badge (Free/Pro/Enterprise)
4. **Renew Link**: Dynamic link that appears when token is invalid/expired
5. **Loading States**: Show spinner during validation
6. **Error Messages**: Clear user-friendly error messages

**UI States**:
- Loading (validating token)
- Valid (green checkmark, expiry info)
- Invalid (red X, error message, renew link)
- Expired (warning, renew link)
- Empty (prompt to enter token)

### Step 2.2: Update Settings Page Integration
**File**: `src/settings/index.ts`

**Tasks**:
- Import new TokenSettings component
- Add routing for 'api-token' or 'settings' tab
- Initialize token validation on page load
- Update sidebar highlighting based on token status

**File**: `src/settings/settings.html`

**Tasks**:
- Update navigation to include "API Token Settings" (already exists as "API Settings")
- Consider adding visual indicator (badge) on sidebar tab showing token status

## Phase 3: Visual Feedback & Status Indicators

### Step 3.1: Sidebar Status Indicator
**File**: `src/settings/settings.html` + CSS

**Features**:
- Add status badge to "API Settings" navigation item
- Color coding:
  - Green: Valid token
  - Orange: Expiring soon (< 7 days)
  - Red: Invalid/Expired
- Show "Renew Token" link in settings when needed

### Step 3.2: Toast Notifications
**File**: `src/utils/notifications.ts` (if not exists, create)

**Features**:
- Success toast for token saved
- Error toast for validation failures
- Warning toast for expiring tokens
- Auto-dismiss after 3 seconds

## Phase 4: Advanced Features

### Step 4.1: Token Status Dashboard
**File**: `src/settings/components/TokenDashboard.tsx` (Optional)

**Features**:
- Current plan type display with feature list
- Token usage statistics
- Validation history
- Quick actions (renew, validate, clear)

### Step 4.2: Automatic Background Validation
**File**: `src/background/index.ts`

**Tasks**:
- Set up interval check (every 60 seconds) to see if validation is needed
- Use cached data when within validation window
- Update storage with new validation results
- Send notification to UI if token becomes invalid

### Step 4.3: Token Expiry Warnings
**File**: `src/background/index.ts`

**Tasks**:
- Check token expiry on extension startup
- Show browser notification if token expires within 7 days
- Show critical notification if token expired

## Phase 5: Security Enhancements

### Step 5.1: Upgrade Token Encryption
**File**: `src/utils/tokenService.ts`

**Tasks**:
- Replace base64 with Web Crypto API (AES-GCM)
- Generate encryption key using PBKDF2
- Store encrypted token securely
- Never log token values

**Implementation**:
```typescript
async function encryptToken(token: string): Promise<string> {
  // Use Web Crypto API for AES-GCM encryption
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  
  // Generate or retrieve key
  const key = await generateKey();
  
  // Encrypt
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  
  // Combine IV and encrypted data
  return btoa(String.fromCharCode(...iv) + String.fromCharCode(...new Uint8Array(encrypted)));
}
```

### Step 5.2: Add Token Validation Safeguards
**Tasks**:
- Rate limiting on validation attempts
- Prevent token logging in console (production mode)
- Clear token from memory after use
- Validate token format before API call

## Phase 6: Integration with Existing Features

### Step 6.1: Job Matching Integration
**File**: `src/content/applyHandler.ts`

**Tasks**:
- Check token validity before job matching
- Show error if token invalid
- Graceful degradation if token missing

### Step 6.2: AI Provider Integration
**File**: `src/utils/aiService.ts`

**Tasks**:
- Use token data to determine feature availability
- Check plan type for Pro features
- Show upgrade prompts for Free users

### Step 6.3: Applied Jobs Pro Features
**File**: `src/popup/components/AppliedJobs.tsx`

**Tasks**:
- Check plan type from token data
- Show/hide Pro features based on plan
- Display upgrade prompt for Free users

## Phase 7: Testing & Validation

### Step 7.1: Unit Tests
**Files**: `src/utils/__tests__/tokenService.test.ts`

**Test Cases**:
- Token encryption/decryption
- Validation with various responses
- Caching mechanism
- Retry logic
- Error handling

### Step 7.2: Integration Tests
**Test Scenarios**:
- Save token flow
- Validation with API
- Expiry detection
- UI updates on status changes
- Background validation

### Step 7.3: User Acceptance Testing
**Scenarios**:
- First-time token entry
- Token renewal
- Token expiry warning
- Invalid token handling
- Network failure recovery

## Implementation Order

1. **Day 1-2**: Phase 1 (Core Token Service)
2. **Day 3-4**: Phase 2 (UI Components)
3. **Day 5**: Phase 3 (Visual Feedback)
4. **Day 6**: Phase 4 (Advanced Features)
5. **Day 7**: Phase 5 (Security Enhancements)
6. **Day 8**: Phase 6 (Integration)
7. **Day 9-10**: Phase 7 (Testing)

## Migration Strategy

1. **Preserve Existing Data**: Check for existing `apiToken` in storage and migrate
2. **Backward Compatibility**: Support old token format during transition
3. **Gradual Rollout**: Enable new features incrementally
4. **Fallback Mechanism**: Keep old validation as fallback if new system fails

## Key Considerations

### Performance
- Use caching to minimize API calls
- Implement debouncing on manual validation
- Lazy load token validation (only when needed)

### User Experience
- Clear error messages with actionable steps
- Progressive disclosure (show details on demand)
- Visual feedback for all actions
- Smooth transitions and loading states

### Security
- Never expose token in logs or UI (mask display)
- Use HTTPS for all API calls
- Implement token rotation mechanism
- Clear sensitive data on logout/clear

### Monitoring
- Log validation attempts (without token value)
- Track validation success/failure rates
- Monitor API response times
- Alert on repeated failures

## Success Criteria

1. ✅ Token can be saved and validated successfully
2. ✅ Cached validation reduces API calls by 90%+
3. ✅ UI accurately reflects token status in real-time
4. ✅ Token expiry warnings appear 7 days before expiry
5. ✅ Invalid tokens are detected and user is prompted to renew
6. ✅ Plan type is correctly identified and stored
7. ✅ All sensitive data is encrypted at rest
8. ✅ System recovers gracefully from network failures
9. ✅ Users can easily understand token status and take action
10. ✅ Integration with existing features is seamless

## Files to Create/Modify

### New Files
- `src/utils/tokenService.ts` - Core token service
- `src/settings/components/TokenSettings.tsx` - Main token UI
- `src/utils/notifications.ts` - Toast notification system
- `src/utils/__tests__/tokenService.test.ts` - Unit tests
- `src/types/token.ts` - Token-related TypeScript types

### Modified Files
- `src/background/index.ts` - Add token validation handlers
- `src/settings/index.ts` - Add TokenSettings routing
- `src/settings/settings.html` - Update navigation
- `src/popup/components/AppliedJobs.tsx` - Plan-based feature gating
- `src/content/applyHandler.ts` - Token validation before operations
- `src/utils/aiService.ts` - Plan-based feature availability

## Next Steps

1. Review and approve this plan
2. Create detailed technical specifications for each component
3. Set up project tracking (issues/tasks)
4. Begin Phase 1 implementation
5. Conduct code reviews at each phase completion
6. Perform testing before moving to next phase
