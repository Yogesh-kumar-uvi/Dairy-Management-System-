import mongoose from 'mongoose';

// Fat/SNF range -> Rate mapping, admin configurable
const rateChartSchema = new mongoose.Schema(
  {
    fatMin: { type: Number, required: true, min: 0, max: 15 },
    fatMax: { type: Number, required: true, min: 0, max: 15 },
    snfMin: { type: Number, required: true, min: 0, max: 15 },
    snfMax: { type: Number, required: true, min: 0, max: 15 },
    rate: { type: Number, required: true, min: 0, max: 1000 },
    milkType: { type: String, enum: ['cow', 'buffalo', 'mixed', 'any'], default: 'any' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

export default mongoose.model('RateChart', rateChartSchema);
