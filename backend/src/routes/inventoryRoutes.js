import express from 'express';
import {
  getStockMovements,
  adjustStock,
  receiveStockManual,
  getAlerts,
} from '../controllers/inventoryController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/movements', getStockMovements);
router.get('/alerts', getAlerts);
router.post('/adjust', authorize('Admin', 'Inventory Manager'), adjustStock);
router.post('/receive', authorize('Admin', 'Inventory Manager'), receiveStockManual);

export default router;
