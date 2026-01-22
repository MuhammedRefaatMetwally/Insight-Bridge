import { query } from '../repositories/connection';
import { logger } from '../../utils/logger.js';

export interface Article {
  id: string;
  title: string;
  content_summary: string;
  url: string;
  published_at: Date;
  source?: string;
  category?: string;
  image?: string;  // ✅ Add this
  created_at?: Date;
  embedding?: number[];
}
export class ArticlesRepository {
  
  // Save a new article to database
  async create(article: {
  title: string;
  summary: string;
  url: string;
  publishedAt: Date;
  embedding: number[];
  source?: string;
  category?: string;
  image?: string;  // ✅ Add this parameter
}): Promise<Article> {
  try {
    if (!Array.isArray(article.embedding)) {
      throw new Error('Embedding must be an array');
    }

    const sql = `
      INSERT INTO news_articles (
        title, content_summary, url, published_at, embedding, source, category, image
      )
      VALUES ($1, $2, $3, $4, $5::vector, $6, $7, $8)
      RETURNING *
    `;

    const embeddingStr = `[${article.embedding.join(',')}]`;

    const values = [
      article.title,
      article.summary,
      article.url,
      article.publishedAt,
      embeddingStr,
      article.source || null,
      article.category || null,
      article.image || null,  // ✅ Add this
    ];

    const result = await query(sql, values);
    logger.info('Article saved to database ✅');
    return result[0];
  } catch (error) {
    logger.error('Failed to save article', error);
    throw error;
  }
}

  // Check if an article already exists (by URL)
  async existsByUrl(url: string): Promise<boolean> {
    try {
      const sql = 'SELECT EXISTS(SELECT 1 FROM news_articles WHERE url = $1)';
      const result = await query(sql, [url]);
      return result[0].exists;
    } catch (error) {
      logger.error('Failed to check article existence', error);
      throw error;
    }
  }

  // Get all articles (with pagination)
  async getAll(limit: number = 50, offset: number = 0): Promise<Article[]> {
    try {
      const sql = `
        SELECT id, title, content_summary, url, published_at, source, category,image, created_at
        FROM news_articles 
        ORDER BY published_at DESC
        LIMIT $1 OFFSET $2
      `;
      
      return await query(sql, [limit, offset]);
    } catch (error) {
      logger.error('Failed to get articles', error);
      throw error;
    }
  }

  // Get one article by ID (with embedding)
  async getById(id: string): Promise<Article | null> {
    try {
      const sql = 'SELECT * FROM news_articles WHERE id = $1';
      const result = await query(sql, [id]);
      return result[0] || null;
    } catch (error) {
      logger.error('Failed to get article by ID', error);
      throw error;
    }
  }

  // Find similar articles using vector search
  async findSimilar(embedding: number[], limit: number = 10): Promise<Article[]> {
    try {
      // Validate input
      if (!Array.isArray(embedding)) {
        throw new Error(`Embedding must be an array, got ${typeof embedding}`);
      }

      if (embedding.length === 0) {
        throw new Error('Embedding array cannot be empty');
      }

      // Check if all elements are numbers
      if (!embedding.every(n => typeof n === 'number')) {
        throw new Error('Embedding must contain only numbers');
      }

      logger.debug('Finding similar articles', { 
        embeddingLength: embedding.length,
        firstFew: embedding.slice(0, 5),
        limit 
      });

      // Format embedding as [0.1,0.2,0.3] without JSON.stringify
      const embeddingStr = `[${embedding.join(',')}]`;

      const sql = `
        SELECT 
          id, title, content_summary, url, published_at, image, source,
          1 - (embedding <=> $1::vector) as similarity
        FROM news_articles 
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT $2
      `;

      const result = await query(sql, [embeddingStr, limit]);
      logger.info(`Found ${result.length} similar articles`);
      return result;
    } catch (error) {
      logger.error('Failed to find similar articles', error);
      throw error;
    }
  }

  // Count total articles
  async count(): Promise<number> {
    try {
      const sql = 'SELECT COUNT(*) FROM news_articles';
      const result = await query(sql);
      return parseInt(result[0].count, 10);
    } catch (error) {
      logger.error('Failed to count articles', error);
      throw error;
    }
  }
}