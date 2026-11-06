import Part from '../models/Part.js';
import RepairJob from '../models/RepairJob.js';
import PurchaseRequest from '../models/PurchaseRequest.js';
import StockMovement from '../models/StockMovement.js';

export const getDashboardStats = async (req, res, next) => {
  try {
    const parts = await Part.find({ isActive: true });

    let totalPartsCount = parts.length;
    let totalStockUnits = 0;
    let totalStockValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const categoryDistributionMap = {};

    parts.forEach((part) => {
      totalStockUnits += part.totalQuantity;
      totalStockValue += part.totalQuantity * part.purchasePrice;

      const available = part.totalQuantity - part.reservedQuantity;
      if (available <= 0) {
        outOfStockCount++;
      } else if (available <= part.minimumStockLevel) {
        lowStockCount++;
      }

      // Group by category
      if (!categoryDistributionMap[part.category]) {
        categoryDistributionMap[part.category] = {
          category: part.category,
          count: 0,
          value: 0,
        };
      }
      categoryDistributionMap[part.category].count += 1;
      categoryDistributionMap[part.category].value += part.totalQuantity * part.purchasePrice;
    });

    const categoryDistribution = Object.values(categoryDistributionMap);

    // Active repair jobs
    const activeRepairJobsCount = await RepairJob.countDocuments({
      status: { $in: ['New', 'Inspection', 'In Progress', 'Waiting for Parts'] },
    });

    const waitingForPartsJobsCount = await RepairJob.countDocuments({
      status: 'Waiting for Parts',
    });

    const pendingPurchaseRequestsCount = await PurchaseRequest.countDocuments({
      status: { $in: ['Pending Approval', 'Approved', 'Ordered', 'Partially Received'] },
    });

    // Repair Job Status Breakdown for Chart
    const jobStatusAgg = await RepairJob.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const jobStatuses = [
      'New',
      'Inspection',
      'In Progress',
      'Waiting for Parts',
      'Ready for Delivery',
      'Completed',
    ];
    const jobStatusData = jobStatuses.map((st) => {
      const found = jobStatusAgg.find((g) => g._id === st);
      return { status: st, count: found ? found.count : 0 };
    });

    // Stock Movement History for Chart (last 6 months or recent timeline)
    const movementsAgg = await StockMovement.aggregate([
      {
        $group: {
          _id: {
            month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            type: '$type',
          },
          totalQty: { $sum: '$quantity' },
        },
      },
      { $sort: { '_id.month': 1 } },
    ]);

    // Group into monthly timeline
    const monthsMap = {};
    movementsAgg.forEach((item) => {
      const month = item._id.month;
      if (!monthsMap[month]) {
        monthsMap[month] = { month, received: 0, issued: 0, adjusted: 0 };
      }
      if (item._id.type === 'RECEIVED') {
        monthsMap[month].received += item.totalQty;
      } else if (item._id.type === 'ISSUED') {
        monthsMap[month].issued += item.totalQty;
      } else {
        monthsMap[month].adjusted += item.totalQty;
      }
    });

    const movementChartData = Object.values(monthsMap).slice(-6);

    // Recent stock movements (latest 6)
    const recentMovements = await StockMovement.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .populate('performedBy', 'name');

    // Recently updated repair jobs (latest 5)
    const recentJobs = await RepairJob.find()
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate('assignedTechnician', 'name');

    // Low stock items preview
    const criticalAlerts = parts
      .filter((p) => p.totalQuantity - p.reservedQuantity <= p.minimumStockLevel)
      .slice(0, 5)
      .map((p) => ({
        _id: p._id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        available: p.totalQuantity - p.reservedQuantity,
        minimumStockLevel: p.minimumStockLevel,
        purchasePrice: p.purchasePrice,
        isOut: p.totalQuantity - p.reservedQuantity <= 0,
      }));

    res.status(200).json({
      success: true,
      stats: {
        totalPartsCount,
        totalStockUnits,
        totalStockValue,
        lowStockCount,
        outOfStockCount,
        activeRepairJobsCount,
        waitingForPartsJobsCount,
        pendingPurchaseRequestsCount,
      },
      charts: {
        categoryDistribution,
        jobStatusData,
        movementChartData,
      },
      recentMovements,
      recentJobs,
      criticalAlerts,
    });
  } catch (error) {
    next(error);
  }
};
