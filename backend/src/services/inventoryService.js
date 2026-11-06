import Part from '../models/Part.js';
import StockMovement from '../models/StockMovement.js';
import RepairJob from '../models/RepairJob.js';

let movementCounter = 1;

export const generateMovementId = async () => {
  const count = await StockMovement.countDocuments();
  const nextNum = (count + movementCounter++).toString().padStart(5, '0');
  return `MOV-${new Date().getFullYear()}-${nextNum}`;
};

/**
 * Record an auditable stock movement
 */
export const recordStockMovement = async ({
  part,
  type,
  quantity,
  previousTotal,
  newTotal,
  previousReserved,
  newReserved,
  referenceType = 'ManualAdjustment',
  referenceId = '',
  referenceObjectId = null,
  performedBy = null,
  performedByName = 'System',
  reason = '',
}) => {
  const movementId = await generateMovementId();
  const movement = new StockMovement({
    movementId,
    part: part._id,
    partName: part.name,
    sku: part.sku,
    type,
    quantity,
    previousTotal,
    newTotal,
    previousReserved,
    newReserved,
    referenceType,
    referenceId,
    referenceObjectId,
    performedBy,
    performedByName,
    reason,
  });

  await movement.save();
  return movement;
};

/**
 * Check inventory availability for a list of required parts
 */
export const checkPartsAvailability = async (requiredParts = []) => {
  const partIds = requiredParts.map((item) => item.part);
  const parts = await Part.find({ _id: { $in: partIds } });
  const partMap = new Map(parts.map((p) => [p._id.toString(), p]));

  let allAvailable = true;
  const analysis = requiredParts.map((item) => {
    const part = partMap.get(item.part.toString());
    if (!part) {
      allAvailable = false;
      return {
        partId: item.part,
        partName: item.partName || 'Unknown Part',
        sku: item.sku || 'N/A',
        quantityRequired: item.quantityRequired,
        quantityReserved: item.quantityReserved || 0,
        availableInStock: 0,
        shortage: item.quantityRequired - (item.quantityReserved || 0),
        isFulfilled: false,
      };
    }

    const availableInStock = Math.max(0, part.totalQuantity - part.reservedQuantity);
    const unreservedNeeded = Math.max(0, item.quantityRequired - (item.quantityReserved || 0));
    const shortage = Math.max(0, unreservedNeeded - availableInStock);
    const isFulfilled = unreservedNeeded === 0;

    if (shortage > 0) {
      allAvailable = false;
    }

    return {
      partId: part._id,
      partName: part.name,
      sku: part.sku,
      unitPrice: part.sellingPrice,
      purchasePrice: part.purchasePrice,
      supplier: part.supplier,
      quantityRequired: item.quantityRequired,
      quantityReserved: item.quantityReserved || 0,
      availableInStock,
      shortage,
      isFulfilled,
    };
  });

  return {
    allAvailable,
    analysis,
  };
};

/**
 * Reserve available parts for a repair job
 */
export const reservePartsForJob = async (job, user = null) => {
  let anyShortage = false;

  for (let i = 0; i < job.requiredParts.length; i++) {
    const item = job.requiredParts[i];
    const part = await Part.findById(item.part);
    if (!part) continue;

    const unreservedNeeded = Math.max(0, item.quantityRequired - (item.quantityReserved || 0));
    if (unreservedNeeded <= 0) {
      item.isReserved = true;
      continue;
    }

    const available = Math.max(0, part.totalQuantity - part.reservedQuantity);
    const quantityToReserve = Math.min(available, unreservedNeeded);

    if (quantityToReserve > 0) {
      const prevReserved = part.reservedQuantity;
      part.reservedQuantity += quantityToReserve;
      item.quantityReserved = (item.quantityReserved || 0) + quantityToReserve;

      await part.save();

      await recordStockMovement({
        part,
        type: 'RESERVED',
        quantity: quantityToReserve,
        previousTotal: part.totalQuantity,
        newTotal: part.totalQuantity,
        previousReserved: prevReserved,
        newReserved: part.reservedQuantity,
        referenceType: 'RepairJob',
        referenceId: job.jobId,
        referenceObjectId: job._id,
        performedBy: user?._id,
        performedByName: user?.name || 'System',
        reason: `Reserved for Repair Job ${job.jobId} (${job.customerName})`,
      });
    }

    if (item.quantityReserved >= item.quantityRequired) {
      item.isReserved = true;
    } else {
      item.isReserved = false;
      anyShortage = true;
    }
  }

  // Determine status
  if (anyShortage) {
    job.status = 'Waiting for Parts';
  } else if (job.status === 'Waiting for Parts' || job.status === 'New') {
    job.status = 'In Progress';
  }

  await job.save();
  return { job, anyShortage };
};

