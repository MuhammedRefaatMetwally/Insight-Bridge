import { AIService } from './ai.service.js';
import { NewsService } from './news.service.js';
import { ArticlesRepository } from '../db/repositories/articles.repository.js';
import { logger } from '../utils/logger.js';

// Result of ingestion process
export interface IngestionResult {
  success: number;
  failed: number;
  skipped: number;
  total: number;
  errors: string[];
}

export class IngestionService {
  private aiService: AIService;
  private newsService: NewsService;
  private articlesRepo: ArticlesRepository;

  constructor() {
    this.aiService = new AIService();
    this.newsService = new NewsService();
    this.articlesRepo = new ArticlesRepository();
    logger.info('Ingestion Service ready 🚀');
  }

  /**
   * THE MAIN PIPELINE:
   * 1. Fetch news from GNews
   * 2. For each article: Summarize + Create Embedding (using AI)
   * 3. Save to database
   */
  async ingestNews(category: string = 'general', max: number = 10): Promise<IngestionResult> {
    logger.info(`Starting ingestion: ${category} (${max} articles)`);

    // Warn if requesting too many articles
    if (max > 5) {
      logger.warn(`⚠️  Processing ${max} articles may hit rate limits. Consider using max=5 or less.`);
    }

    let success = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];

    try {
      // Step 1: Fetch news articles
      const articles = await this.newsService.fetchNews(category, max);
      logger.info(`Processing ${articles.length} articles...`);

      // Show rate limit status before starting
      const rateLimitStatus = this.aiService.getRateLimitStatus();
      logger.info(`API quota: ${rateLimitStatus.dailyRequestsRemaining} requests remaining (resets in ${rateLimitStatus.dailyResetIn}s)`);

      // Step 2 & 3: Process each article
      for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        
        try {
          // Show progress
          logger.progress('Processing', i + 1, articles.length);

          // Skip if article already exists
          const exists = await this.articlesRepo.existsByUrl(article.url);
          if (exists) {
            logger.warn(`Article already exists: ${article.title.substring(0, 50)}...`);
            skipped++;
            continue;
          }

          // Prepare content for AI
          const contentForAI = `${article.title}\n\n${article.description}\n\n${article.content}`;

          // Generate summary and embedding (now with rate limiting)
          const { summary, embedding } = await this.aiService.generateSummaryAndEmbedding(contentForAI);

          // Save to database
          await this.articlesRepo.create({
            title: article.title,
            summary: summary,
            url: article.url,
            publishedAt: new Date(article.publishedAt),
            embedding: embedding,
            source: article.source.name,
            category: category,
            image: article.image ?? undefined,
          });

          success++;
          logger.info(`✅ Saved (${i + 1}/${articles.length}): ${article.title.substring(0, 50)}...`);

        } catch (error) {
          failed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          
          // Check if it's a quota error
          if (errorMsg.includes('quota exceeded')) {
            logger.error(`❌ Quota exceeded! Processed ${success} articles successfully.`);
            errors.push(`Quota exceeded after ${success} articles`);
            
            // Stop processing more articles if quota is exceeded
            logger.warn('⚠️  Stopping ingestion due to quota limits.');
            break;
          }
          
          errors.push(`${article.url}: ${errorMsg}`);
          logger.error(`Failed to process article: ${article.url}`, errorMsg);
        }
      }

      // Final summary
      logger.info(`
┌─────────────────────────────┐
│   INGESTION COMPLETE ✨     │
├─────────────────────────────┤
│ Success: ${success}              
│ Failed:  ${failed}              
│ Skipped: ${skipped}              
│ Total:   ${articles.length}              
└─────────────────────────────┘
      `);

      return { success, failed, skipped, total: articles.length, errors };

    } catch (error) {
      logger.error('Ingestion failed', error);
      throw error;
    }
  }

  // Search for news and ingest it
  async searchAndIngest(query: string, max: number = 10): Promise<IngestionResult> {
    logger.info(`Searching and ingesting: "${query}"`);

    // Warn if requesting too many articles
    if (max > 5) {
      logger.warn(`⚠️  Processing ${max} articles may hit rate limits. Consider using max=5 or less.`);
    }

    let success = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];

    try {
      const articles = await this.newsService.searchNews(query, max);

      // Show rate limit status
      const rateLimitStatus = this.aiService.getRateLimitStatus();
      logger.info(`API quota: ${rateLimitStatus.dailyRequestsRemaining} requests remaining (resets in ${rateLimitStatus.dailyResetIn}s)`);

      for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        
        try {
          logger.progress('Processing', i + 1, articles.length);

          const exists = await this.articlesRepo.existsByUrl(article.url);
          if (exists) {
            skipped++;
            continue;
          }

          const contentForAI = `${article.title}\n\n${article.description}\n\n${article.content}`;
          const { summary, embedding } = await this.aiService.generateSummaryAndEmbedding(contentForAI);

          await this.articlesRepo.create({
            title: article.title,
            summary: summary,
            url: article.url,
            publishedAt: new Date(article.publishedAt),
            embedding: embedding,
            source: article.source.name,
            image: article.image ?? undefined,
          });

          success++;
          logger.info(`✅ Saved (${i + 1}/${articles.length}): ${article.title.substring(0, 50)}...`);

        } catch (error) {
          failed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          
          if (errorMsg.includes('quota exceeded')) {
            logger.error(`❌ Quota exceeded! Processed ${success} articles successfully.`);
            errors.push(`Quota exceeded after ${success} articles`);
            break;
          }
          
          errors.push(`${article.url}: ${errorMsg}`);
        }
      }

      return { success, failed, skipped, total: articles.length, errors };

    } catch (error) {
      logger.error('Search and ingest failed', error);
      throw error;
    }
  }

  // Get statistics
  async getStats() {
    const total = await this.articlesRepo.count();
    const rateLimitStatus = this.aiService.getRateLimitStatus();
    
    return { 
      totalArticles: total,
      apiQuota: rateLimitStatus
    };
  }
}