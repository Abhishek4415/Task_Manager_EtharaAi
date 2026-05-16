import { Router, Response } from 'express';
import mongoose from 'mongoose';
import Notification from '../models/Notification';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const limit = Math.min(Number(req.query.limit || 30), 100);
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    const unreadCount = await Notification.countDocuments({ userId, isRead: false });
    res.json({ success: true, data: { notifications, unreadCount }, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, data: null, message: 'Server error' });
  }
});

router.put('/:id/read', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId },
      { $set: { isRead: true } },
      { new: true }
    );
    if (!notification) {
      res.status(404).json({ success: false, data: null, message: 'Notification not found' });
      return;
    }
    res.json({ success: true, data: notification, message: 'Marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, data: null, message: 'Server error' });
  }
});

router.put('/read-all', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    await Notification.updateMany({ userId, isRead: false }, { $set: { isRead: true } });
    res.json({ success: true, data: null, message: 'All notifications marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, data: null, message: 'Server error' });
  }
});

export default router;

