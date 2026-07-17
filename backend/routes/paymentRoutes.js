import express from 'express';
import rateLimit from 'express-rate-limit';
import { body } from 'express-validator';
import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import MilkEntry from '../models/MilkEntry.js';
import validate from '../middleware/validate.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Financial routes: admin only + rate limited
const paymentLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60 });
router.use(protect, authorize('admin'), paymentLimiter);

router.post('/',
  [
    body('customer').isMongoId(),
    body('amount').isFloat({ min: 0.01, max: 10000000 }).withMessage('Invalid amount'),
    body('mode').isIn(['cash', 'upi', 'bank']),
    body('remarks').optional().trim().isLength({ max: 300 }).escape()
  ],
  validate,
  async (req, res, next) => {
    try {
      const { customer, amount, date, mode, remarks } = req.body;
      const payment = await Payment.create({ customer, amount, mode, remarks, date: date || Date.now(), createdBy: req.user._id });
      res.status(201).json(await payment.populate('customer', 'name code'));
    } catch (err) { next(err); }
  }
);

router.get('/', async (req, res, next) => {
  try {
    const q = req.query.customer ? { customer: req.query.customer } : {};
    res.json(await Payment.find(q).populate('customer', 'name code').sort({ date: -1 }).limit(200));
  } catch (err) { next(err); }
});

// Ledger: date-wise milk credit / payment debit with running balance
router.get('/ledger/:customerId', async (req, res, next) => {
  try {
    const cid = req.params.customerId;
    const [entries, payments] = await Promise.all([
      MilkEntry.find({ customer: cid }).sort({ date: 1 }).lean(),
      Payment.find({ customer: cid }).sort({ date: 1 }).lean()
    ]);
    const rows = [
      ...entries.map((e) => ({ date: e.date, type: 'milk', description: `${e.session} | ${e.milkType} | ${e.quantity}L @ Rs${e.rate}`, credit: e.amount, debit: 0 })),
      ...payments.map((p) => ({ date: p.date, type: 'payment', description: `Payment (${p.mode})${p.remarks ? ' - ' + p.remarks : ''}`, credit: 0, debit: p.amount }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date));
    let balance = 0;
    rows.forEach((r) => { balance += r.credit - r.debit; r.balance = Math.round(balance * 100) / 100; });
    res.json({ rows, balance: Math.round(balance * 100) / 100 });
  } catch (err) { next(err); }
});

// Outstanding dues per customer, highest first
router.get('/outstanding/all', async (req, res, next) => {
  try {
    const [milk, paid] = await Promise.all([
      MilkEntry.aggregate([{ $group: { _id: '$customer', total: { $sum: '$amount' } } }]),
      Payment.aggregate([{ $group: { _id: '$customer', total: { $sum: '$amount' } } }])
    ]);
    const paidMap = Object.fromEntries(paid.map((p) => [String(p._id), p.total]));
    const Customer = mongoose.model('Customer');
    const results = await Promise.all(
      milk.map(async (m) => {
        const c = await Customer.findById(m._id).select('name code village').lean();
        const due = Math.round((m.total - (paidMap[String(m._id)] || 0)) * 100) / 100;
        return c ? { customer: c, milkTotal: m.total, paid: paidMap[String(m._id)] || 0, due } : null;
      })
    );
    res.json(results.filter((r) => r && r.due > 0).sort((a, b) => b.due - a.due));
  } catch (err) { next(err); }
});

export default router;
