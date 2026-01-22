import { Router } from 'express';
import { IngestionController } from '../controllers/ingestion.controller';

const router = Router();
const controller = new IngestionController();

const catchAsync = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.post('/ingestion/start', catchAsync(controller.startIngestion));
router.post('/ingestion/search', catchAsync(controller.searchAndIngest));

router.get('/articles', catchAsync(controller.getArticles));
router.get('/articles/:id', catchAsync(controller.getArticleById));
router.get('/articles/:id/similar', catchAsync(controller.findSimilar));

router.get('/stats', catchAsync(controller.getStats));
router.get('/health', catchAsync(controller.healthCheck));

export default router;