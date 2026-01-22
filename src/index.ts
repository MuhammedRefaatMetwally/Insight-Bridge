import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import './utils/config';
import routes from './api/routes/ingestion.route';
import { errorHandler, notFoundHandler } from './middleware/errorHandlers';
import { logger } from './utils/logger.js';
import { testConnection } from './db/repositories/connection';


const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());        // Security headers
app.use(cors());         
app.use(express.json());  

// Log all requests
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

app.use('/api', routes);

app.get('/', (req, res) => {
  res.json({
    message: 'Insight-Bridge API 🚀',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      stats: 'GET /api/stats',
      ingestion: 'POST /api/ingestion/start',
      search: 'POST /api/ingestion/search',
      articles: 'GET /api/articles',
      article: 'GET /api/articles/:id',
      similar: 'GET /api/articles/:id/similar'
    }
  });
});

app.use(notFoundHandler);  
app.use(errorHandler);     

async function startServer() {
  try {
    logger.info('Testing database connection...');
    const connected = await testConnection();
    
    if (!connected) {
      throw new Error('Database connection failed');
    }

    app.listen(PORT, () => {
      logger.info(`URL: http://localhost:${PORT} , Environment: ${process.env.NODE_ENV || 'development'}            
      `);
    });

  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

export default app;

// Handle crashes gracefully
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Rejection', error);
  process.exit(1);
});

startServer();