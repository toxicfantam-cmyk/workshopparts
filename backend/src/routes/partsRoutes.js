import express from 'express';
import {
  getParts,
  getPartById,
  createPart,
  updatePart,
  deletePart,
  getCategories,
} from '../controllers/partsController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getParts);
router.get('/categories', getCategories);
router.get('/:id', getPartById);
router.post('/', authorize('Admin', 'Inventory Manager'), createPart);
router.put('/:id', authorize('Admin', 'Inventory Manager'), updatePart);
router.delete('/:id', authorize('Admin'), deletePart);

export default router;
