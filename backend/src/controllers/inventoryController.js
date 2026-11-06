import Part from '../models/Part.js';
import StockMovement from '../models/StockMovement.js';
import RepairJob from '../models/RepairJob.js';
import { recordStockMovement, checkAndFulfillWaitingJobs } from '../services/inventoryService.js';

export const getStockMovements = async (req, res, next) => {
  try {
    const {
      partId,
      type,
      referenceType,
      startDate,
      endDate,
      page = 1,
      limit = 15,
    } = req.query;

    const query = {};

    if (partId && partId !== 'all') {
      query.part = partId;
    }

    if (type && type !== 'all') {
      query.type = type;
    }

    if (referenceType && referenceType !== 'all') {
      query.referenceType = referenceType;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const total = await StockMovement.countDocuments(query);
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 15;

    const movements = await StockMovement.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('performedBy', 'name email role');

    res.status(200).json({
      success: true,
      data: movements,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum) || 1,
        limit: limitNum,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const adjustStock = async (req, res, next) => {
  try {
    const { partId, adjustmentType, quantity, reason, notes } = req.body;

    if (!partId || !adjustmentType || !quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide partId, adjustmentType (INCREASE | DECREASE), and positive quantity',
      });
    }

    const part = await Part.findById(partId);
    if (!part) {
      return res.status(404).json({ success: false, message: 'Part not found' });
    }

    const qty = Number(quantity);
    const prevTotal = part.totalQuantity;
    const prevReserved = part.reservedQuantity;

    if (adjustmentType === 'DECREASE') {
      const maxRemovable = part.totalQuantity - part.reservedQuantity;
      if (qty > maxRemovable) {
        return res.status(400).json({
          success: false,
          message: `Cannot decrease by ${qty}. Only ${maxRemovable} unreserved units are available (${part.reservedQuantity} reserved for active jobs). Negative stock is not allowed.`,
        });
      }

      part.totalQuantity -= qty;
      await part.save();

      await recordStockMovement({
        part,
        type: 'ADJUSTMENT_DECREASE',
        quantity: qty,
        previousTotal: prevTotal,
        newTotal: part.totalQuantity,
        previousReserved: prevReserved,
        newReserved: prevReserved,
        referenceType: 'ManualAdjustment',
        referenceId: 'AUDIT-ADJUST',
        performedBy: req.user?._id,
        performedByName: req.user?.name || 'Manager',
        reason: reason ? `${reason}: ${notes || ''}` : notes || 'Inventory manual reduction',
      });
    } else if (adjustmentType === 'INCREASE') {
      part.totalQuantity += qty;
      await part.save();

      await recordStockMovement({
        part,
        type: 'ADJUSTMENT_INCREASE',
        quantity: qty,
        previousTotal: prevTotal,
        newTotal: part.totalQuantity,
        previousReserved: prevReserved,
        newReserved: prevReserved,
        referenceType: 'ManualAdjustment',
        referenceId: 'AUDIT-ADJUST',
        performedBy: req.user?._id,
        performedByName: req.user?.name || 'Manager',
        reason: reason ? `${reason}: ${notes || ''}` : notes || 'Inventory manual addition',
      });

      // Check if any waiting jobs can now be reserved
      await checkAndFulfillWaitingJobs(part._id, req.user);
    } else {
      return res.status(400).json({ success: false, message: 'Invalid adjustmentType' });
    }

    const updatedPart = await Part.findById(part._id).populate('supplier', 'name supplierId');

    res.status(200).json({
      success: true,
      message: `Stock successfully adjusted for ${part.name}`,
      part: updatedPart,
    });
  } catch (error) {
    next(error);
  }
};

export const receiveStockManual = async (req, res, next) => {
  try {
    const { partId, quantity, referenceNumber, supplierId, notes } = req.body;

    if (!partId || !quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide partId and a positive quantity to receive',
      });
    }

    const part = await Part.findById(partId);
    if (!part) {
      return res.status(404).json({ success: false, message: 'Part not found' });
    }

    const qty = Number(quantity);
    const prevTotal = part.totalQuantity;
    const prevReserved = part.reservedQuantity;

    part.totalQuantity += qty;
    await part.save();

    const movement = await recordStockMovement({
      part,
      type: 'RECEIVED',
      quantity: qty,
      previousTotal: prevTotal,
      newTotal: part.totalQuantity,
      previousReserved: prevReserved,
      newReserved: prevReserved,
      referenceType: 'PurchaseRequest',
      referenceId: referenceNumber || 'MANUAL-RECEIPT',
      performedBy: req.user?._id,
      performedByName: req.user?.name || 'Manager',
      reason: notes || `Direct manual stock intake (${referenceNumber || 'N/A'})`,
    });

    // Check waiting repair jobs
    const fulfilledJobs = await checkAndFulfillWaitingJobs(part._id, req.user);

    const updatedPart = await Part.findById(part._id).populate('supplier', 'name supplierId');

    res.status(200).json({
      success: true,
      message: `Received ${qty} units of ${part.name}`,
      part: updatedPart,
      movement,
      fulfilledJobs: fulfilledJobs.map((j) => ({
        jobId: j.jobId,
        customerName: j.customerName,
        status: j.status,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const getAlerts = async (req, res, next) => {
  try {
    const parts = await Part.find({ isActive: true }).populate('supplier', 'name email phone');

    const lowStockParts = [];
    const outOfStockParts = [];

    parts.forEach((p) => {
      const available = p.totalQuantity - p.reservedQuantity;
      if (available <= 0) {
        outOfStockParts.push({
          part: p,
          available,
          shortageNeeded: p.minimumStockLevel,
          type: 'OUT_OF_STOCK',
          urgency: 'CRITICAL',
        });
      } else if (available <= p.minimumStockLevel) {
        lowStockParts.push({
          part: p,
          available,
          shortageNeeded: p.minimumStockLevel - available,
          type: 'LOW_STOCK',
          urgency: 'WARNING',
        });
      }
    });

    // Jobs waiting for parts
    const waitingJobs = await RepairJob.find({ status: 'Waiting for Parts' })
      .populate('requiredParts.part', 'name sku totalQuantity reservedQuantity minimumStockLevel');

    const waitingJobAlerts = waitingJobs.map((job) => {
      const shortages = job.requiredParts
        .filter((item) => (item.quantityReserved || 0) < item.quantityRequired)
        .map((item) => {
          const avail = item.part
            ? Math.max(0, item.part.totalQuantity - item.part.reservedQuantity)
            : 0;
          return {
            partId: item.part?._id,
            partName: item.partName,
            sku: item.sku,
            needed: item.quantityRequired - (item.quantityReserved || 0),
            availableInStock: avail,
          };
        });

      return {
        jobId: job.jobId,
        customerName: job.customerName,
        registrationNumber: job.registrationNumber,
        priority: job.priority,
        createdAt: job.createdAt,
        shortages,
      };
    });

    res.status(200).json({
      success: true,
      outOfStockCount: outOfStockParts.length,
      lowStockCount: lowStockParts.length,
      waitingJobsCount: waitingJobs.length,
      outOfStockParts,
      lowStockParts,
      waitingJobs: waitingJobAlerts,
    });
  } catch (error) {
    next(error);
  }
};
