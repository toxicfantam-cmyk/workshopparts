import express from 'express';
import {
  getInventoryValuationReport,
  getPartsConsumptionReport,
  getWaitingJobsReport,
  getPurchaseSpendingReport,
} from '../controllers/reportsController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/valuation', authorize('Admin', 'Inventory Manager'), getInventoryValuationReport);
router.get('/consumption', authorize('Admin', 'Inventory Manager'), getPartsConsumptionReport);
router.get('/waiting-jobs', getWaitingJobsReport);
router.get('/spending', authorize('Admin', 'Inventory Manager'), getPurchaseSpendingReport);

export default router;
