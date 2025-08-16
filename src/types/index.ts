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

export interface TokenData {
  valid: boolean;
  data?: {
    planType: string;
    expires_at: string;
    usage_count: number;
  };
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