import { ModelInfo } from '../constants/aiModels';

interface OpenAIListModelResponse {
  object: string;
  data: Array<{
    id: string;
    object: string;
    created: number;
    owned_by: string;
  }>;
}

interface AnthropicListModelResponse {
  object: string;
  data: Array<{
    id: string;
    object: string;
    created: number;
    owned_by: string;
  }>;
}

interface GeminiListModelResponse {
  models: Array<{
    name: string;
    baseModelId: string;
    version: string;
    displayName: string;
    description: string;
    inputTokenLimit: number;
    outputTokenLimit: number;
    supportedGenerationMethods: string[];
  }>;
}

/**
 * Fetches available models from OpenAI API
 */
export async function fetchOpenAIModels(apiKey: string): Promise<ModelInfo[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data: OpenAIListModelResponse = await response.json();
    
    return data.data.map(model => ({
      id: model.id,
      name: model.id,
      description: `OpenAI model ${model.id} owned by ${model.owned_by}`,
      isPaid: true, // Most OpenAI models require payment
      tier: 'premium',
      contextWindow: model.id.includes('128k') ? '128k tokens' : 
                   model.id.includes('32k') ? '32k tokens' : 
                   model.id.includes('16k') ? '16k tokens' : 'Unknown'
    }));
  } catch (error) {
    console.error('Error fetching OpenAI models:', error);
    // Return default models as fallback
    return [
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
      }
    ];
  }
}

/**
 * Fetches available models from Anthropic Claude API
 */
export async function fetchClaudeModels(apiKey: string): Promise<ModelInfo[]> {
  try {
    // Note: Anthropic doesn't have a public models endpoint like OpenAI
    // Instead, we'll use a fixed list of known models since Anthropic's model list is less dynamic
    // In a real-world scenario, you might need to maintain this list or use a proxy service
    const hardcodedModels: ModelInfo[] = [
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
        name: 'Claude 3 Sonnet',
        description: 'Balanced performance and speed.',
        isPaid: true,
        tier: 'premium',
        contextWindow: '200k tokens',
        pricing: '$3/$15 per M tokens'
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        description: 'Fast and efficient.',
        isPaid: true,
        tier: 'premium',
        contextWindow: '200k tokens',
        pricing: '$0.25/$1.25 per M tokens'
      }
    ];

    // For now, return hardcoded models since Anthropic doesn't have a public list models endpoint
    // In the future, if Anthropic adds this endpoint, we can update this function
    return hardcodedModels;

  } catch (error) {
    console.error('Error fetching Claude models:', error);
    return [
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        description: 'Latest Sonnet model, high intelligence and speed.',
        isPaid: true,
        tier: 'premium',
        contextWindow: '200k tokens',
        pricing: '$3/$15 per M tokens'
      }
    ];
  }
}

/**
 * Fetches available models from Google Gemini API
 */
export async function fetchGeminiModels(apiKey: string): Promise<ModelInfo[]> {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data: GeminiListModelResponse = await response.json();
    
    return data.models
      .filter(model => model.supportedGenerationMethods.includes('generateContent')) // Only include models that can generate content
      .map(model => {
        // Extract model ID from the name (which includes the "models/" prefix)
        const modelId = model.name.replace('models/', '');
        
        // Determine if it's a paid/free model based on name patterns
        const isFree = modelId.includes('flash') || modelId.includes('gemma');
        const tier: 'free' | 'premium' | 'pro' = isFree ? 'free' : 'premium';
        const isPaid = !isFree;
        
        return {
          id: modelId,
          name: model.displayName || modelId,
          description: model.description || `Google Gemini model ${modelId}`,
          isPaid,
          tier,
          contextWindow: `${model.inputTokenLimit || 'varies'} tokens`
        };
      });
  } catch (error) {
    console.error('Error fetching Gemini models:', error);
    // Return modern default models as fallback
    return [
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        description: 'Fast and cost-efficient for high-volume tasks.',
        isPaid: false,
        tier: 'free',
        contextWindow: '1M tokens'
      },
      {
        id: 'gemini-2.0-pro',
        name: 'Gemini 2.0 Pro',
        description: 'Most capable model for complex reasoning and tasks.',
        isPaid: false,
        tier: 'free',
        contextWindow: '2M tokens'
      }
    ];
  }
}

