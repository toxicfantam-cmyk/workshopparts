import Supplier from '../models/Supplier.js';
import Part from '../models/Part.js';
import PurchaseRequest from '../models/PurchaseRequest.js';

let supplierCounter = 1;

const generateSupplierId = async () => {
  const count = await Supplier.countDocuments();
  const nextNum = (count + supplierCounter++).toString().padStart(3, '0');
  return `SUP-${nextNum}`;
};

export const getSuppliers = async (req, res, next) => {
  try {
    const { search, category } = req.query;
    const query = { isActive: true };

    if (category && category !== 'all') {
      query.categories = category;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { supplierId: searchRegex },
        { name: searchRegex },
        { contactPerson: searchRegex },
        { email: searchRegex },
        { 'address.city': searchRegex },
      ];
    }

    const suppliers = await Supplier.find(query).sort({ name: 1 });

    // Attach parts count and active orders count for each supplier
    const enriched = await Promise.all(
      suppliers.map(async (s) => {
        const partsCount = await Part.countDocuments({ supplier: s._id, isActive: true });
        const activeOrdersCount = await PurchaseRequest.countDocuments({
          supplier: s._id,
          status: { $in: ['Approved', 'Ordered', 'Partially Received'] },
        });

        return {
          ...s.toObject(),
          partsCount,
          activeOrdersCount,
        };
      })
    );

    res.status(200).json({
      success: true,
      suppliers: enriched,
    });
  } catch (error) {
    next(error);
  }
};

export const getSupplierById = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const parts = await Part.find({ supplier: supplier._id, isActive: true }).sort({ name: 1 });
    const purchaseOrders = await PurchaseRequest.find({ supplier: supplier._id })
      .sort({ createdAt: -1 })
      .limit(20);

    const totalOrdersValue = purchaseOrders.reduce(
      (sum, po) => sum + (po.totalEstimatedCost || 0),
      0
    );

    res.status(200).json({
      success: true,
      supplier,
      parts,
      purchaseOrders,
      stats: {
        totalParts: parts.length,
        totalOrders: purchaseOrders.length,
        totalOrdersValue,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createSupplier = async (req, res, next) => {
  try {
    const {
      name,
      contactPerson,
      phone,
      email,
      address,
      categories,
      rating = 4.5,
      paymentTerms = 'Net 30',
      notes,
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Supplier company name is required' });
    }

    const supplierId = await generateSupplierId();

    const supplier = new Supplier({
      supplierId,
      name: name.trim(),
      contactPerson: contactPerson ? contactPerson.trim() : '',
      phone: phone ? phone.trim() : '',
      email: email ? email.trim() : '',
      address: address || { street: '', city: 'Mumbai', state: 'Maharashtra', postalCode: '' },
      categories: Array.isArray(categories)
        ? categories
        : typeof categories === 'string'
        ? categories.split(',').map((c) => c.trim()).filter(Boolean)
        : [],
      rating: Number(rating) || 4.5,
      paymentTerms,
      notes,
    });

    await supplier.save();

    res.status(201).json({
      success: true,
      message: `Supplier ${supplier.name} added successfully`,
      supplier,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const {
      name,
      contactPerson,
      phone,
      email,
      address,
      categories,
      rating,
      paymentTerms,
      notes,
    } = req.body;

    if (name) supplier.name = name.trim();
    if (contactPerson !== undefined) supplier.contactPerson = contactPerson.trim();
    if (phone !== undefined) supplier.phone = phone.trim();
    if (email !== undefined) supplier.email = email.trim();
    if (address) supplier.address = address;
    if (categories !== undefined) {
      supplier.categories = Array.isArray(categories)
        ? categories
        : typeof categories === 'string'
        ? categories.split(',').map((c) => c.trim()).filter(Boolean)
        : [];
    }
    if (rating !== undefined) supplier.rating = Number(rating);
    if (paymentTerms !== undefined) supplier.paymentTerms = paymentTerms;
    if (notes !== undefined) supplier.notes = notes;

    await supplier.save();

    res.status(200).json({
      success: true,
      message: 'Supplier updated successfully',
      supplier,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    // Check if supplier has active parts
    const partsCount = await Part.countDocuments({ supplier: supplier._id, isActive: true });
    if (partsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete supplier: ${partsCount} parts are linked to this supplier. Please reassign or delete the parts first.`,
      });
    }

    supplier.isActive = false;
    await supplier.save();

    res.status(200).json({
      success: true,
      message: `Supplier ${supplier.name} deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
};
