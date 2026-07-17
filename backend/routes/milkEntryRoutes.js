import express from 'express';
import mongoose from 'mongoose';
import { body } from 'express-validator';
import MilkEntry from '../models/MilkEntry.js';
import RateChart from '../models/RateChart.js';
import validate from '../middleware/validate.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

const entryValidators = [
  body('customer').isMongoId().withMessage('Customer is required'),
  body('session').isIn(['morning', 'evening']),
  body('milkType').isIn(['cow', 'buffalo', 'mixed']),
  body('fat').isFloat({ min: 0, max: 15 }).withMessage('Fat must be 0-15'),
  body('snf').isFloat({ min: 0, max: 15 }).withMessage('SNF must be 0-15'),
  body('clr').optional({ values: 'falsy' }).isFloat({ min: 0, max: 40 }),
  body('rate').optional({ values: 'falsy' }).isFloat({ min: 0, max: 1000 }),
  body('quantity').isFloat({ min: 0.1, max: 1000 }).withMessage('Quantity must be 0.1-1000 L')
];

const lookupRate = async (fat, snf, milkType) => {
  const match = await RateChart.findOne({
    fatMin: { $lte: fat }, fatMax: { $gte: fat },
    snfMin: { $lte: snf }, snfMax: { $gte: snf },
    milkType: { $in: [milkType, 'any'] }
  }).sort({ milkType: 1 });
  return match?.rate;
};

// GET /api/milk-entries?customer=&from=&to=&session=&milkType=&page=&limit=
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const q = {};
    if (req.query.customer) q.customer = req.query.customer;
    if (req.query.session) q.session = req.query.session;
    if (req.query.milkType) q.milkType = req.query.milkType;
    if (req.query.from || req.query.to) {
      q.date = {};
      if (req.query.from) q.date.$gte = new Date(req.query.from);
      if (req.query.to) { const t = new Date(req.query.to); t.setHours(23, 59, 59, 999); q.date.$lte = t; }
    }
    const [entries, total] = await Promise.all([
      MilkEntry.find(q).populate('customer', 'name code').sort({ date: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      MilkEntry.countDocuments(q)
    ]);
    res.json({ entries, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

// POST /api/milk-entries - amount ALWAYS computed server-side
router.post('/', entryValidators, validate, async (req, res, next) => {
  try {
    const { customer, session, milkType, fat, snf, clr, quantity, date, time } = req.body;
    let rate = req.body.rate;
    if (!rate) {
      rate = await lookupRate(Number(fat), Number(snf), milkType);
      if (!rate) return res.status(400).json({ message: 'No rate chart match - enter rate manually' });
    }
    const entry = await MilkEntry.create({
      customer, session, milkType, fat, snf, clr, rate, quantity,
      date: date || Date.now(),
      time: time || new Date().toTimeString().slice(0, 5),
      createdBy: req.user._id
    });
    res.status(201).json(await entry.populate('customer', 'name code'));
  } catch (err) { next(err); }
});

// PUT /api/milk-entries/:id - admin only (audit trail via updatedBy + timestamps)
router.put('/:id', authorize('admin'), entryValidators, validate, async (req, res, next) => {
  try {
    const entry = await MilkEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    const { session, milkType, fat, snf, clr, rate, quantity, date, time } = req.body;
    Object.assign(entry, { session, milkType, fat, snf, clr, rate, quantity, date, time, updatedBy: req.user._id });
    await entry.save(); // pre-validate hook recomputes amount
    res.json(await entry.populate('customer', 'name code'));
  } catch (err) { next(err); }
});

// DELETE /api/milk-entries/:id - admin only
router.delete('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const entry = await MilkEntry.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    res.json({ message: 'Entry deleted' });
  } catch (err) { next(err); }
});

// GET /api/milk-entries/summary/daily?date=YYYY-MM-DD (admin - financial report)
router.get('/summary/daily', authorize('admin'), async (req, res, next) => {
  try {
    const d = req.query.date ? new Date(req.query.date) : new Date();
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    const end = new Date(d); end.setHours(23, 59, 59, 999);
    const summary = await MilkEntry.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      { $group: { _id: '$session', litres: { $sum: '$quantity' }, amount: { $sum: '$amount' }, avgFat: { $avg: '$fat' }, avgSnf: { $avg: '$snf' }, entries: { $sum: 1 } } }
    ]);
    res.json({ date: start, summary });
  } catch (err) { next(err); }
});

// GET /api/milk-entries/summary/monthly?customer=&month=YYYY-MM (admin)
router.get('/summary/monthly', authorize('admin'), async (req, res, next) => {
  try {
    const [y, m] = (req.query.month || new Date().toISOString().slice(0, 7)).split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59, 999);
    const match = { date: { $gte: start, $lte: end } };
    if (req.query.customer) match.customer = new mongoose.Types.ObjectId(req.query.customer);
    const summary = await MilkEntry.aggregate([
      { $match: match },
      { $group: { _id: '$customer', litres: { $sum: '$quantity' }, amount: { $sum: '$amount' }, avgFat: { $avg: '$fat' }, avgSnf: { $avg: '$snf' }, entries: { $sum: 1 } } },
      { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'customer' } },
      { $unwind: '$customer' },
      { $project: { 'customer.name': 1, 'customer.code': 1, litres: 1, amount: 1, avgFat: 1, avgSnf: 1, entries: 1 } },
      { $sort: { amount: -1 } }
    ]);
    res.json({ month: req.query.month, summary });
  } catch (err) { next(err); }
});

export default router;
