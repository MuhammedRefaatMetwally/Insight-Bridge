import { logger } from '../utils/logger';

export interface NewsArticle {
  title: string;
  description: string;
  content: string;
  url: string;
  image:string,
  publishedAt: string;
  source: {
    name: string;
  };
}

export class NewsService {
  private apiKey: string;
  private baseUrl = 'https://gnews.io/api/v4';

  constructor() {
    const apiKey = process.env.GNEWS_API_KEY;
    if (!apiKey) {
      throw new Error('GNEWS_API_KEY not found in .env file');
    }
    this.apiKey = apiKey;
    logger.info('News Service ready 📰');
  }

  async fetchNews(category: string = 'general', max: number = 10): Promise<NewsArticle[]> {
    try {
      logger.info(`Fetching ${max} articles from category: ${category}`);

      const url = `${this.baseUrl}/top-headlines?category=${category}&lang=en&max=${max}&apikey=${this.apiKey}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`GNews API error: ${response.status}`);
      }

      const data = await response.json();
      logger.info(`Fetched ${data.articles.length} articles ✅`);
      
      return data.articles;
    } catch (error) {
      logger.error('Failed to fetch news', error);
      throw new Error('News fetch failed');
    }
  }

  async searchNews(query: string, max: number = 10): Promise<NewsArticle[]> {
    try {
      logger.info(`Searching news for: "${query}"`);

      const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}&lang=en&max=${max}&apikey=${this.apiKey}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`GNews API error: ${response.status}`);
      }

      const data = await response.json();
      logger.info(`Found ${data.articles.length} articles ✅`);
      
      return data.articles;
    } catch (error) {
      logger.error('Failed to search news', error);
      throw new Error('News search failed');
    }
  }
}