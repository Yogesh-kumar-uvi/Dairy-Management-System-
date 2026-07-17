import express from 'express';
import Customer from '../models/Customer.js';
import MilkEntry from '../models/MilkEntry.js';
import Payment from '../models/Payment.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

router.get('/stats', async (req, res, next) => {
  try {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const [activeCustomers, today] = await Promise.all([
      Customer.countDocuments({ isActive: true }),
      MilkEntry.aggregate([
        { $match: { date: { $gte: start } } },
        { $group: { _id: '$session', litres: { $sum: '$quantity' }, amount: { $sum: '$amount' } } }
      ])
    ]);
    const bySession = Object.fromEntries(today.map((t) => [t._id, t]));
    const result = {
      activeCustomers,
      today: {
        morning: bySession.morning || { litres: 0, amount: 0 },
        evening: bySession.evening || { litres: 0, amount: 0 }
      }
    };
    // Outstanding total is financial data - admin only
    if (req.user.role === 'admin') {
      const [milk, paid] = await Promise.all([
        MilkEntry.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
        Payment.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }])
      ]);
      result.totalOutstanding = Math.round(((milk[0]?.total || 0) - (paid[0]?.total || 0)) * 100) / 100;
    }
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