/**
 * Release reserved parts back to available pool (e.g. if job is cancelled or items removed)
 */
export const releasePartsForJob = async (job, user = null, reason = 'Job cancelled or updated') => {
  for (let i = 0; i < job.requiredParts.length; i++) {
    const item = job.requiredParts[i];
    if (item.quantityReserved > 0) {
      const part = await Part.findById(item.part);
      if (part) {
        const prevReserved = part.reservedQuantity;
        part.reservedQuantity = Math.max(0, part.reservedQuantity - item.quantityReserved);
        await part.save();

        await recordStockMovement({
          part,
          type: 'RELEASED',
          quantity: item.quantityReserved,
          previousTotal: part.totalQuantity,
          newTotal: part.totalQuantity,
          previousReserved: prevReserved,
          newReserved: part.reservedQuantity,
          referenceType: 'RepairJob',
          referenceId: job.jobId,
          referenceObjectId: job._id,
          performedBy: user?._id,
          performedByName: user?.name || 'System',
          reason: `${reason} - ${job.jobId}`,
        });
      }

      item.quantityReserved = 0;
      item.isReserved = false;
    }
  }

  await job.save();
  return job;
};

/**
 * Issue reserved parts permanently from stock when job is Completed
 */
export const issuePartsForJob = async (job, user = null) => {
  for (let i = 0; i < job.requiredParts.length; i++) {
    const item = job.requiredParts[i];
    const qtyToIssue = item.quantityReserved || item.quantityRequired;
    
    const part = await Part.findById(item.part);
    if (part && qtyToIssue > 0) {
      const prevTotal = part.totalQuantity;
      const prevReserved = part.reservedQuantity;

      // Deduct from both total and reserved
      part.totalQuantity = Math.max(0, part.totalQuantity - qtyToIssue);
      part.reservedQuantity = Math.max(0, part.reservedQuantity - (item.quantityReserved || 0));
      await part.save();

      await recordStockMovement({
        part,
        type: 'ISSUED',
        quantity: qtyToIssue,
        previousTotal: prevTotal,
        newTotal: part.totalQuantity,
        previousReserved: prevReserved,
        newReserved: part.reservedQuantity,
        referenceType: 'RepairJob',
        referenceId: job.jobId,
        referenceObjectId: job._id,
        performedBy: user?._id,
        performedByName: user?.name || 'System',
        reason: `Parts consumed for completed job ${job.jobId} (${job.customerName})`,
      });
    }
  }

  job.completedDate = new Date();
  await job.save();
  return job;
};

/**
 * Check and resolve waiting repair jobs when new stock arrives
 */
export const checkAndFulfillWaitingJobs = async (partId, user = null) => {
  // Find jobs waiting for parts that require this part
  const waitingJobs = await RepairJob.find({
    status: 'Waiting for Parts',
    'requiredParts.part': partId,
  }).sort({ priority: -1, createdAt: 1 }); // Urgent & older jobs get priority

  const updatedJobs = [];

  for (const job of waitingJobs) {
    const { anyShortage } = await reservePartsForJob(job, user);
    if (!anyShortage && job.status === 'In Progress') {
      updatedJobs.push(job);
    }
  }

  return updatedJobs;
};
