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
            description: 'This button is your main control. Click it to start or configure the auto-apply process.',
            targetSelector: '#auto-apply-main-button',
            position: 'left',
            highlightPadding: 10
        },
        {
            id: 'help-center',
            title: 'Help Center',
            description: 'Have questions? Access tutorials, documentation, and support right here whenever you need it.',
            targetSelector: '#ai-job-applier-demo-button-root',
            position: 'left',
            highlightPadding: 5
        }
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
            targetSelector: '#auto-apply-main-button',
            position: 'left'
        },
        {
            id: 'help-button',
            title: 'Need Help?',
            description: 'This menu provides quick access to demos, tutorials, and documentation at any time.',
            targetSelector: '#ai-job-applier-demo-button-root',
            position: 'left'
        }
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
            description: 'Configure your primary AI provider tokens here. You can see the validity status via the green/red dot.',
            targetSelector: '[data-demo="api-settings-tab"]',
            position: 'right',
             videoUrl: ''
        },
        {
            id: 'ai-providers',
            title: 'AI Providers',
            description: 'Manage multiple AI providers (Gemini, Claude, OpenAI) and set their priority for fallback.',
            targetSelector: '[data-demo="ai-providers-tab"]',
            position: 'right'
        },
        {
            id: 'personal-info',
            title: 'Personal Information',
            description: 'Fill in your details like phone, email, and social links that AI will use to fill applications.',
            targetSelector: '[data-demo="personal-info-tab"]',
            position: 'right'
        },
        {
            id: 'resume-tab',
            title: 'Resume & Match',
            description: 'Manage your resumes and configure how AI matches you to jobs here.',
            targetSelector: '[data-demo="resume-tab"]',
            position: 'right'
        },
        {
            id: 'job-match',
            title: 'Job Match Settings',
            description: 'Set your minimum match score and other criteria for automatic application.',
            targetSelector: '[data-demo="job-match-tab"]',
            position: 'right'
        },
        {
            id: 'company-preferences',
            title: 'Company Preferences',
            description: 'Choose to apply only to product or service companies, or ignore specific companies.',
            targetSelector: '[data-demo="company-preferences-tab"]',
            position: 'right'
        },
        {
            id: 'delay-tab',
            title: 'Wait & Delay Settings',
            description: 'Configure random delays to make the automation look more human and avoid detection.',
            targetSelector: '[data-demo="delay-tab"]',
            position: 'right'
        },
        {
            id: 'applied-jobs',
            title: 'Application History',
            description: 'View all jobs you have applied to, including the status and AI responses.',
            targetSelector: '[data-demo="applied-jobs-tab"]',
            position: 'right'
        },
        {
            id: 'search-timer',
            title: 'Automation Timers',
            description: 'Set how long the extension should run for specific job searches.',
            targetSelector: '[data-demo="search-timer-tab"]',
            position: 'right'
        }
    ]
};

