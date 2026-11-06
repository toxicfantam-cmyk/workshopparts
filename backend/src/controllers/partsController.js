import Part from '../models/Part.js';
import RepairJob from '../models/RepairJob.js';
import StockMovement from '../models/StockMovement.js';
import { recordStockMovement } from '../services/inventoryService.js';

export const getParts = async (req, res, next) => {
  try {
    const {
      search,
      category,
      supplier,
      stockStatus,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
    } = req.query;

    const query = { isActive: true };

    if (category && category !== 'all') {
      query.category = category;
    }

    if (supplier && supplier !== 'all') {
      query.supplier = supplier;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { sku: searchRegex },
        { brand: searchRegex },
        { compatibleVehicles: searchRegex },
      ];
    }

    let parts = await Part.find(query).populate('supplier', 'name supplierId rating phone');

    // Filter by stock status if requested
    if (stockStatus && stockStatus !== 'all') {
      if (stockStatus === 'out_of_stock') {
        parts = parts.filter((p) => p.availableQuantity <= 0);
      } else if (stockStatus === 'low_stock') {
        parts = parts.filter((p) => p.availableQuantity > 0 && p.availableQuantity <= p.minimumStockLevel);
      } else if (stockStatus === 'in_stock') {
        parts = parts.filter((p) => p.availableQuantity > p.minimumStockLevel);
      }
    }

    // Sorting
    parts.sort((a, b) => {
      let fieldA, fieldB;
      if (sortBy === 'availableQuantity') {
        fieldA = a.availableQuantity;
        fieldB = b.availableQuantity;
      } else if (sortBy === 'price' || sortBy === 'sellingPrice') {
        fieldA = a.sellingPrice;
        fieldB = b.sellingPrice;
      } else if (sortBy === 'name') {
        fieldA = a.name.toLowerCase();
        fieldB = b.name.toLowerCase();
      } else {
        fieldA = a[sortBy] || a.createdAt;
        fieldB = b[sortBy] || b.createdAt;
      }

      if (sortOrder === 'asc') {
        return fieldA > fieldB ? 1 : -1;
      } else {
        return fieldA < fieldB ? 1 : -1;
      }
    });

    const total = parts.length;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedParts = parts.slice(startIndex, startIndex + limitNum);

    res.status(200).json({
      success: true,
      data: paginatedParts,
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

export const getPartById = async (req, res, next) => {
  try {
    const part = await Part.findById(req.params.id).populate('supplier');
    if (!part) {
      return res.status(404).json({ success: false, message: 'Part not found' });
    }

    // Find active repair jobs using this part
    const activeJobs = await RepairJob.find({
      'requiredParts.part': part._id,
      status: { $nin: ['Completed', 'Cancelled'] },
    }).select('jobId customerName status priority requiredParts createdAt');

    // Get recent stock movements for this part
    const recentMovements = await StockMovement.find({ part: part._id })
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      part,
      activeJobs,
      recentMovements,
    });
  } catch (error) {
    next(error);
  }
};

export const createPart = async (req, res, next) => {
  try {
    const {
      sku,
      name,
      category,
      description,
      brand,
      compatibleVehicles,
      supplier,
      purchasePrice,
      sellingPrice,
      totalQuantity = 0,
      minimumStockLevel = 5,
      storageLocation,
      unit = 'pcs',
    } = req.body;

    // Check SKU duplicate
    const existingSku = await Part.findOne({ sku: sku.toUpperCase().trim() });
    if (existingSku) {
      return res.status(400).json({ success: false, message: `Part with SKU '${sku}' already exists` });
    }

    const part = new Part({
      sku: sku.toUpperCase().trim(),
      name: name.trim(),
      category,
      description,
      brand,
      compatibleVehicles: Array.isArray(compatibleVehicles)
        ? compatibleVehicles
        : typeof compatibleVehicles === 'string'
        ? compatibleVehicles.split(',').map((v) => v.trim()).filter(Boolean)
        : [],
      supplier,
      purchasePrice: Number(purchasePrice),
      sellingPrice: Number(sellingPrice),
      totalQuantity: Number(totalQuantity) || 0,
      reservedQuantity: 0,
      minimumStockLevel: Number(minimumStockLevel) || 5,
      storageLocation: storageLocation || { rack: 'Rack A', shelf: 'Shelf 1', bin: 'Bin 01' },
      unit,
    });

    await part.save();

    // If initial stock was provided, record initial movement
    if (part.totalQuantity > 0) {
      await recordStockMovement({
        part,
        type: 'RECEIVED',
        quantity: part.totalQuantity,
        previousTotal: 0,
        newTotal: part.totalQuantity,
        previousReserved: 0,
        newReserved: 0,
        referenceType: 'InitialStock',
        referenceId: 'INITIAL-STOCK',
        performedBy: req.user?._id,
        performedByName: req.user?.name || 'Admin',
        reason: 'Initial stock intake at part creation',
      });
    }

    const populatedPart = await Part.findById(part._id).populate('supplier', 'name supplierId');

    res.status(201).json({
      success: true,
      message: 'Part created successfully',
      part: populatedPart,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePart = async (req, res, next) => {
  try {
    const part = await Part.findById(req.params.id);
    if (!part) {
      return res.status(404).json({ success: false, message: 'Part not found' });
    }

    const {
      name,
      category,
      description,
      brand,
      compatibleVehicles,
      supplier,
      purchasePrice,
      sellingPrice,
      minimumStockLevel,
      storageLocation,
      unit,
    } = req.body;

    if (name) part.name = name.trim();
    if (category) part.category = category;
    if (description !== undefined) part.description = description;
    if (brand) part.brand = brand;
    if (compatibleVehicles !== undefined) {
      part.compatibleVehicles = Array.isArray(compatibleVehicles)
        ? compatibleVehicles
        : typeof compatibleVehicles === 'string'
        ? compatibleVehicles.split(',').map((v) => v.trim()).filter(Boolean)
        : [];
    }
    if (supplier) part.supplier = supplier;
    if (purchasePrice !== undefined) part.purchasePrice = Number(purchasePrice);
    if (sellingPrice !== undefined) part.sellingPrice = Number(sellingPrice);
    if (minimumStockLevel !== undefined) part.minimumStockLevel = Number(minimumStockLevel);
    if (storageLocation) part.storageLocation = storageLocation;
    if (unit) part.unit = unit;

    await part.save();

    const updated = await Part.findById(part._id).populate('supplier', 'name supplierId');

    res.status(200).json({
      success: true,
      message: 'Part updated successfully',
      part: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deletePart = async (req, res, next) => {
  try {
    const part = await Part.findById(req.params.id);
    if (!part) {
      return res.status(404).json({ success: false, message: 'Part not found' });
    }

    // Check if there are active repair jobs using this part
    const activeJobs = await RepairJob.find({
      'requiredParts.part': part._id,
      status: { $nin: ['Completed', 'Cancelled'] },
    });

    if (activeJobs.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete part: It is currently required in ${activeJobs.length} active repair job(s) (${activeJobs.map((j) => j.jobId).join(', ')})`,
      });
    }

    if (part.reservedQuantity > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete part: It currently has ${part.reservedQuantity} reserved units.`,
      });
    }

    // Soft delete or hard delete
    part.isActive = false;
    await part.save();

    res.status(200).json({
      success: true,
      message: `Part ${part.sku} deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (req, res, next) => {
  try {
    const categories = await Part.distinct('category', { isActive: true });
    res.status(200).json({
      success: true,
      categories: categories.sort(),
    });
  } catch (error) {
    next(error);
  }
};
