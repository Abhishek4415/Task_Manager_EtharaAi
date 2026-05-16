import express from 'express';
import Holiday from '../models/Holiday';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const query: any = {};
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from as string);
      if (to) query.date.$lte = new Date(to as string);
    }
    const holidays = await Holiday.find(query).sort({ date: 1 });
    res.json({ success: true, data: holidays });
  } catch (err) {
    next(err);
  }
});

export default router;
