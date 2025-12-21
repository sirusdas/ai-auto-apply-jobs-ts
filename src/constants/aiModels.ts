export interface ModelInfo {
    id: string;
    name: string;
    description: string;
    isPaid: boolean;
    tier?: 'free' | 'pro' | 'premium';
    contextWindow?: string;
    pricing?: string;
}

export const AI_MODELS: Record<string, ModelInfo[]> = {
    gemini: [
        {
            id: 'gemini-2.0-flash-exp',
            name: 'Gemini 2.0 Flash (Experimental)',
            description: 'Latest experimental model, fast and capable.',
            isPaid: false,
            tier: 'free',
            contextWindow: '1M tokens'
        },
        {
            id: 'gemini-1.5-pro',
            name: 'Gemini 1.5 Pro',
            description: 'Most capable model for complex reasoning and tasks.',
            isPaid: false,
            tier: 'free',
            contextWindow: '2M tokens'
        },
        {
            id: 'gemini-1.5-flash',
            name: 'Gemini 1.5 Flash',
            description: 'Fast and cost-efficient for high-volume tasks.',
            isPaid: false,
            tier: 'free',
            contextWindow: '1M tokens'
        },
        {
            id: 'gemini-1.0-pro',
            name: 'Gemini 1.0 Pro',
            description: 'Balanced performance for general-purpose tasks.',
            isPaid: false,
            tier: 'free',
            contextWindow: '32k tokens'
        },
        {
            id: 'gemma-3-27b-it',
            name: 'Gemma 3 27B IT',
            description: 'Open-source lightweight model from Google.',
            isPaid: false,
            tier: 'free',
            contextWindow: '8k tokens'
        },
        {
            id: 'gemma-2-9b-it',
            name: 'Gemma 2 9B IT',
            description: 'Smaller, faster open-source model.',
            isPaid: false,
            tier: 'free',
            contextWindow: '8k tokens'
        }
    ],
    claude: [
        {
            id: 'claude-3-5-sonnet-20241022',
            name: 'Claude 3.5 Sonnet',
            description: 'Latest Sonnet model, high intelligence and speed.',
            isPaid: true,
            tier: 'premium',
            contextWindow: '200k tokens',
            pricing: '$3/$15 per M tokens'
        },
        {
            id: 'claude-3-5-haiku-20241022',
            name: 'Claude 3.5 Haiku',
            description: 'Fastest and most cost-effective Claude model.',
            isPaid: true,
            tier: 'premium',
            contextWindow: '200k tokens',
            pricing: '$0.25/$1.25 per M tokens'
        },
        {
            id: 'claude-3-opus-20240229',
            name: 'Claude 3 Opus',
            description: 'Most powerful model for highly complex tasks.',
            isPaid: true,
            tier: 'premium',
            contextWindow: '200k tokens',
            pricing: '$15/$75 per M tokens'
        },
        {
            id: 'claude-3-sonnet-20240229',
            name: 'Claude 3 Sonnet (Legacy)',
            description: 'Balanced performance and speed.',
            isPaid: true,
            tier: 'premium',
            contextWindow: '200k tokens'
        },
        {
            id: 'claude-3-haiku-20240307',
            name: 'Claude 3 Haiku (Legacy)',
            description: 'Fast and efficient.',
            isPaid: true,
            tier: 'premium',
            contextWindow: '200k tokens'
        }
    ],
    openai: [
        {
            id: 'gpt-4o',
            name: 'GPT-4o',
            description: 'Most advanced multimodal flagship model.',
            isPaid: true,
            tier: 'premium',
            contextWindow: '128k tokens',
            pricing: '$2.50/$10 per M tokens'
        },
        {
            id: 'gpt-4o-mini',
            name: 'GPT-4o-mini',
            description: 'Efficient and affordable small model.',
            isPaid: true,
            tier: 'premium',
            contextWindow: '128k tokens',
            pricing: '$0.15/$0.60 per M tokens'
        },
        {
            id: 'o1-preview',
            name: 'o1-preview',
            description: 'Reasoning model for complex technical tasks.',
            isPaid: true,
            tier: 'premium',
            contextWindow: '128k tokens',
            pricing: '$15/$60 per M tokens'
        },
        {
            id: 'o1-mini',
            name: 'o1-mini',
            description: 'Fast and efficient reasoning model.',
            isPaid: true,
            tier: 'premium',
            contextWindow: '128k tokens',
            pricing: '$3/$12 per M tokens'
        },
        {
            id: 'gpt-4-turbo',
            name: 'GPT-4 Turbo',
            description: 'High-capability model with large context.',
            isPaid: true,
            tier: 'premium',
            contextWindow: '128k tokens',
            pricing: '$10/$30 per M tokens'
        },
        {
            id: 'gpt-4',
            name: 'GPT-4',
            description: 'Original high-capability model.',
            isPaid: true,
            tier: 'premium',
            contextWindow: '8k tokens'
        },
        {
            id: 'gpt-3.5-turbo',
            name: 'GPT-3.5 Turbo',
            description: 'Standard fast model.',
            isPaid: true,
            tier: 'premium',
            contextWindow: '16k tokens'
        }
    ]
};
