import express from 'express';
import { body } from 'express-validator';
import Customer from '../models/Customer.js';
import validate from '../middleware/validate.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

const customerValidators = [
  body('name').trim().notEmpty().withMessage('Name is required').escape(),
  body('village').optional().trim().escape(),
  body('phone').optional().trim().matches(/^[0-9+\-\s]{0,15}$/).withMessage('Invalid phone number')
];

// Auto-generate next unique code like C0001
const nextCode = async () => {
  for (let i = 0; i < 5; i++) {
    const count = await Customer.countDocuments();
    const code = `C${String(count + 1 + i).padStart(4, '0')}`;
    if (!(await Customer.exists({ code }))) return code;
  }
  return `C${Date.now()}`;
};

// GET /api/customers?search=&page=&limit=&includeInactive=
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const query = {};
    if (!(req.query.includeInactive === 'true' && req.user.role === 'admin')) query.isActive = true;
    if (req.query.search) {
      const rx = new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ name: rx }, { code: rx }, { village: rx }];
    }
    const [customers, total] = await Promise.all([
      Customer.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Customer.countDocuments(query)
    ]);
    res.json({ customers, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// POST /api/customers
router.post('/', customerValidators, validate, async (req, res, next) => {
  try {
    const { name, code, village, phone } = req.body;
    const customer = await Customer.create({
      name,
      code: code?.trim() ? code.trim().toUpperCase() : await nextCode(),
      village,
      phone,
      createdBy: req.user._id
    });
    res.status(201).json(customer);
  } catch (err) {
    next(err);
  }
});

// PUT /api/customers/:id - code is IMMUTABLE
router.put('/:id', customerValidators, validate, async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    if (req.body.code && req.body.code.trim().toUpperCase() !== customer.code) {
      return res.status(400).json({ message: 'Customer code cannot be changed once set' });
    }
    const { name, village, phone } = req.body;
    Object.assign(customer, { name, village, phone, updatedBy: req.user._id });
    await customer.save();
    res.json(customer);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/customers/:id - SOFT delete, admin only
router.delete('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { isActive: false, updatedBy: req.user._id },
      { new: true }
    );
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json({ message: 'Customer deactivated (milk records preserved)' });
  } catch (err) {
    next(err);
  }
});

export default router;
