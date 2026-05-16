import { Router, Response } from 'express';
import { body } from 'express-validator';
import mongoose from 'mongoose';
import LeaveRequest from '../models/LeaveRequest';
import User from '../models/User';
import Attendance from '../models/Attendance';
import TaskEntry from '../models/TaskEntry';
import TodoSession from '../models/TodoSession';
import Notification from '../models/Notification';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requirePLorQR } from '../middleware/roleGuard';
import { validate } from '../middleware/validate';

const router = Router();

const getMonthRange = (month?: string, year?: string) => {
  const now = new Date();
  const m = month ? Number(month) : now.getMonth() + 1;
  const y = year ? Number(year) : now.getFullYear();
  const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const end = new Date(y, m, 0, 23, 59, 59, 999);
  return { start, end, month: m, year: y };
};

const asSingle = (value?: string | string[]): string | undefined => (Array.isArray(value) ? value[0] : value);
const uniqueObjectIds = (ids: mongoose.Types.ObjectId[]) => {
  const map = new Map<string, mongoose.Types.ObjectId>();
  for (const id of ids) map.set(String(id), id);
  return [...map.values()];
};

const getPlAndQr = async (userId: string) => {
  const user = await User.findById(userId).select('role projectLeadId qualityReviewerId').lean();
  if (!user) return { plId: null as mongoose.Types.ObjectId | null, qrId: null as mongoose.Types.ObjectId | null };
  const plId = user.role === 'PROJECT_LEAD'
    ? new mongoose.Types.ObjectId(userId)
    : user.projectLeadId
      ? new mongoose.Types.ObjectId(user.projectLeadId)
      : null;
  const qrId = user.qualityReviewerId ? new mongoose.Types.ObjectId(user.qualityReviewerId) : null;
  return { plId, qrId };
};

router.post(
  '/',
  authenticate,
  [
    body('type').isIn(['SICK', 'PERSONAL', 'ANNUAL', 'EMERGENCY']),
    body('startDate').isISO8601(),
    body('endDate').isISO8601(),
    body('reason').trim().notEmpty(),
  ],
  validate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const role = req.user!.role;
      if (role === 'PROJECT_LEAD') {
        res.status(403).json({ success: false, data: null, message: 'Project Lead cannot apply for leave. PL can only approve/reject.' });
        return;
      }

      const { type, startDate, endDate, reason } = req.body;
      const { qrId, plId } = await getPlAndQr(req.user!.id);
      const me = await User.findById(req.user!.id).select('fullName').lean();

      const leave = await LeaveRequest.create({
        userId: new mongoose.Types.ObjectId(req.user!.id),
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
        status: role === 'TASKER' ? 'QR_PENDING' : 'PL_PENDING',
        qrReviewerId: role === 'TASKER' ? qrId : undefined,
      });

      const notifyIds: mongoose.Types.ObjectId[] = [];
      if (role === 'TASKER') {
        if (qrId) notifyIds.push(qrId);
        if (plId) notifyIds.push(plId);
      } else if (role === 'QUALITY_REVIEWER' && plId) {
        notifyIds.push(plId);
      }
      const targets = uniqueObjectIds(notifyIds);
      if (targets.length > 0) {
        await Notification.insertMany(
          targets.map((uid) => ({
            userId: uid,
            type: 'LEAVE_APPLIED' as const,
            title: 'New Leave Request',
            message: `${me?.fullName || 'Team member'} applied for leave (${type}).`,
            entityType: 'LEAVE' as const,
            entityId: leave._id,
          }))
        );
      }

      res.status(201).json({ success: true, data: leave, message: 'Leave request submitted' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, data: null, message: 'Server error' });
    }
  }
);

router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const leaves = await LeaveRequest.find({ userId: new mongoose.Types.ObjectId(req.user!.id) })
      .populate('qrReviewerId', 'fullName')
      .populate('plReviewerId', 'fullName')
      .populate('approvalHistory.reviewerId', 'fullName role')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: leaves, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, data: null, message: 'Server error' });
  }
});

router.get('/pending', authenticate, requirePLorQR, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role, id } = req.user!;
    let filter: Record<string, unknown> = {};

    if (role === 'QUALITY_REVIEWER') {
      const team = await User.find({ qualityReviewerId: new mongoose.Types.ObjectId(id), role: 'TASKER' }).select('_id');
      filter = { userId: { $in: team.map((u) => u._id) }, status: 'QR_PENDING' };
    } else {
      const team = await User.find({ projectLeadId: new mongoose.Types.ObjectId(id), role: { $in: ['TASKER', 'QUALITY_REVIEWER'] } }).select('_id');
      filter = { userId: { $in: team.map((u) => u._id) }, status: 'PL_PENDING' };
    }

    const leaves = await LeaveRequest.find(filter)
      .populate('userId', 'fullName email role jobTitle qualityReviewerId')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: leaves, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, data: null, message: 'Server error' });
  }
});

