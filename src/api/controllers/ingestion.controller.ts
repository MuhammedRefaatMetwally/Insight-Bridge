import { Request, Response } from 'express';
import { IngestionService } from '../../services/ingestion.service.js';
import { ArticlesRepository } from '../../db/repositories/articles.repository.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../middleware/errorHandlers';

export class IngestionController {
  private ingestionService = new IngestionService();
  private articlesRepo = new ArticlesRepository();

  // POST /api/ingestion/start
  // Start the ingestion process
  startIngestion = async (req: Request, res: Response) => {
    const { category = 'general', max = 10 } = req.body;

    logger.info('Ingestion request received', { category, max });

    const result = await this.ingestionService.ingestNews(category, max);

    res.json({
      success: true,
      message: 'Ingestion completed',
      data: result
    });
  };

  // POST /api/ingestion/search
  // Search and ingest specific news
  searchAndIngest = async (req: Request, res: Response) => {
    const { query, max = 10 } = req.body;

    if (!query) {
      throw new AppError('Query is required', 400);
    }

    logger.info('Search ingestion request', { query, max });

    const result = await this.ingestionService.searchAndIngest(query, max);

    res.json({
      success: true,
      message: 'Search and ingest completed',
      data: result
    });
  };

  // GET /api/articles
  // Get all articles with pagination
  getArticles = async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const articles = await this.articlesRepo.getAll(limit, offset);
    const total = await this.articlesRepo.count();

    res.json({
      success: true,
      data: {
        articles,
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });
  };

  // GET /api/articles/:id
  // Get one article by ID
  getArticleById = async (req: Request, res: Response) => {
    const { id } = req.params;

    const article = await this.articlesRepo.getById(id);

    if (!article) {
      throw new AppError('Article not found', 404);
    }

    res.json({
      success: true,
      data: article
    });
  };

  // GET /api/articles/:id/similar
  // Find similar articles using AI
  findSimilar = async (req: Request, res: Response) => {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    // Get the source article with its embedding
    const article = await this.articlesRepo.getById(id);

    if (!article) {
      throw new AppError('Article not found', 404);
    }

    if (!article.embedding) {
      throw new AppError('Article has no embedding', 400);
    }

    // CRITICAL FIX: Parse the embedding correctly
    let embeddingArray: number[];

    if (typeof article.embedding === 'string') {
      // If it's a string, parse it
      try {
        // Remove any extra quotes and parse
        const cleanedStr = article.embedding.replace(/^"|"$/g, '');
        embeddingArray = JSON.parse(cleanedStr);
      } catch (error) {
        logger.error('Failed to parse embedding string', { 
          embedding: article.embedding.substring(0, 100),
          error 
        });
        throw new AppError('Invalid embedding format', 500);
      }
    } else if (Array.isArray(article.embedding)) {
      // If it's already an array, use it directly
      embeddingArray = article.embedding;
    } else {
      logger.error('Unexpected embedding type', { 
        type: typeof article.embedding,
        embedding: article.embedding 
      });
      throw new AppError('Invalid embedding type', 500);
    }

    // Verify it's a valid array of numbers
    if (!Array.isArray(embeddingArray) || embeddingArray.length === 0) {
      throw new AppError('Invalid embedding array', 500);
    }

    logger.info('Finding similar articles', { 
      sourceId: id, 
      embeddingLength: embeddingArray.length 
    });

    // Find similar articles
    const similar = await this.articlesRepo.findSimilar(embeddingArray, limit + 1);

    // Remove the source article from results
    const filtered = similar.filter(a => a.id !== id);

    res.json({
      success: true,
      data: {
        sourceArticle: { id: article.id, title: article.title },
        similarArticles: filtered.slice(0, limit)
      }
    });
  };

  // GET /api/stats
  // Get ingestion statistics
  getStats = async (req: Request, res: Response) => {
    const stats = await this.ingestionService.getStats();

    res.json({
      success: true,
      data: stats
    });
  };

  // GET /api/health
  // Health check
  healthCheck = async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Service is healthy',
      timestamp: new Date().toISOString()
    });
  };
}