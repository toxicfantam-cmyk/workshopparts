import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema(
  {
    supplierId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
    },
    contactPerson: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
    },
    categories: [
      {
        type: String,
        trim: true,
      },
    ],
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 4.5,
    },
    paymentTerms: {
      type: String,
      default: 'Net 30',
    },
    notes: {
      type: String,
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

// Virtual for supplied parts count (can be populated if needed)
supplierSchema.virtual('parts', {
  ref: 'Part',
  localField: '_id',
  foreignField: 'supplier',
});

const Supplier = mongoose.model('Supplier', supplierSchema);
export default Supplier;
