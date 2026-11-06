import express from 'express';
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../controllers/suppliersController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getSuppliers);
router.get('/:id', getSupplierById);
router.post('/', authorize('Admin', 'Inventory Manager'), createSupplier);
router.put('/:id', authorize('Admin', 'Inventory Manager'), updateSupplier);
router.delete('/:id', authorize('Admin'), deleteSupplier);

export default router;
