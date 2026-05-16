import { Router, Response } from 'express';
import mongoose from 'mongoose';
import Attendance from '../models/Attendance';
import User from '../models/User';
import TaskEntry from '../models/TaskEntry';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requirePLorQR } from '../middleware/roleGuard';

const router = Router();

const todayDate = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// POST /api/attendance/punch-in
router.post('/punch-in', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const today = todayDate();
    const existing = await Attendance.findOne({ userId, date: today });

    if (existing?.punchIn) {
      res.status(409).json({ success: false, data: null, message: 'Already punched in today' });
      return;
    }

    const now = new Date();
    const record = existing
      ? await Attendance.findByIdAndUpdate(existing._id, { $set: { punchIn: now } }, { new: true })
      : await Attendance.create({ userId, date: today, punchIn: now });

    res.status(201).json({ success: true, data: record, message: 'Punched in successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, data: null, message: 'Server error' });
  }
});

// POST /api/attendance/punch-out
router.post('/punch-out', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const today = todayDate();
    const record = await Attendance.findOne({ userId, date: today });

    if (!record?.punchIn) {
      res.status(400).json({ success: false, data: null, message: 'You have not punched in today' });
      return;
    }
    if (record.punchOut) {
      res.status(409).json({ success: false, data: null, message: 'Already punched out today' });
      return;
    }

    const now = new Date();
    const totalMinutes = Math.round((now.getTime() - record.punchIn.getTime()) / 60000);
    record.punchOut = now;
    record.totalMinutes = totalMinutes;
    await record.save();

    res.json({ success: true, data: record, message: 'Punched out successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, data: null, message: 'Server error' });
  }
});

// GET /api/attendance/today
router.get('/today', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const today = todayDate();
    const record = await Attendance.findOne({ userId, date: today }).lean();
    res.json({ success: true, data: record, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, data: null, message: 'Server error' });
  }
});

// GET /api/attendance?from=&to= — own history
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { from, to } = req.query;
    const filter: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(req.user!.id),
    };
    if (from || to) {
      filter.date = {};
      if (from) (filter.date as Record<string, Date>).$gte = new Date(from as string);
      if (to) (filter.date as Record<string, Date>).$lte = new Date(to as string);
    }
    const records = await Attendance.find(filter).sort({ date: -1 }).lean();
    res.json({ success: true, data: records, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, data: null, message: 'Server error' });
  }
});

// GET /api/attendance/report (PL/QR only)
router.get('/report', authenticate, requirePLorQR, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role, id, projectLeadId } = req.user!;
    const plId = new mongoose.Types.ObjectId(role === 'PROJECT_LEAD' ? id : projectLeadId!);
    const qrId = role === 'QUALITY_REVIEWER' ? new mongoose.Types.ObjectId(id) : null;

    const teamFilter: Record<string, unknown> = { 
      projectLeadId: plId,
      role: role === 'PROJECT_LEAD' ? { $in: ['TASKER', 'QUALITY_REVIEWER'] } : 'TASKER'
    };
    if (qrId) teamFilter.qualityReviewerId = qrId;
    const teamMembers = await User.find(teamFilter)
      .select('_id fullName email role qualityReviewerId qualityLevel projectId')
      .populate('qualityReviewerId', 'fullName')
      .populate('projectId', 'name')
      .lean();
    const memberIds = teamMembers.map((m) => m._id);

    const { from, to } = req.query;
    const filter: Record<string, unknown> = { userId: { $in: memberIds } };
    const taskDateFilter: Record<string, unknown> = { assigneeId: { $in: memberIds }, status: 'DONE' };
    if (from || to) {
      filter.date = {};
      if (from) (filter.date as Record<string, Date>).$gte = new Date(from as string);
      if (to) (filter.date as Record<string, Date>).$lte = new Date(to as string);
      taskDateFilter.completedAt = {};
      if (from) (taskDateFilter.completedAt as Record<string, Date>).$gte = new Date(from as string);
      if (to) (taskDateFilter.completedAt as Record<string, Date>).$lte = new Date(to as string);
    }

    const records = await Attendance.find(filter)
      .sort({ date: -1 })
      .populate({
        path: 'userId',
        select: 'fullName email qualityReviewerId projectId role',
        populate: [
          { path: 'qualityReviewerId', select: 'fullName' },
          { path: 'projectId', select: 'name' }
        ]
      })
      .lean();

    const completedByTaskerDate = await TaskEntry.aggregate([
      { $match: taskDateFilter },
      {
        $group: {
          _id: {
            assigneeId: '$assigneeId',
            date: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
          },
          completedCount: { $sum: 1 },
        },
      },
    ]);

    const completedMap = new Map<string, number>(
      completedByTaskerDate.map((x) => [`${x._id.assigneeId.toString()}|${x._id.date}`, x.completedCount as number])
    );

    const normalizedRecords = records.map((r: any) => {
      const dateKey = new Date(r.date).toISOString().slice(0, 10);
      const userKey = `${(r.userId?._id || r.userId).toString()}|${dateKey}`;
      const completedTasks = completedMap.get(userKey) || 0;
      const attendanceStatus = r.punchIn ? (r.punchOut ? 'PRESENT' : 'PARTIAL') : 'ABSENT';
      const totalMinutes = r.totalMinutes || 0;
      const productivityPerHour = totalMinutes > 0 ? Number(((completedTasks * 60) / totalMinutes).toFixed(2)) : 0;
      return { ...r, completedTasks, attendanceStatus, productivityPerHour };
    });

    const summary = {
      totalMembers: teamMembers.length,
      presentDays: normalizedRecords.filter((r: any) => r.attendanceStatus === 'PRESENT').length,
      partialDays: normalizedRecords.filter((r: any) => r.attendanceStatus === 'PARTIAL').length,
      absentDays: normalizedRecords.filter((r: any) => r.attendanceStatus === 'ABSENT').length,
      totalWorkingMinutes: normalizedRecords.reduce((acc: number, r: any) => acc + (r.totalMinutes || 0), 0),
      totalCompletedTasks: normalizedRecords.reduce((acc: number, r: any) => acc + (r.completedTasks || 0), 0),
    };

    res.json({ success: true, data: { teamMembers, records: normalizedRecords, summary }, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, data: null, message: 'Server error' });
  }
});

export default router;
