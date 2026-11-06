import PurchaseRequest from '../models/PurchaseRequest.js';
import Part from '../models/Part.js';
import Supplier from '../models/Supplier.js';
import RepairJob from '../models/RepairJob.js';
import { recordStockMovement, checkAndFulfillWaitingJobs } from '../services/inventoryService.js';

let requestCounter = 1;

const generateRequestNumber = async () => {
  const count = await PurchaseRequest.countDocuments();
  const nextNum = (count + requestCounter++).toString().padStart(4, '0');
  return `PR-${new Date().getFullYear()}-${nextNum}`;
};

export const getPurchaseRequests = async (req, res, next) => {
  try {
    const {
      status,
      priority,
      supplierId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    if (supplierId && supplierId !== 'all') {
      query.supplier = supplierId;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { requestNumber: searchRegex },
        { supplierName: searchRegex },
        { reason: searchRegex },
        { linkedJobId: searchRegex },
      ];
    }

    const total = await PurchaseRequest.countDocuments(query);
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;

    const sortOption = {};
    sortOption[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const requests = await PurchaseRequest.find(query)
      .populate('supplier', 'name supplierId contactPerson phone email')
      .populate('requestedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('items.part', 'name sku totalQuantity reservedQuantity minimumStockLevel')
      .sort(sortOption)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      data: requests,
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

export const getPurchaseRequestById = async (req, res, next) => {
  try {
    const pr = await PurchaseRequest.findById(req.params.id)
      .populate('supplier')
      .populate('requestedBy', 'name email role')
      .populate('approvedBy', 'name email role')
      .populate('linkedRepairJob')
      .populate('items.part');

    if (!pr) {
      return res.status(404).json({ success: false, message: 'Purchase request not found' });
    }

    res.status(200).json({
      success: true,
      purchaseRequest: pr,
    });
  } catch (error) {
    next(error);
  }
};

export const createPurchaseRequest = async (req, res, next) => {
  try {
    const {
      supplierId,
      items = [],
      priority = 'Medium',
      reason,
      linkedRepairJobId,
      expectedDeliveryDate,
      notes,
    } = req.body;

    if (!supplierId) {
      return res.status(400).json({ success: false, message: 'Supplier is required' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one part item is required' });
    }

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    let linkedJob = null;
    if (linkedRepairJobId) {
      linkedJob = await RepairJob.findById(linkedRepairJobId);
    }

    let totalEstimatedCost = 0;
    const processedItems = [];

    for (const item of items) {
      const part = await Part.findById(item.partId || item.part);
      if (part) {
        const qty = Number(item.quantityRequested || item.quantity) || 1;
        const unitPrice = Number(item.estimatedUnitPrice || item.unitPrice || part.purchasePrice);
        const totalPrice = qty * unitPrice;
        totalEstimatedCost += totalPrice;

        processedItems.push({
          part: part._id,
          partName: part.name,
          sku: part.sku,
          quantityRequested: qty,
          quantityReceived: 0,
          estimatedUnitPrice: unitPrice,
          totalPrice,
        });
      }
    }

    const requestNumber = await generateRequestNumber();

    const pr = new PurchaseRequest({
      requestNumber,
      supplier: supplier._id,
      supplierName: supplier.name,
      items: processedItems,
      totalEstimatedCost,
      priority,
      status: 'Pending Approval',
      reason: reason || (linkedJob ? `Shortage for Job ${linkedJob.jobId}` : 'Inventory replenishment'),
      linkedRepairJob: linkedJob ? linkedJob._id : null,
      linkedJobId: linkedJob ? linkedJob.jobId : null,
      expectedDeliveryDate: expectedDeliveryDate || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      requestedBy: req.user?._id,
      requestedByName: req.user?.name || 'Manager',
      notes,
    });

    await pr.save();

    const populatedPr = await PurchaseRequest.findById(pr._id)
      .populate('supplier')
      .populate('items.part');

    res.status(201).json({
      success: true,
      message: `Purchase Request ${pr.requestNumber} created successfully`,
      purchaseRequest: populatedPr,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePurchaseRequestStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const pr = await PurchaseRequest.findById(req.params.id);
    if (!pr) {
      return res.status(404).json({ success: false, message: 'Purchase request not found' });
    }

    const validStatuses = [
      'Draft',
      'Pending Approval',
      'Approved',
      'Ordered',
      'Partially Received',
      'Received',
      'Rejected',
      'Cancelled',
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    if (status === 'Approved') {
      pr.approvedBy = req.user?._id;
      pr.approvedByName = req.user?.name;
    } else if (status === 'Ordered') {
      pr.orderDate = new Date();
    }

    pr.status = status;
    if (notes) pr.notes = notes;

    await pr.save();

    const updated = await PurchaseRequest.findById(pr._id).populate('supplier').populate('items.part');

    res.status(200).json({
      success: true,
      message: `Purchase request status changed to '${status}'`,
      purchaseRequest: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Receive Stock for a Purchase Request (Full or Partial)
 */
export const receivePurchaseOrderStock = async (req, res, next) => {
  try {
    const { receivedItems = [], deliveryNoteNumber, notes } = req.body;
    const pr = await PurchaseRequest.findById(req.params.id);
    if (!pr) {
      return res.status(404).json({ success: false, message: 'Purchase request not found' });
    }

    if (pr.status !== 'Ordered' && pr.status !== 'Partially Received' && pr.status !== 'Approved') {
      return res.status(400).json({
        success: false,
        message: `Cannot receive stock for purchase request in '${pr.status}' status. Must be Approved or Ordered.`,
      });
    }

    const receivedMap = new Map();
    receivedItems.forEach((item) => {
      receivedMap.set(item.partId?.toString() || item.part?.toString(), Number(item.quantityReceived) || 0);
    });

    const affectedPartIds = [];
    let anyReceived = false;

    for (let i = 0; i < pr.items.length; i++) {
      const item = pr.items[i];
      const partIdStr = item.part.toString();
      const qtyToReceive = receivedMap.has(partIdStr)
        ? receivedMap.get(partIdStr)
        : 0;

      if (qtyToReceive > 0) {
        anyReceived = true;
        const part = await Part.findById(item.part);
        if (part) {
          const prevTotal = part.totalQuantity;
          const prevReserved = part.reservedQuantity;

          // Increase stock
          part.totalQuantity += qtyToReceive;
          await part.save();

          // Update item received count
          item.quantityReceived = (item.quantityReceived || 0) + qtyToReceive;

          // Record stock movement
          await recordStockMovement({
            part,
            type: 'RECEIVED',
            quantity: qtyToReceive,
            previousTotal: prevTotal,
            newTotal: part.totalQuantity,
            previousReserved: prevReserved,
            newReserved: prevReserved,
            referenceType: 'PurchaseRequest',
            referenceId: pr.requestNumber,
            referenceObjectId: pr._id,
            performedBy: req.user?._id,
            performedByName: req.user?.name || 'Manager',
            reason: `Stock receipt for ${pr.requestNumber} (${deliveryNoteNumber ? 'DN: ' + deliveryNoteNumber : 'Standard receipt'})`,
          });

          affectedPartIds.push(part._id);
        }
      }
    }

    if (!anyReceived) {
      return res.status(400).json({
        success: false,
        message: 'No quantities specified to receive',
      });
    }

    // Determine PR final status
    const allItemsFulfilled = pr.items.every(
      (item) => (item.quantityReceived || 0) >= item.quantityRequested
    );

    pr.status = allItemsFulfilled ? 'Received' : 'Partially Received';
    if (allItemsFulfilled) {
      pr.receivedDate = new Date();
    }
    await pr.save();

    // Check and fulfill waiting repair jobs for each received part
    const promotedJobs = [];

    // First check linked repair job if any
    if (pr.linkedRepairJob) {
      const linkedJob = await RepairJob.findById(pr.linkedRepairJob);
      if (linkedJob && linkedJob.status === 'Waiting for Parts') {
        const { anyShortage } = await import('../services/inventoryService.js').then((m) =>
          m.reservePartsForJob(linkedJob, req.user)
        );
        if (!anyShortage && linkedJob.status === 'In Progress') {
          promotedJobs.push(linkedJob);
        }
      }
    }

    // Then check other waiting jobs for each affected part
    for (const partId of affectedPartIds) {
      const updated = await checkAndFulfillWaitingJobs(partId, req.user);
      updated.forEach((uj) => {
        if (!promotedJobs.some((pj) => pj._id.toString() === uj._id.toString())) {
          promotedJobs.push(uj);
        }
      });
    }

    const updatedPr = await PurchaseRequest.findById(pr._id)
      .populate('supplier')
      .populate('items.part');

    res.status(200).json({
      success: true,
      message: `Stock successfully received for ${pr.requestNumber}. Status updated to '${pr.status}'.`,
      purchaseRequest: updatedPr,
      promotedJobs: promotedJobs.map((j) => ({
        jobId: j.jobId,
        customerName: j.customerName,
        status: j.status,
      })),
    });
  } catch (error) {
    next(error);
  }
};