/**
 * Fetches models for a specific provider
 */
export async function fetchProviderModels(providerId: string, apiKey: string): Promise<ModelInfo[]> {
  switch (providerId) {
    case 'openai':
      return await fetchOpenAIModels(apiKey);
    case 'claude':
      return await fetchClaudeModels(apiKey);
    case 'gemini':
      return await fetchGeminiModels(apiKey);
    default:
      throw new Error(`Unsupported provider: ${providerId}`);
  }
}

/**
 * Handles AI model failures by attempting to find and switch to a working model
 * @returns true if model was successfully fixed/switched, false otherwise
 */
export async function handleModelFailure(providerId: string): Promise<boolean> {
  console.log(`Attempting to handle model failure for provider: ${providerId}`);
  
  try {
    const result = await chrome.storage.local.get(['aiSettings']);
    const aiSettings = result.aiSettings;
    
    if (!aiSettings || !aiSettings.providers) {
      console.error('No AI settings found to update.');
      return false;
    }
    
    const providerIndex = aiSettings.providers.findIndex((p: any) => p.id === providerId);
    if (providerIndex === -1) {
      console.error(`Provider ${providerId} not found in settings.`);
      return false;
    }
    
    const provider = aiSettings.providers[providerIndex];
    if (!provider.apiKey) {
      console.error(`No API key for provider ${providerId}.`);
      return false;
    }
    
    // 1. Fetch available models from API
    console.log(`Fetching latest models for ${providerId}...`);
    const allAvailableModels = await fetchProviderModels(providerId, provider.apiKey);
    
    if (!allAvailableModels || allAvailableModels.length === 0) {
      console.error(`No models returned from ${providerId} API.`);
      return false;
    }

    console.log(`Total models found for ${providerId}: ${allAvailableModels.length}`);
    console.log('Available model IDs:', allAvailableModels.map(m => m.id).join(', '));
    
    // 2. Select a replacement model
    // CRITICAL: Exclude the current model that just failed
    const otherModels = allAvailableModels.filter(m => m.id !== provider.model);
    
    if (otherModels.length === 0) {
      console.error(`No alternative models found for ${providerId} after excluding ${provider.model}`);
      return false;
    }

    // Preference order for selection: 
    let newModelId = '';
    
    if (providerId === 'gemini') {
      // For Gemini, prefer a free model that is NOT the current failing one
      const freeModel = otherModels.find(m => 
        m.id.includes('flash') || m.id.includes('gemma') || m.tier === 'free'
      );
      if (freeModel) newModelId = freeModel.id;
    } else if (providerId === 'openai') {
      const gpt4oMini = otherModels.find(m => m.id === 'gpt-4o-mini');
      if (gpt4oMini) newModelId = gpt4oMini.id;
    } else if (providerId === 'claude') {
      const haiku = otherModels.find(m => m.id.includes('haiku'));
      if (haiku) newModelId = haiku.id;
    }
    
    // Fallback to first model in the "others" list if no specific preference found
    if (!newModelId && otherModels.length > 0) {
      newModelId = otherModels[0].id;
    }
    
    if (newModelId) {
      console.log(`Switching provider ${providerId} from ${provider.model} to ${newModelId}`);
      
      // 3. Update settings in storage
      aiSettings.providers[providerIndex].model = newModelId;
      await chrome.storage.local.set({ aiSettings });
      
      // 4. Notify user
      chrome.runtime.sendMessage({
        action: 'showNotification',
        notification: {
          title: 'AI Model Updated',
          message: `Your ${providerId} model was outdated or failed. Automatically switched to ${newModelId}.`,
          type: 'basic'
        }
      });
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error in handleModelFailure:', error);
    return false;
  }
}