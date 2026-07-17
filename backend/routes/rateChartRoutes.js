import express from 'express';
import { body, query } from 'express-validator';
import RateChart from '../models/RateChart.js';
import validate from '../middleware/validate.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

const chartValidators = [
  body('fatMin').isFloat({ min: 0, max: 15 }),
  body('fatMax').isFloat({ min: 0, max: 15 }),
  body('snfMin').isFloat({ min: 0, max: 15 }),
  body('snfMax').isFloat({ min: 0, max: 15 }),
  body('rate').isFloat({ min: 0, max: 1000 }),
  body('milkType').optional().isIn(['cow', 'buffalo', 'mixed', 'any'])
];

router.get('/', async (req, res, next) => {
  try { res.json(await RateChart.find().sort({ fatMin: 1, snfMin: 1 })); } catch (err) { next(err); }
});

// Live rate auto-fill lookup
router.get('/lookup', [query('fat').isFloat({ min: 0, max: 15 }), query('snf').isFloat({ min: 0, max: 15 })], validate, async (req, res, next) => {
  try {
    const { fat, snf, milkType = 'any' } = req.query;
    const match = await RateChart.findOne({
      fatMin: { $lte: Number(fat) }, fatMax: { $gte: Number(fat) },
      snfMin: { $lte: Number(snf) }, snfMax: { $gte: Number(snf) },
      milkType: { $in: [milkType, 'any'] }
    }).sort({ milkType: 1 });
    res.json({ rate: match?.rate ?? null });
  } catch (err) { next(err); }
});

router.post('/', authorize('admin'), chartValidators, validate, async (req, res, next) => {
  try { res.status(201).json(await RateChart.create({ ...req.body, updatedBy: req.user._id })); } catch (err) { next(err); }
});

router.put('/:id', authorize('admin'), chartValidators, validate, async (req, res, next) => {
  try {
    const row = await RateChart.findByIdAndUpdate(req.params.id, { ...req.body, updatedBy: req.user._id }, { new: true, runValidators: true });
    if (!row) return res.status(404).json({ message: 'Rate chart row not found' });
    res.json(row);
  } catch (err) { next(err); }
});

router.delete('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const row = await RateChart.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ message: 'Rate chart row not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

export default router;
