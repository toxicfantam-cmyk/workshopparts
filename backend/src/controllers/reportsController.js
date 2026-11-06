import Part from '../models/Part.js';
import RepairJob from '../models/RepairJob.js';
import PurchaseRequest from '../models/PurchaseRequest.js';
import StockMovement from '../models/StockMovement.js';
import Supplier from '../models/Supplier.js';

export const getInventoryValuationReport = async (req, res, next) => {
  try {
    const { category } = req.query;
    const filter = { isActive: true };
    if (category && category !== 'all') filter.category = category;

    const parts = await Part.find(filter).populate('supplier', 'name');

    let totalCostValuation = 0;
    let totalRetailValuation = 0;
    let totalStockUnits = 0;

    const items = parts.map((part) => {
      const available = Math.max(0, part.totalQuantity - part.reservedQuantity);
      const costValue = part.totalQuantity * part.purchasePrice;
      const retailValue = part.totalQuantity * part.sellingPrice;
      const potentialProfit = retailValue - costValue;
      const marginPercent = retailValue > 0 ? ((potentialProfit / retailValue) * 100).toFixed(1) : 0;

      totalCostValuation += costValue;
      totalRetailValuation += retailValue;
      totalStockUnits += part.totalQuantity;

      return {
        _id: part._id,
        sku: part.sku,
        name: part.name,
        category: part.category,
        brand: part.brand,
        supplierName: part.supplier ? part.supplier.name : 'N/A',
        totalQuantity: part.totalQuantity,
        reservedQuantity: part.reservedQuantity,
        availableQuantity: available,
        purchasePrice: part.purchasePrice,
        sellingPrice: part.sellingPrice,
        costValue,
        retailValue,
        marginPercent,
      };
    });

    res.status(200).json({
      success: true,
      summary: {
        totalCostValuation,
        totalRetailValuation,
        totalStockUnits,
        totalPartsCount: items.length,
        potentialGrossProfit: totalRetailValuation - totalCostValuation,
      },
      items,
    });
  } catch (error) {
    next(error);
  }
};

export const getPartsConsumptionReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { type: 'ISSUED' };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const consumptionAgg = await StockMovement.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$part',
          partName: { $first: '$partName' },
          sku: { $first: '$sku' },
          totalQuantityIssued: { $sum: '$quantity' },
          timesIssued: { $sum: 1 },
          lastIssuedDate: { $max: '$createdAt' },
        },
      },
      { $sort: { totalQuantityIssued: -1 } },
    ]);

    // Attach prices and calculate value consumed
    const enriched = await Promise.all(
      consumptionAgg.map(async (row) => {
        const part = await Part.findById(row._id);
        const costPrice = part ? part.purchasePrice : 0;
        const sellingPrice = part ? part.sellingPrice : 0;
        return {
          ...row,
          category: part ? part.category : 'N/A',
          totalCostConsumed: row.totalQuantityIssued * costPrice,
          totalRetailBilled: row.totalQuantityIssued * sellingPrice,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: enriched,
    });
  } catch (error) {
    next(error);
  }
};

export const getWaitingJobsReport = async (req, res, next) => {
  try {
    const waitingJobs = await RepairJob.find({ status: 'Waiting for Parts' })
      .populate('assignedTechnician', 'name email')
      .populate('requiredParts.part', 'name sku totalQuantity reservedQuantity sellingPrice purchasePrice supplier')
      .sort({ createdAt: -1 });

    const report = waitingJobs.map((job) => {
      const daysWaiting = Math.round((Date.now() - new Date(job.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      const missingParts = job.requiredParts
        .filter((item) => (item.quantityReserved || 0) < item.quantityRequired)
        .map((item) => {
          const avail = item.part ? Math.max(0, item.part.totalQuantity - item.part.reservedQuantity) : 0;
          return {
            partName: item.partName,
            sku: item.sku,
            needed: item.quantityRequired,
            reserved: item.quantityReserved || 0,
            shortage: item.quantityRequired - (item.quantityReserved || 0),
            inStock: avail,
          };
        });

      return {
        jobId: job.jobId,
        customerName: job.customerName,
        customerPhone: job.customerPhone,
        registrationNumber: job.registrationNumber,
        vehicle: `${job.vehicleDetails?.make || ''} ${job.vehicleDetails?.model || ''}`,
        priority: job.priority,
        technicianName: job.assignedTechnician ? job.assignedTechnician.name : 'Unassigned',
        daysWaiting,
        missingPartsCount: missingParts.length,
        missingParts,
        createdAt: job.createdAt,
      };
    });

    res.status(200).json({
      success: true,
      count: report.length,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

export const getPurchaseSpendingReport = async (req, res, next) => {
  try {
    const prs = await PurchaseRequest.find({
      status: { $in: ['Ordered', 'Partially Received', 'Received'] },
    }).populate('supplier', 'name');

    let totalSpent = 0;
    const spendBySupplier = {};
    const spendByMonth = {};

    prs.forEach((pr) => {
      const cost = pr.totalEstimatedCost || 0;
      totalSpent += cost;

      const supName = pr.supplierName || (pr.supplier ? pr.supplier.name : 'Other');
      spendBySupplier[supName] = (spendBySupplier[supName] || 0) + cost;

      const month = new Date(pr.createdAt).toISOString().substring(0, 7);
      spendByMonth[month] = (spendByMonth[month] || 0) + cost;
    });

    res.status(200).json({
      success: true,
      totalSpent,
      totalOrders: prs.length,
      spendBySupplier: Object.entries(spendBySupplier).map(([supplier, amount]) => ({ supplier, amount })),
      spendByMonth: Object.entries(spendByMonth).map(([month, amount]) => ({ month, amount })),
      orders: prs,
    });
  } catch (error) {
    next(error);
  }
};
