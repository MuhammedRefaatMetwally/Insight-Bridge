import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger.js';

export class AIService {
  private genAI: GoogleGenerativeAI;
  private summaryModel: any;
  private embeddingModel: any;
  
  // Rate limiting (optimized for free tier)
  private requestCount = 0;
  private requestResetTime = Date.now() + 60000;
  private readonly MAX_REQUESTS_PER_MINUTE = 10; // Very conservative for free tier
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 6000; // 6 seconds between requests

  // Daily quota tracking (optional - for monitoring)
  private dailyRequestCount = 0;
  private dailyResetTime = Date.now() + 86400000; // 24 hours

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found in .env file');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    
    // FIXED: Use correct model names
    this.summaryModel = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash'  // ✅ Correct model name
    });
    this.embeddingModel = this.genAI.getGenerativeModel({ 
      model: 'text-embedding-004'  // ✅ Correct embedding model
    });
    
    logger.info('AI Service ready ✨ (Production mode: Free tier optimized)');
  }

  /**
   * Wait to respect rate limits - very conservative for free tier
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();

    // Reset minute counter if 60s has passed
    if (now > this.requestResetTime) {
      this.requestCount = 0;
      this.requestResetTime = now + 60000;
    }

    // Reset daily counter if 24h has passed
    if (now > this.dailyResetTime) {
      this.dailyRequestCount = 0;
      this.dailyResetTime = now + 86400000;
    }

    // Check daily limit (1500 for free tier, we'll be conservative at 1000)
    if (this.dailyRequestCount >= 1000) {
      logger.error('❌ Daily quota limit reached (1000 requests). Please try again tomorrow.');
      throw new Error('Daily API quota exhausted. Please try again in 24 hours.');
    }

    // Check minute limit
    if (this.requestCount >= this.MAX_REQUESTS_PER_MINUTE) {
      const waitTime = this.requestResetTime - now;
      logger.warn(`⏳ Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)}s before continuing...`);
      await this.sleep(waitTime);
      this.requestCount = 0;
      this.requestResetTime = Date.now() + 60000;
    }

    // Ensure minimum interval between requests
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      logger.debug(`⏱️  Throttling: waiting ${Math.ceil(waitTime / 1000)}s...`);
      await this.sleep(waitTime);
    }

    this.requestCount++;
    this.dailyRequestCount++;
    this.lastRequestTime = Date.now();
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry logic with exponential backoff and smart error handling
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    operation: string,
    maxRetries: number = 3,
    initialDelay: number = 3000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await this.waitForRateLimit();
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Don't retry on 404 (model not found) - it won't get better
        if (error.status === 404) {
          logger.error(`❌ Model not found error. Check model names.`);
          throw new Error(`AI model not available: ${error.message}`);
        }

        // Handle rate limit (429)
        if (error.status === 429) {
          let retryDelay = initialDelay * Math.pow(2, attempt);
          
          // Try to extract retry delay from error
          if (error.errorDetails) {
            const retryInfo = error.errorDetails.find(
              (detail: any) => detail['@type']?.includes('RetryInfo')
            );
            if (retryInfo?.retryDelay) {
              const seconds = parseFloat(retryInfo.retryDelay.replace('s', ''));
              retryDelay = Math.max(seconds * 1000, retryDelay);
            }
          }

          if (attempt < maxRetries - 1) {
            logger.warn(`⚠️  Rate limit hit for ${operation} (attempt ${attempt + 1}/${maxRetries}). Waiting ${Math.ceil(retryDelay / 1000)}s...`);
            await this.sleep(retryDelay);
            continue;
          } else {
            throw new Error(`Rate limit exceeded after ${maxRetries} attempts. Please reduce batch size or wait.`);
          }
        }

        // Handle other errors with exponential backoff
        if (attempt < maxRetries - 1) {
          const backoffDelay = initialDelay * Math.pow(2, attempt);
          logger.warn(`⚠️  ${operation} failed (attempt ${attempt + 1}/${maxRetries}). Retrying in ${Math.ceil(backoffDelay / 1000)}s...`);
          await this.sleep(backoffDelay);
        } else {
          throw error;
        }
      }
    }

    throw lastError || new Error(`${operation} failed after ${maxRetries} attempts`);
  }

  /**
   * Generate a concise summary (optimized for free tier)
   */
  async generateSummary(text: string): Promise<string> {
    try {
      // Truncate very long text to save tokens (free tier has token limits)
      const maxLength = 3000; // characters
      const truncatedText = text.length > maxLength 
        ? text.substring(0, maxLength) + '...'
        : text;

      const summary = await this.retryWithBackoff(
        async () => {
          const prompt = `Summarize this news article in 2-3 concise sentences:

${truncatedText}

Summary:`;

          const result = await this.summaryModel.generateContent(prompt);
          return result.response.text().trim();
        },
        'Summary generation',
        3,
        3000
      );

      logger.info('✅ Summary created');
      return summary;
    } catch (error: any) {
      logger.error('❌ Summary generation failed', error.message);
      
      if (error.status === 429 || error.message?.includes('quota')) {
        throw new Error('API quota exceeded. Please reduce batch size or wait.');
      }
      
      throw new Error(`Summary generation failed: ${error.message}`);
    }
  }

  /**
   * Generate embedding with retry logic
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Truncate text for embedding (save tokens)
      const maxLength = 2000;
      const truncatedText = text.length > maxLength 
        ? text.substring(0, maxLength)
        : text;

      const embedding = await this.retryWithBackoff(
        async () => {
          const result = await this.embeddingModel.embedContent(truncatedText);
          return result.embedding.values;
        },
        'Embedding generation',
        3,
        3000
      );

      if (!embedding || embedding.length !== 768) {
        throw new Error(`Invalid embedding dimensions: ${embedding?.length}`);
      }

      logger.info('✅ Embedding created');
      return Array.from(embedding);
    } catch (error: any) {
      logger.error('❌ Embedding generation failed', error.message);
      
      if (error.status === 429 || error.message?.includes('quota')) {
        throw new Error('API quota exceeded. Please reduce batch size or wait.');
      }
      
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Generate both summary and embedding (sequential, production-safe)
   */
  async generateSummaryAndEmbedding(text: string) {
    logger.info('🤖 Processing with AI (this may take 15-20 seconds)...');
    
    try {
      // Process sequentially with proper delays
      const summary = await this.generateSummary(text);
      
      // Small additional delay between operations
      await this.sleep(2000);
      
      const embedding = await this.generateEmbedding(text);

      return { summary, embedding };
    } catch (error: any) {
      logger.error('❌ AI processing failed', error.message);
      throw error;
    }
  }

  /**
   * Get current rate limit status
   */
  public getRateLimitStatus(): { 
    requestsUsedThisMinute: number;
    requestsRemainingThisMinute: number;
    minuteResetIn: number;
    dailyRequestsUsed: number;
    dailyRequestsRemaining: number;
    dailyResetIn: number;
  } {
    const now = Date.now();
    const minuteResetIn = Math.max(0, Math.ceil((this.requestResetTime - now) / 1000));
    const dailyResetIn = Math.max(0, Math.ceil((this.dailyResetTime - now) / 3600000)); // hours
    
    return {
      requestsUsedThisMinute: this.requestCount,
      requestsRemainingThisMinute: Math.max(0, this.MAX_REQUESTS_PER_MINUTE - this.requestCount),
      minuteResetIn,
      dailyRequestsUsed: this.dailyRequestCount,
      dailyRequestsRemaining: Math.max(0, 1000 - this.dailyRequestCount),
      dailyResetIn
    };
  }

  /**
   * Reset rate limit counters (for testing or manual reset)
   */
  public resetCounters(): void {
    this.requestCount = 0;
    this.requestResetTime = Date.now() + 60000;
    logger.info('Rate limit counters reset');
  }
}