export const OPTION_INFO_MAP: Record<string, OptionInfo> = {
    'api-tokens': {
        optionId: 'api-tokens',
        title: 'API Tokens',
        description: 'Enter your API token to enable job matching and resume analysis.',
        usage: 'Get a token from qerds.com, paste it here, and click "Save & Validate".',
        bestPractices: 'Keep your token secure. Each token has an expiry date and a usage limit.',
         videoUrl: ''
    },
    'ai-provider-selection': {
        optionId: 'ai-provider-selection',
        title: 'AI Provider Selection',
        description: 'Choose which AI provider (Gemini, Claude, OpenAI) to use for generating responses.',
        usage: 'Enable the providers you want to use and set their priority. The extension will automatically fallback if one fails.',
        bestPractices: 'Use Gemini for cost-effectiveness and OpenAI/Claude for high-quality complex forms.',
         videoUrl: '',
        relatedOptions: ['api-tokens', 'model-selection']
    },
    'personal-info': {
        optionId: 'personal-info',
        title: 'Personal Information',
        description: 'Store your personal details that will be used to fill application forms.',
        usage: 'Enter your name, contact info, and basic details. These are used as fallbacks when AI cannot determine a value.',
        bestPractices: '',
         videoUrl: ''
    },
    'resume-management': {
        optionId: 'resume-management',
        title: 'Resume Management',
        description: 'Upload and manage your resumes for AI-driven applications.',
        usage: 'Paste your full resume text or generate a compressed YAML profile. The AI uses this for job matching and form filling.',
        bestPractices: 'The Compressed YAML format is highly recommended for faster AI processing.',
         videoUrl: ''
    },
    'job-match': {
        optionId: 'job-match',
        title: 'Job Match Settings',
        description: 'Configure how the AI should filter jobs based on your profile.',
        usage: 'Set a minimum match score (1-5). Jobs below this score will be skipped automatically.',
        bestPractices: 'A score of 3 is usually a good balance between quality and volume.',
         videoUrl: ''
    },
    'company-filter': {
        optionId: 'company-filter',
        title: 'Company Type Filter',
        description: 'Filter jobs by company type (Product vs Service companies).',
        usage: 'Enable or disable application to specific company types. This helps focus your search.',
         videoUrl: ''
    },
    'delays': {
        optionId: 'delays',
        title: 'Wait & Delay Settings',
        description: 'Configure human-like delays between automation steps.',
        usage: 'Set very short, short, and long delays in milliseconds. Random variation is added automatically.',
        bestPractices: 'Setting delays too short might trigger anti-bot measures. Default values are recommended.',
         videoUrl: ''
    },
    'applied-jobs': {
        optionId: 'applied-jobs',
        title: 'Applied Jobs History',
        description: 'Track and analyze your job application history.',
        usage: 'View a list of all jobs applied. Pro users get advanced analytics and charts.',
         videoUrl: ''
    },
    'search-timer': {
        optionId: 'search-timer',
        title: 'Search Automation Timers',
        description: 'Automate multiple job title searches with specific time limits. Elements are processed in a hierarchy: Workplace Type > Job Type > Locations.',
        usage: 'Configure your target keywords and locations. If locations are present, Workplace and Job Type timers are automatically calculated as the sum of their children (locations). The extension iterates through each Workplace, then each Job Type, and finally each Location.',
        bestPractices: 'Use the "Run in Loop" option for 24/7 background application. Example: Searching Onsite + Remote for Full-time in London and Manchester will create 4 search segments (Onsite Full-time London, Onsite Full-time Manchester, etc.).',
         videoUrl: ''
    },
    'gemini-help': {
        optionId: 'gemini-help',
        title: 'How to get Google Gemini API Key',
        description: 'Google Gemini provides a free tier for developers. You can get an API key from Google AI Studio.',
        usage: 'Visit Google AI Studio (aistudio.google.com), click "Get API key", and create a new key. Link: https://aistudio.google.com/app/apikey',
        bestPractices: 'Choose a model like gemini-2.0-flash-exp for fast and reliable job matching.',
        videoUrl: 'https://www.youtube.com/watch?v=JomWSwhwThg'
    },
    'claude-help': {
        optionId: 'claude-help',
        title: 'How to get Anthropic Claude API Key',
        description: 'Anthropic Claude is known for high-quality responses. You need an account on Anthropic Console.',
        usage: 'Log in to console.anthropic.com, go to Settings > API Keys, and click "Create Key". Link: https://console.anthropic.com/settings/keys',
        bestPractices: 'Ensure you have added credits to your account as Claude does not have a free API tier.',
        videoUrl: 'https://www.youtube.com/watch?v=vgncj7MJbVU'
    },
    'openai-help': {
        optionId: 'openai-help',
        title: 'How to get OpenAI ChatGPT API Key',
        description: 'OpenAI offers various models like GPT-4o. You need to create a secret key in your OpenAI dashboard.',
        usage: 'Log in to platform.openai.com, navigate to API Keys in the sidebar, and click "Create new secret key". Link: https://platform.openai.com/api-keys',
        bestPractices: 'Set usage limits in your billing settings to control costs.',
        videoUrl: 'https://www.youtube.com/watch?v=OB99E7Y1cMA'
    }
};
