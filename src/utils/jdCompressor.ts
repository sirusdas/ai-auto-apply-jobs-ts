import { AISettings } from '../types';
import { AIService } from './aiService';

// Fallback to original JD if compression takes too long (e.g. local AI is slow)
const COMPRESSION_TIMEOUT_MS = 5000; 

/**
 * Regex based trimming to remove standard boilerplate sections from Job Descriptions
 */
export function compressWithRegex(jd: string): string {
    let compressed = jd;

    // Common headers for boilerplate at the bottom of JDs
    const bottomCutoffs = [
        /Equal Opportunity Employer/i,
        /About Us/i,
        /Who We Are/i,
        /Benefits include/i,
        /What We Offer/i,
        /Physical Requirements/i,
        /Our Culture/i
    ];

    for (const regex of bottomCutoffs) {
        const match = compressed.search(regex);
        // If we find a match in the bottom half of the JD, it's likely boilerplate. Slice it off.
        if (match !== -1 && match > (compressed.length / 3)) {
            compressed = compressed.substring(0, match);
            // We take the earliest cutoff we find
            break;
        }
    }

    return compressed.trim();
}

/**
 * Uses Chrome's built in window.ai (Gemini Nano) if available.
 */
async function compressWithLocalAI(jd: string): Promise<string | null> {
    try {
        // @ts-ignore - window.ai is experimental
        if (typeof window !== 'undefined' && window.ai) {
            // @ts-ignore
            const session = await window.ai.createTextSession();
            const prompt = `Extract only the core technical requirements, responsibilities, and years of experience from this job description. Be extremely concise. Ignore benefits, EEO statements, and company history. \n\nJob Description:\n${jd.substring(0, 4000)}`;
            const result = await session.prompt(prompt);
            session.destroy();
            return result;
        }
    } catch (e) {
        console.warn('Local AI compression failed:', e);
    }
    return null;
}

/**
 * Uses a designated cheap API model to compress the JD.
 */
async function compressWithCheapAPI(jd: string, providerId: string): Promise<string | null> {
    try {
        const aiService = new AIService();
        await aiService.init();

        const promptText = `Extract only the core technical requirements, responsibilities, and years of experience from this job description. Be extremely concise. Ignore benefits, EEO statements, and company history. \n\nJob Description:\n${jd.substring(0, 6000)}`;
        
        const response = await aiService.sendRequest({
            provider: providerId,
            prompt: promptText,
            maxTokens: 500,
            temperature: 0.1
        });

        return response.content;
    } catch (e) {
        console.warn(`Cheap API compression with provider ${providerId} failed:`, e);
    }
    return null;
}

/**
 * Main compression orchestrator with timeouts and cascaded fallbacks.
 */
export async function compressJobDescription(jd: string, settings?: AISettings): Promise<string> {
    if (!settings || !settings.enableJdCompression) {
        return jd;
    }

    const method = settings.jdCompressionMethod || 'regex';

    try {
        // Wrap async methods in a timeout promise
        const compressPromise = async () => {
            let compressed: string | null = null;

            if (method === 'local_ai') {
                compressed = await compressWithLocalAI(jd);
                if (!compressed) {
                    console.log('Local AI not available/failed. Falling back to regex.');
                    compressed = compressWithRegex(jd);
                }
            } else if (method === 'cheap_api' && settings.jdCompressionProviderId) {
                compressed = await compressWithCheapAPI(jd, settings.jdCompressionProviderId);
                if (!compressed) {
                    console.log('Cheap API failed. Falling back to regex.');
                    compressed = compressWithRegex(jd);
                }
            } else {
                compressed = compressWithRegex(jd);
            }
            
            return compressed || jd;
        };

        const timeoutPromise = new Promise<string>((_, reject) => 
            setTimeout(() => reject(new Error('JD Compression timed out')), COMPRESSION_TIMEOUT_MS)
        );

        const result = await Promise.race([compressPromise(), timeoutPromise]);
        
        // Ensure we didn't compress it down to nothing
        if (result.length < 50) {
            console.warn('Compressed JD was too short, returning original');
            return jd;
        }

        console.log(`JD compressed from ${jd.length} to ${result.length} characters.`);
        return result;

    } catch (e) {
        console.warn('JD Compression error, returning original JD:', e);
        return jd;
    }
}
