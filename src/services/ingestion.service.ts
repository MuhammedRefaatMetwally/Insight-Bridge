import { AIService } from './ai.service.js';
import { NewsService } from './news.service.js';
import { ArticlesRepository } from '../db/repositories/articles.repository.js';
import { logger } from '../utils/logger.js';

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
   * Main ingestion pipeline - max 3 articles for fast response
   */
  async ingestNews(category: string = 'general', max: number = 3): Promise<IngestionResult> {
    // Enforce maximum of 3 articles
    if (max > 3) {
      logger.warn(`⚠️  Limiting to 3 articles (requested ${max})`);
      max = 3;
    }

    logger.info(`Starting ingestion: ${category} (${max} articles)`);

    let success = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];

    try {
      const articles = await this.newsService.fetchNews(category, max);
      logger.info(`Processing ${articles.length} articles...`);

      for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        
        try {
          logger.progress('Processing', i + 1, articles.length);

          // Skip if article already exists
          const exists = await this.articlesRepo.existsByUrl(article.url);
          if (exists) {
            logger.info(`⏭️  Article already exists, skipping`);
            skipped++;
            continue;
          }

          // Prepare content
          const contentForAI = `${article.title}\n\n${article.description}\n\n${article.content}`;

          // Generate summary and embedding (parallel for speed)
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
            image: article.image || null,
          });

          success++;
          logger.info(`✅ Saved (${i + 1}/${articles.length})`);

        } catch (error) {
          failed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(errorMsg);
          logger.error(`❌ Failed to process article`, errorMsg);
        }
      }

      logger.info(`✨ Complete: ${success} success, ${failed} failed, ${skipped} skipped`);

      return { success, failed, skipped, total: articles.length, errors };

    } catch (error) {
      logger.error('Ingestion failed', error);
      throw error;
    }
  }

  /**
   * Search and ingest - max 3 articles
   */
  async searchAndIngest(query: string, max: number = 3): Promise<IngestionResult> {
    // Enforce maximum of 3 articles
    if (max > 3) {
      logger.warn(`⚠️  Limiting to 3 articles (requested ${max})`);
      max = 3;
    }

    logger.info(`Searching and ingesting: "${query}" (${max} articles)`);

    let success = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];

    try {
      const articles = await this.newsService.searchNews(query, max);
      logger.info(`Processing ${articles.length} articles...`);

      for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        
        try {
          logger.progress('Processing', i + 1, articles.length);

          const exists = await this.articlesRepo.existsByUrl(article.url);
          if (exists) {
            logger.info(`⏭️  Article already exists, skipping`);
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
            image: article.image || null,
          });

          success++;
          logger.info(`✅ Saved (${i + 1}/${articles.length})`);

        } catch (error) {
          failed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(errorMsg);
        }
      }

      logger.info(`✨ Complete: ${success} success, ${failed} failed, ${skipped} skipped`);

      return { success, failed, skipped, total: articles.length, errors };

    } catch (error) {
      logger.error('Search and ingest failed', error);
      throw error;
    }
  }

  /**
   * Get statistics
   */
  async getStats() {
    const total = await this.articlesRepo.count();
    return { totalArticles: total };
  }
}