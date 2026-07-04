export interface JobConfig {
  jobTitleName: string;
  jobConfigTimer: string;
  locations: Array<{
    locationName: string;
    locationTimer: string;
  }>;
  jobTypes: Array<{
    jobTypeName: string;
    jobTypeTimer: string;
  }>;
  sequence: number;
}

export interface PersonalInfo {
  YearsOfExperience: string;
  FirstName: string;
  LastName: string;
  PhoneNumber: string;
  City: string;
  Email: string;
}

export interface ErrorInfo {
  message: string;
  timestamp: string;
}

export interface TokenData {
  valid: boolean;
  planType: string;
  expires_at: string;
  usage_count: number;
  last_validated: string;
  last_error: ErrorInfo | null;
  error?: string; // For backward compatibility or immediate errors
}

export interface ValidationResult {
  valid: boolean;
  data?: any;
  error?: string;
}

export interface AppliedJob {
  jobTitle: string;
  company: string;
  location: string;
  appliedDate: string;
}

export interface InputFieldConfig {
  placeholderIncludes: string;
  defaultValue: string;
  count: number;
}

export interface AIProvider {
  id: string; // 'gemini' | 'claude' | 'openai' | custom ids
  name: string; // Display name
  enabled: boolean;
  apiKey: string;
  model?: string; // Optional model selection
  priority?: number; // For fallback ordering
  baseUrl?: string; // Custom endpoint URL
  isCustom?: boolean; // Flag for custom providers
  customModel?: string; // Allow manual typing of model if refresh fails
}

export interface AISettings {
  providers: AIProvider[];
  primaryProvider: string; // ID of primary AI provider
  enableFallback: boolean; // Use other providers if primary fails
  timeout?: number; // Per-request timeout in ms
  maxRetries?: number; // Maximum number of retries before action
  pauseAfterRetries?: boolean; // Pause instead of stopping
  pauseDuration?: number; // Duration to pause in minutes
  tryOtherFreeModels?: boolean; // Try other free models if limit hit
  
  // JD Compression Settings
  enableJdCompression?: boolean;
  jdCompressionMethod?: 'regex' | 'local_ai' | 'cheap_api';
  jdCompressionProviderId?: string; // Which provider to use if cheap_api is selected
}

export interface AIRequest {
  provider?: string;
  systemPrompt?: string;
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

export interface RadioButtonConfig {
  placeholderIncludes: string;
  defaultValue: string;
  count: number;
  options: Array<{
    value: string;
    text: string;
    selected: boolean;
  }>;
}

export interface DropdownConfig {
  placeholderIncludes: string;
  value: string;
  options: Array<{
    value: string;
    text: string;
    selected: boolean;
  }>;
  count: number;
}