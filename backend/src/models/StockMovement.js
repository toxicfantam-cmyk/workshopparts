import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema(
  {
    movementId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
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
    type: {
      type: String,
      required: true,
      enum: [
        'RECEIVED',
        'ISSUED',
        'ADJUSTMENT_INCREASE',
        'ADJUSTMENT_DECREASE',
        'RESERVED',
        'RELEASED',
      ],
    },
    quantity: {
      type: Number,
      required: true,
    },
    previousTotal: {
      type: Number,
      required: true,
    },
    newTotal: {
      type: Number,
      required: true,
    },
    previousReserved: {
      type: Number,
      required: true,
      default: 0,
    },
    newReserved: {
      type: Number,
      required: true,
      default: 0,
    },
    referenceType: {
      type: String,
      enum: ['PurchaseRequest', 'RepairJob', 'ManualAdjustment', 'InitialStock'],
      default: 'ManualAdjustment',
    },
    referenceId: {
      type: String,
      trim: true,
    },
    referenceObjectId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    performedByName: {
      type: String,
      default: 'System',
    },
    reason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

stockMovementSchema.index({ part: 1 });
stockMovementSchema.index({ type: 1 });
stockMovementSchema.index({ createdAt: -1 });

const StockMovement = mongoose.model('StockMovement', stockMovementSchema);
export default StockMovement;
