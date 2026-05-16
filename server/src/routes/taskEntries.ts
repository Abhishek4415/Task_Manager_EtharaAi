import { Router, Response } from 'express';
import { body } from 'express-validator';
import mongoose from 'mongoose';
import TaskEntry from '../models/TaskEntry';
import TaskEntryLog from '../models/TaskEntryLog';
import Attendance from '../models/Attendance';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { requirePLorQR } from '../middleware/roleGuard';

const router = Router();

// PUT /api/task-entries/:id/progress (TASKER — must be assignee + must be punched in)
router.put(
  '/:id/progress',
  authenticate,
  [
    body('action').isIn(['DONE_ALL', 'COUNT_INPUT', 'PARTIAL_DONE', 'CUSTOM']),
    body('countDone').optional().isInt({ min: 0 }),
  ],
  validate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id: userId, role } = req.user!;

      // Punch-in gate: only for TASKER
      if (role === 'TASKER') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const attendance = await Attendance.findOne({
          userId: new mongoose.Types.ObjectId(userId),
          date: today,
          punchIn: { $exists: true, $ne: null },
        });
        if (!attendance) {
          res.status(403).json({ success: false, data: null, message: 'You must punch in before updating tasks' });
          return;
        }
      }

      const entry = await TaskEntry.findById(req.params.id);
      if (!entry) {
        res.status(404).json({ success: false, data: null, message: 'Task entry not found' });
        return;
      }

      // Only the assignee (TASKER) or PL/QR can update
      if (role === 'TASKER' && entry.assigneeId.toString() !== userId) {
        res.status(403).json({ success: false, data: null, message: 'Access denied' });
        return;
      }

      const { action, countDone, note } = req.body;

      switch (action) {
        case 'DONE_ALL':
          entry.status = 'DONE';
          entry.countDone = entry.countTarget || 0;
          entry.completedAt = new Date();
          break;
        case 'COUNT_INPUT':
          entry.countDone = countDone ?? 0;
          if (entry.countTarget && (countDone ?? 0) >= entry.countTarget) {
            entry.status = 'DONE';
            entry.completedAt = new Date();
          } else {
            entry.status = 'IN_PROGRESS';
          }
          break;
        case 'PARTIAL_DONE':
          entry.status = 'PARTIAL';
          entry.countDone = countDone ?? entry.countDone;
          break;
        case 'CUSTOM':
          entry.status = 'IN_PROGRESS';
          if (countDone !== undefined) entry.countDone = countDone;
          break;
      }
      if (note) entry.notes = note;
      
      // Auto-stop timer if running
      if (entry.isTiming && entry.currentTimerStart) {
        const now = new Date();
        const durationSeconds = Math.floor((now.getTime() - entry.currentTimerStart.getTime()) / 1000);
        entry.timeLogs.push({ startTime: entry.currentTimerStart, endTime: now, durationSeconds });
        entry.totalDurationSeconds = (entry.totalDurationSeconds || 0) + durationSeconds;
        entry.isTiming = false;
        entry.currentTimerStart = null;
      }
      
      await entry.save();

      // Log the action
      await TaskEntryLog.create({
        entryId: entry._id,
        userId: new mongoose.Types.ObjectId(userId),
        action,
        value: countDone?.toString() || note || '',
      });

      res.json({ success: true, data: entry, message: 'Progress updated' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, data: null, message: 'Server error' });
    }
  }
);

// PUT /api/task-entries/:id/stem-row (TASKER)
router.put(
  '/:id/stem-row',
  authenticate,
  [
    body('stemRowIndex').isInt({ min: 0 }),
    body('status').isIn(['DONE', 'SKIPPED']),
  ],
  validate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id: userId } = req.user!;
      const entry = await TaskEntry.findById(req.params.id);
      if (!entry) {
        res.status(404).json({ success: false, data: null, message: 'Task entry not found' });
        return;
      }
      if (entry.assigneeId.toString() !== userId) {
        res.status(403).json({ success: false, data: null, message: 'Access denied' });
        return;
      }

      const { stemRowIndex, status, note } = req.body;
      entry.stemRowIndex = stemRowIndex;
      entry.status = status;
      if (note) entry.notes = note;
      if (status === 'DONE') entry.completedAt = new Date();

      // Auto-stop timer if running
      if (entry.isTiming && entry.currentTimerStart) {
        const now = new Date();
        const durationSeconds = Math.floor((now.getTime() - entry.currentTimerStart.getTime()) / 1000);
        entry.timeLogs.push({ startTime: entry.currentTimerStart, endTime: now, durationSeconds });
        entry.totalDurationSeconds = (entry.totalDurationSeconds || 0) + durationSeconds;
        entry.isTiming = false;
        entry.currentTimerStart = null;
      }

      await entry.save();

      await TaskEntryLog.create({
        entryId: entry._id,
        userId: new mongoose.Types.ObjectId(userId),
        action: `STEM_ROW_${status}`,
        value: stemRowIndex.toString(),
      });

      res.json({ success: true, data: entry, message: 'STEM row updated' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, data: null, message: 'Server error' });
    }
  }
);

