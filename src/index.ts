import express from "express";
import cors from "cors";
import helmet from "helmet";
import "./utils/config.js";
import routes from "./api/routes/ingestion.route.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandlers.js";
import { logger } from "./utils/logger.js";
import { testConnection } from "./db/repositories/connection.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3001',
    /\.vercel\.app$/, // Allow all Vercel deployments
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

app.use("/api", routes);

app.get('/', (req, res) => res.send('API is running!'));

app.get('/health', async (req, res) => {
  try {
    const connected = await testConnection();
    if (connected) {
      res.status(200).send('DB connected successfully');
    } else {
      res.status(500).send('DB connection failed');
    }
  } catch (error) {
    logger.error("Health check failed", error);
    res.status(500).send('Health check error');
  }
});

app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async () => {
  try {
    // Test database connection
    logger.info('Testing database connection...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }

    logger.info('Database connection successful');

    if (!process.env.VERCEL) {
      app.listen(PORT, () => {
        logger.info(`Server running on: http://localhost:${PORT}`);

        logger.info('Available endpoints:', {
          root: `http://localhost:${PORT}`,
          health: `http://localhost:${PORT}/api/health`,
          ingestion: `http://localhost:${PORT}/api/ingestion/start`,
          articles: `http://localhost:${PORT}/api/articles`
        });
      });
    } else {
      logger.info('Running on Vercel - serverless mode');
    }

  } catch (error) {
    logger.error('Failed to start server', error);
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  }
};


process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", error);
});

process.on("unhandledRejection", (error) => {
  logger.error("Unhandled Rejection", error);
});

startServer();

export default app;