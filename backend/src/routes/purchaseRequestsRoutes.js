import express from 'express';
import {
  getPurchaseRequests,
  getPurchaseRequestById,
  createPurchaseRequest,
  updatePurchaseRequestStatus,
  receivePurchaseOrderStock,
} from '../controllers/purchaseRequestsController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getPurchaseRequests);
router.get('/:id', getPurchaseRequestById);
router.post('/', authorize('Admin', 'Inventory Manager'), createPurchaseRequest);
router.patch('/:id/status', authorize('Admin', 'Inventory Manager'), updatePurchaseRequestStatus);
router.post('/:id/receive', authorize('Admin', 'Inventory Manager'), receivePurchaseOrderStock);

export default router;
