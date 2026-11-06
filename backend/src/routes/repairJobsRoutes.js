import express from 'express';
import {
  getRepairJobs,
  getRepairJobById,
  createRepairJob,
  updateRepairJob,
  recheckAndReserveJobParts,
  cancelJob,
} from '../controllers/repairJobsController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getRepairJobs);
router.get('/:id', getRepairJobById);
router.post('/', authorize('Admin', 'Inventory Manager'), createRepairJob);
router.put('/:id', updateRepairJob); // Technicians can update assigned job status
router.post('/:id/reserve', authorize('Admin', 'Inventory Manager'), recheckAndReserveJobParts);
router.post('/:id/cancel', authorize('Admin', 'Inventory Manager'), cancelJob);

export default router;
