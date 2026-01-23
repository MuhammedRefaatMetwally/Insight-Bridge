import express from "express";
import cors from "cors";
import helmet from "helmet";
import "./utils/config";
import routes from "./api/routes/ingestion.route";
import { errorHandler, notFoundHandler } from "./middleware/errorHandlers";
import { logger } from "./utils/logger.js";
import { testConnection } from "./db/repositories/connection";

const app = express();

app.use(helmet());
app.use(cors({ origin: '*' }));  // Restrict origins in prod for security, e.g., ['http://localhost:3000', 'https://your-frontend.com']

app.use(express.json());

// Log all requests
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

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", error);
});

process.on("unhandledRejection", (error) => {
  logger.error("Unhandled Rejection", error);
});

export default app;