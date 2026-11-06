import mongoose from 'mongoose';

const partSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: [true, 'Part SKU is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Part name is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'Brakes',
        'Engine',
        'Suspension',
        'Electrical',
        'Transmission',
        'Filters',
        'Fluids',
        'Exhaust',
        'Body & Lighting',
        'Accessories',
        'Other',
      ],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    brand: {
      type: String,
      required: [true, 'Brand/Manufacturer is required'],
      trim: true,
    },
    compatibleVehicles: [
      {
        type: String,
        trim: true,
      },
    ],
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Supplier is required'],
    },
    purchasePrice: {
      type: Number,
      required: [true, 'Purchase price is required'],
      min: [0, 'Purchase price cannot be negative'],
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative'],
    },
    totalQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Total quantity cannot be negative'],
    },
    reservedQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Reserved quantity cannot be negative'],
    },
    minimumStockLevel: {
      type: Number,
      required: true,
      default: 5,
      min: [0, 'Minimum stock level cannot be negative'],
    },
    storageLocation: {
      rack: { type: String, default: 'Rack A' },
      shelf: { type: String, default: 'Shelf 1' },
      bin: { type: String, default: 'Bin 01' },
    },
    unit: {
      type: String,
      default: 'pcs',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for available quantity
partSchema.virtual('availableQuantity').get(function () {
  return Math.max(0, (this.totalQuantity || 0) - (this.reservedQuantity || 0));
});

// Virtual for stock status
partSchema.virtual('stockStatus').get(function () {
  const available = (this.totalQuantity || 0) - (this.reservedQuantity || 0);
  if (available <= 0) return 'OUT_OF_STOCK';
  if (available <= (this.minimumStockLevel || 5)) return 'LOW_STOCK';
  return 'IN_STOCK';
});

// Indexes for fast searching and filtering
partSchema.index({ name: 'text', description: 'text', brand: 'text' });
partSchema.index({ category: 1 });
partSchema.index({ supplier: 1 });

const Part = mongoose.model('Part', partSchema);
export default Part;