router.get('/team', authenticate, requirePLorQR, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role, id, projectLeadId } = req.user!;
    let teamIds: mongoose.Types.ObjectId[] = [];

    if (role === 'PROJECT_LEAD') {
      const team = await User.find({ projectLeadId: new mongoose.Types.ObjectId(id), role: { $in: ['TASKER', 'QUALITY_REVIEWER'] } }).select('_id');
      teamIds = team.map((u) => u._id);
    } else {
      const qrTaskers = await User.find({ qualityReviewerId: new mongoose.Types.ObjectId(id), role: 'TASKER' }).select('_id');
      teamIds = qrTaskers.map((u) => u._id);
      teamIds.push(new mongoose.Types.ObjectId(id));
      if (projectLeadId) teamIds.push(new mongoose.Types.ObjectId(projectLeadId));
    }

    const leaves = await LeaveRequest.find({ userId: { $in: teamIds } })
      .populate('userId', 'fullName email role jobTitle')
      .populate('qrReviewerId', 'fullName')
      .populate('plReviewerId', 'fullName')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: leaves, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, data: null, message: 'Server error' });
  }
});

router.get('/calendar', authenticate, requirePLorQR, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role, id } = req.user!;
    let teamIds: mongoose.Types.ObjectId[] = [];
    if (role === 'PROJECT_LEAD') {
      const members = await User.find({ projectLeadId: new mongoose.Types.ObjectId(id) }).select('_id');
      teamIds = members.map((u) => u._id);
    } else {
      const members = await User.find({ qualityReviewerId: new mongoose.Types.ObjectId(id), role: 'TASKER' }).select('_id');
      teamIds = members.map((u) => u._id);
    }

    const leaves = await LeaveRequest.find({ userId: { $in: teamIds }, status: { $in: ['QR_PENDING', 'PL_PENDING', 'APPROVED'] } })
      .populate('userId', 'fullName role')
      .lean();

    res.json({ success: true, data: leaves, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, data: null, message: 'Server error' });
  }
});

router.get('/analytics/member/:memberId', authenticate, requirePLorQR, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const memberId = String(req.params.memberId);
    const month = asSingle(req.query.month as string | string[] | undefined);
    const year = asSingle(req.query.year as string | string[] | undefined);
    const { start, end, month: m, year: y } = getMonthRange(month, year);

    const member = await User.findById(memberId).select('fullName role projectLeadId qualityReviewerId').lean();
    if (!member) {
      res.status(404).json({ success: false, data: null, message: 'Member not found' });
      return;
    }

    const leaves = await LeaveRequest.find({ userId: new mongoose.Types.ObjectId(memberId), createdAt: { $gte: start, $lte: end } })
      .populate('approvalHistory.reviewerId', 'fullName role')
      .lean();

    const attendance = await Attendance.find({ userId: new mongoose.Types.ObjectId(memberId), date: { $gte: start, $lte: end } }).lean();

    const sessions = await TodoSession.find({ date: { $gte: start, $lte: end } }).select('_id').lean();
    const entries = await TaskEntry.find({ assigneeId: new mongoose.Types.ObjectId(memberId), todoSessionId: { $in: sessions.map((s) => s._id) } })
      .select('status totalDurationSeconds reviewStatus')
      .lean();

    const presentDays = attendance.filter((a) => !!a.punchIn).length;
    const totalWorkingMinutes = attendance.reduce((sum, a) => sum + (a.totalMinutes || 0), 0);
    const completedTasks = entries.filter((e) => e.status === 'DONE').length;
    const totalTasks = entries.length;
    const ahtMins = completedTasks > 0 ? Math.round((totalWorkingMinutes / completedTasks) * 100) / 100 : 0;

    res.json({
      success: true,
      data: {
        month: m,
        year: y,
        member,
        leave: {
          totalLeavesTaken: leaves.length,
          approved: leaves.filter((l) => l.status === 'APPROVED').length,
          rejected: leaves.filter((l) => l.status === 'REJECTED').length,
          pending: leaves.filter((l) => ['QR_PENDING', 'PL_PENDING'].includes(l.status)).length,
          reasons: leaves.map((l) => ({ type: l.type, reason: l.reason, startDate: l.startDate, endDate: l.endDate, status: l.status })),
          approvalHistory: leaves.flatMap((l: any) => l.approvalHistory || []),
        },
        productivity: {
          totalTasks,
          completedTasks,
          completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          ahtMinutes: ahtMins,
          presentDays,
          totalWorkingMinutes,
        },
      },
      message: 'OK',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, data: null, message: 'Server error' });
  }
});