// GET /api/task-entries?sessionId= (for team view)
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sessionId, assigneeId } = req.query;
    const filter: Record<string, unknown> = {};
    if (sessionId) filter.todoSessionId = new mongoose.Types.ObjectId(sessionId as string);
    if (assigneeId) filter.assigneeId = new mongoose.Types.ObjectId(assigneeId as string);

    // TASKER can only see own entries
    if (req.user!.role === 'TASKER') {
      filter.assigneeId = new mongoose.Types.ObjectId(req.user!.id);
    }

    const entries = await TaskEntry.find(filter)
      .populate('assigneeId', 'fullName email')
      .populate('todoSessionId', 'title date taskType')
      .lean();

    // Hide and cleanup orphaned entries whose session was deleted.
    const orphanIds = entries
      .filter((e: any) => !e.todoSessionId)
      .map((e: any) => e._id);
    if (orphanIds.length > 0) {
      await TaskEntry.deleteMany({ _id: { $in: orphanIds } });
    }
    const cleanEntries = entries.filter((e: any) => !!e.todoSessionId);

    res.json({ success: true, data: cleanEntries, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, data: null, message: 'Server error' });
  }
});

// GET /api/task-entries/:id/logs
router.get('/:id/logs', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const logs = await TaskEntryLog.find({ entryId: req.params.id as string })
      .populate('userId', 'fullName')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: logs, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, data: null, message: 'Server error' });
  }
});

// PUT /api/task-entries/:id/timer (TASKER)
router.put(
  '/:id/timer',
  authenticate,
  [body('action').isIn(['START', 'PAUSE', 'STOP'])],
  validate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id: userId, role } = req.user!;
      if (role !== 'TASKER') {
        res.status(403).json({ success: false, data: null, message: 'Access denied' });
        return;
      }
      const entry = await TaskEntry.findById(req.params.id);
      if (!entry || entry.assigneeId.toString() !== userId) {
        res.status(404).json({ success: false, data: null, message: 'Task entry not found' });
        return;
      }

      const { action } = req.body;

      if (action === 'START') {
        if (!entry.isTiming) {
          entry.isTiming = true;
          entry.currentTimerStart = new Date();
          if (entry.status === 'TODO') entry.status = 'IN_PROGRESS';
        }
      } else if (action === 'PAUSE' || action === 'STOP') {
        if (entry.isTiming && entry.currentTimerStart) {
          const now = new Date();
          const durationSeconds = Math.floor((now.getTime() - entry.currentTimerStart.getTime()) / 1000);
          entry.timeLogs.push({ startTime: entry.currentTimerStart, endTime: now, durationSeconds });
          entry.totalDurationSeconds = (entry.totalDurationSeconds || 0) + durationSeconds;
          entry.isTiming = false;
          entry.currentTimerStart = null;
        }
      }

      await entry.save();
      
      await TaskEntryLog.create({
        entryId: entry._id,
        userId: new mongoose.Types.ObjectId(userId),
        action: `TIMER_${action}`,
        value: entry.totalDurationSeconds?.toString() || '0',
      });

      res.json({ success: true, data: entry, message: `Timer ${action.toLowerCase()}ed` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, data: null, message: 'Server error' });
    }
  }
);

// PUT /api/task-entries/:id/review (PL or QR)
router.put(
  '/:id/review',
  authenticate,
  requirePLorQR,
  [
    body('status').isIn(['APPROVED', 'REJECTED']),
    body('note').optional().isString(),
  ],
  validate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id: reviewerId } = req.user!;
      const entry = await TaskEntry.findById(req.params.id);
      if (!entry) {
        res.status(404).json({ success: false, data: null, message: 'Task entry not found' });
        return;
      }

      const { status, note } = req.body;
      entry.reviewStatus = status;
      if (note) entry.reviewNote = note;
      entry.reviewedBy = new mongoose.Types.ObjectId(reviewerId);
      entry.reviewedAt = new Date();

      await entry.save();

      await TaskEntryLog.create({
        entryId: entry._id,
        userId: new mongoose.Types.ObjectId(reviewerId),
        action: `REVIEW_${status}`,
        value: note || '',
      });

      res.json({ success: true, data: entry, message: `Task ${status.toLowerCase()} successfully` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, data: null, message: 'Server error' });
    }
  }
);

export default router;
