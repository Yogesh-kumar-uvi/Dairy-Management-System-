import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // Customer code is immutable once set (also enforced in the route layer)
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, immutable: true, index: true },
    village: { type: String, trim: true },
    phone: { type: String, trim: true },
    joiningDate: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

customerSchema.index({ name: 'text', village: 'text' });

export default mongoose.model('Customer', customerSchema);
