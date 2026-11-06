import mongoose from 'mongoose';

const purchaseItemSchema = new mongoose.Schema(
  {
    part: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Part',
      required: true,
    },
    partName: {
      type: String,
      required: true,
    },
    sku: {
      type: String,
      required: true,
    },
    quantityRequested: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    quantityReceived: {
      type: Number,
      default: 0,
      min: 0,
    },
    estimatedUnitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: true }
);

const purchaseRequestSchema = new mongoose.Schema(
  {
    requestNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Supplier is required'],
    },
    supplierName: {
      type: String,
      trim: true,
    },
    items: [purchaseItemSchema],
    totalEstimatedCost: {
      type: Number,
      required: true,
      min: 0,
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: [
        'Draft',
        'Pending Approval',
        'Approved',
        'Ordered',
        'Partially Received',
        'Received',
        'Rejected',
        'Cancelled',
      ],
      default: 'Pending Approval',
    },
    reason: {
      type: String,
      trim: true,
    },
    linkedRepairJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RepairJob',
    },
    linkedJobId: {
      type: String,
      trim: true,
    },
    orderDate: {
      type: Date,
    },
    expectedDeliveryDate: {
      type: Date,
    },
    receivedDate: {
      type: Date,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    requestedByName: {
      type: String,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedByName: {
      type: String,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual to check if all items are fully received
purchaseRequestSchema.virtual('isFullyReceived').get(function () {
  if (!this.items || this.items.length === 0) return false;
  return this.items.every(
    (item) => (item.quantityReceived || 0) >= item.quantityRequested
  );
});

purchaseRequestSchema.index({ status: 1 });
purchaseRequestSchema.index({ supplier: 1 });
purchaseRequestSchema.index({ linkedRepairJob: 1 });

const PurchaseRequest = mongoose.model('PurchaseRequest', purchaseRequestSchema);
export default PurchaseRequest;
