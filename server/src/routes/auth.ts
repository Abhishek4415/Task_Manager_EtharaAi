import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import mongoose from 'mongoose';
import User from '../models/User';
import { hashPassword, comparePassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// POST /api/auth/register
router.post(
  '/register',
  [
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required')
      .custom((value) => value.endsWith('@ethara.ai')).withMessage('Only @ethara.ai emails are allowed'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['PROJECT_LEAD', 'QUALITY_REVIEWER', 'TASKER']).withMessage('Invalid role'),
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { fullName, email, password, role, jobTitle, projectLeadId, qualityReviewerId } = req.body;

      // Role-specific validation
      if (role === 'QUALITY_REVIEWER' && !projectLeadId) {
        res.status(400).json({ success: false, data: null, message: 'Quality Reviewer must have a Project Lead' });
        return;
      }
      if (role === 'TASKER') {
        if (!projectLeadId || !qualityReviewerId) {
          res.status(400).json({ success: false, data: null, message: 'Tasker must have both a Project Lead and Quality Reviewer' });
          return;
        }
        // Verify QR belongs to same PL
        const qr = await User.findById(qualityReviewerId).lean();
        if (!qr || qr.role !== 'QUALITY_REVIEWER') {
          res.status(400).json({ success: false, data: null, message: 'Invalid Quality Reviewer' });
          return;
        }
        if (qr.projectLeadId?.toString() !== projectLeadId) {
          res.status(400).json({ success: false, data: null, message: 'Quality Reviewer does not belong to the selected Project Lead' });
          return;
        }
      }

      const existing = await User.findOne({ email });
      if (existing) {
        res.status(409).json({ success: false, data: null, message: 'Email already registered' });
        return;
      }

      const passwordHash = await hashPassword(password);
      const user = await User.create({
        fullName,
        email,
        passwordHash,
        role,
        jobTitle,
        projectLeadId: projectLeadId ? new mongoose.Types.ObjectId(projectLeadId) : null,
        qualityReviewerId: qualityReviewerId ? new mongoose.Types.ObjectId(qualityReviewerId) : null,
      });

      const token = signToken({
        id: (user._id as mongoose.Types.ObjectId).toString(),
        role: user.role,
        projectLeadId: user.projectLeadId?.toString(),
        qualityReviewerId: user.qualityReviewerId?.toString(),
      });

      const userObj = user.toObject();
      const { passwordHash: _ph, ...safeUser } = userObj as typeof userObj & { passwordHash: string };

      res.status(201).json({ success: true, data: { token, user: safeUser }, message: 'Registration successful' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, data: null, message: 'Server error' });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail()
      .custom((value) => value.endsWith('@ethara.ai')).withMessage('Only @ethara.ai emails are allowed'),
    body('password').notEmpty(),
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
        res.status(401).json({ success: false, data: null, message: 'Invalid credentials' });
        return;
      }

      const valid = await comparePassword(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ success: false, data: null, message: 'Invalid credentials' });
        return;
      }

      const token = signToken({
        id: (user._id as mongoose.Types.ObjectId).toString(),
        role: user.role,
        projectLeadId: user.projectLeadId?.toString(),
        qualityReviewerId: user.qualityReviewerId?.toString(),
      });

      const userObj = user.toObject();
      const { passwordHash: _ph, ...safeUser } = userObj as typeof userObj & { passwordHash: string };

      res.json({ success: true, data: { token, user: safeUser }, message: 'Login successful' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, data: null, message: 'Server error' });
    }
  }
);

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user!.id)
      .populate('projectLeadId', 'fullName email jobTitle role')
      .populate('qualityReviewerId', 'fullName email jobTitle role')
      .select('-passwordHash')
      .lean();

    if (!user) {
      res.status(404).json({ success: false, data: null, message: 'User not found' });
      return;
    }
    res.json({ success: true, data: user, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, data: null, message: 'Server error' });
  }
});

export default router;