router.put('/:id/approve', authenticate, requirePLorQR, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const leave = await LeaveRequest.findById(req.params.id).populate('userId', 'fullName role qualityReviewerId projectLeadId');
    if (!leave) {
      res.status(404).json({ success: false, data: null, message: 'Leave request not found' });
      return;
    }

    const actorRole = req.user!.role;
    const actorId = new mongoose.Types.ObjectId(req.user!.id);
    const leaveUser = leave.userId as any;

    if (actorRole === 'QUALITY_REVIEWER') {
      if (leave.status !== 'QR_PENDING') {
        res.status(400).json({ success: false, data: null, message: 'This request is not pending QR approval' });
        return;
      }
      if (leaveUser.role !== 'TASKER' || leaveUser.qualityReviewerId?.toString() !== req.user!.id) {
        res.status(403).json({ success: false, data: null, message: 'You can approve only your assigned taskers leaves' });
        return;
      }

      leave.status = 'PL_PENDING';
      leave.qrReviewerId = actorId;
      leave.qrDecisionAt = new Date();
      leave.approvalHistory.push({ role: 'QUALITY_REVIEWER', reviewerId: actorId, decision: 'APPROVED', note: req.body.reviewNote, at: new Date() } as any);

      if (leaveUser.projectLeadId) {
        await Notification.create({
          userId: leaveUser.projectLeadId,
          type: 'LEAVE_ESCALATED',
          title: 'Leave Escalated to PL',
          message: `${leaveUser.fullName}'s leave is approved by QR and pending your approval.`,
          entityType: 'LEAVE',
          entityId: leave._id,
        });
      }
    } else {
      if (leave.status !== 'PL_PENDING') {
        res.status(400).json({ success: false, data: null, message: 'This request is not pending PL approval' });
        return;
      }
      if (leaveUser.projectLeadId?.toString() !== req.user!.id) {
        res.status(403).json({ success: false, data: null, message: 'You can approve only your team leaves' });
        return;
      }

      leave.status = 'APPROVED';
      leave.plReviewerId = actorId;
      leave.plDecisionAt = new Date();
      leave.reviewNote = req.body.reviewNote;
      leave.approvalHistory.push({ role: 'PROJECT_LEAD', reviewerId: actorId, decision: 'APPROVED', note: req.body.reviewNote, at: new Date() } as any);
    }

    await leave.save();
    await Notification.create({
      userId: leave.userId,
      type: 'LEAVE_APPROVED',
      title: 'Leave Approved',
      message: actorRole === 'PROJECT_LEAD'
        ? 'Your leave has been fully approved by Project Lead.'
        : 'Your leave passed QR approval and moved to PL review.',
      entityType: 'LEAVE',
      entityId: leave._id,
    });
    res.json({ success: true, data: leave, message: 'Leave approved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, data: null, message: 'Server error' });
  }
});

router.put('/:id/reject', authenticate, requirePLorQR, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.body.reviewNote) {
      res.status(400).json({ success: false, data: null, message: 'Review note is required for rejection' });
      return;
    }

    const leave = await LeaveRequest.findById(req.params.id).populate('userId', 'fullName role qualityReviewerId projectLeadId');
    if (!leave) {
      res.status(404).json({ success: false, data: null, message: 'Leave request not found' });
      return;
    }

    const actorRole = req.user!.role;
    const actorId = new mongoose.Types.ObjectId(req.user!.id);
    const leaveUser = leave.userId as any;

    if (actorRole === 'QUALITY_REVIEWER') {
      if (leave.status !== 'QR_PENDING' || leaveUser.qualityReviewerId?.toString() !== req.user!.id) {
        res.status(403).json({ success: false, data: null, message: 'You can reject only your taskers pending leaves' });
        return;
      }
      leave.approvalHistory.push({ role: 'QUALITY_REVIEWER', reviewerId: actorId, decision: 'REJECTED', note: req.body.reviewNote, at: new Date() } as any);
      leave.qrReviewerId = actorId;
      leave.qrDecisionAt = new Date();
    } else {
      if (leave.status !== 'PL_PENDING' || leaveUser.projectLeadId?.toString() !== req.user!.id) {
        res.status(403).json({ success: false, data: null, message: 'You can reject only your team pending leaves' });
        return;
      }
      leave.approvalHistory.push({ role: 'PROJECT_LEAD', reviewerId: actorId, decision: 'REJECTED', note: req.body.reviewNote, at: new Date() } as any);
      leave.plReviewerId = actorId;
      leave.plDecisionAt = new Date();
    }

    leave.status = 'REJECTED';
    leave.reviewNote = req.body.reviewNote;

    await leave.save();
    await Notification.create({
      userId: leave.userId,
      type: 'LEAVE_REJECTED',
      title: 'Leave Rejected',
      message: `Your leave request was rejected by ${actorRole === 'PROJECT_LEAD' ? 'Project Lead' : 'Quality Reviewer'}.`,
      entityType: 'LEAVE',
      entityId: leave._id,
    });
    res.json({ success: true, data: leave, message: 'Leave rejected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, data: null, message: 'Server error' });
  }
});

export default router;
