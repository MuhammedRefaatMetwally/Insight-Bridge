import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger.js';

export class AIService {
  private genAI: GoogleGenerativeAI;
  private summaryModel: any;
  private embeddingModel: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found in .env file');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.summaryModel = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    this.embeddingModel = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
    
    logger.info('AI Service ready ✨');
  }

  /**
   * Generate a summary from text
   */
  async generateSummary(text: string): Promise<string> {
    try {
      // Truncate very long text to save tokens
      const maxLength = 3000;
      const truncatedText = text.length > maxLength 
        ? text.substring(0, maxLength) + '...'
        : text;

      const prompt = `Summarize this news article in 2-3 concise sentences:

${truncatedText}

Summary:`;

      const result = await this.summaryModel.generateContent(prompt);
      const summary = result.response.text().trim();
      
      logger.info('✅ Summary created');
      return summary;
    } catch (error: any) {
      logger.error('❌ Summary generation failed', error.message);
      throw new Error(`Summary generation failed: ${error.message}`);
    }
  }

  /**
   * Generate embedding (768-dimensional vector)
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Truncate text for embedding
      const maxLength = 2000;
      const truncatedText = text.length > maxLength 
        ? text.substring(0, maxLength)
        : text;

      const result = await this.embeddingModel.embedContent(truncatedText);
      const embedding = result.embedding.values;

      if (!embedding || embedding.length !== 768) {
        throw new Error(`Invalid embedding dimensions: ${embedding?.length}`);
      }

      logger.info('✅ Embedding created');
      return Array.from(embedding);
    } catch (error: any) {
      logger.error('❌ Embedding generation failed', error.message);
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Generate both summary and embedding
   */
  async generateSummaryAndEmbedding(text: string) {
    logger.info('🤖 Processing with AI...');
    
    try {
      // Process both in parallel for speed
      const [summary, embedding] = await Promise.all([
        this.generateSummary(text),
        this.generateEmbedding(text)
      ]);

      return { summary, embedding };
    } catch (error: any) {
      logger.error('❌ AI processing failed', error.message);
      throw error;
    }
  }
}