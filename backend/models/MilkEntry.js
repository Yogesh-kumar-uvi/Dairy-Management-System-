import mongoose from 'mongoose';

const milkEntrySchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    session: { type: String, enum: ['morning', 'evening'], required: true },
    milkType: { type: String, enum: ['cow', 'buffalo', 'mixed'], required: true },
    fat: { type: Number, required: true, min: 0, max: 15 },
    snf: { type: Number, required: true, min: 0, max: 15 },
    clr: { type: Number, min: 0, max: 40 },
    rate: { type: Number, required: true, min: 0, max: 1000 },
    quantity: { type: Number, required: true, min: 0.1, max: 1000 },
    // Always computed on the server - client-sent amount is ignored
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true, default: Date.now, index: true },
    time: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

milkEntrySchema.pre('validate', function (next) {
  if (this.quantity != null && this.rate != null) {
    this.amount = Math.round(this.quantity * this.rate * 100) / 100;
  }
  next();
});

export default mongoose.model('MilkEntry', milkEntrySchema);
