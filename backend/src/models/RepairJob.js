import mongoose from 'mongoose';

const requiredPartItemSchema = new mongoose.Schema(
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
    quantityRequired: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    quantityReserved: {
      type: Number,
      default: 0,
      min: 0,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    isReserved: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const repairJobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    customerPhone: {
      type: String,
      required: [true, 'Customer contact is required'],
      trim: true,
    },
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    vehicleDetails: {
      make: { type: String, required: true }, // e.g. Maruti Suzuki
      model: { type: String, required: true }, // e.g. Swift ZXi
      year: { type: Number, required: true }, // e.g. 2021
      vin: { type: String }, // optional VIN / chassis #
    },
    registrationNumber: {
      type: String,
      required: [true, 'Registration or serial number is required'],
      trim: true,
      uppercase: true,
    },
    assignedTechnician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    technicianName: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Job description is required'],
      trim: true,
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: [
        'New',
        'Inspection',
        'In Progress',
        'Waiting for Parts',
        'Ready for Delivery',
        'Completed',
        'Cancelled',
      ],
      default: 'New',
    },
    requiredParts: [requiredPartItemSchema],
    estimatedLaborCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPartsCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalEstimatedCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    expectedCompletionDate: {
      type: Date,
    },
    completedDate: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual to check if all parts are fully reserved
repairJobSchema.virtual('areAllPartsReserved').get(function () {
  if (!this.requiredParts || this.requiredParts.length === 0) return true;
  return this.requiredParts.every(
    (item) => (item.quantityReserved || 0) >= item.quantityRequired
  );
});

// Indexes
repairJobSchema.index({ status: 1 });
repairJobSchema.index({ assignedTechnician: 1 });
repairJobSchema.index({ registrationNumber: 1 });

const RepairJob = mongoose.model('RepairJob', repairJobSchema);
export default RepairJob;
