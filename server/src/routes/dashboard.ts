import { Router, Response } from 'express';
import mongoose from 'mongoose';
import TodoSession from '../models/TodoSession';
import TaskEntry from '../models/TaskEntry';
import Attendance from '../models/Attendance';
import User from '../models/User';
import Project from '../models/Project';
import LeaveRequest from '../models/LeaveRequest';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requirePLorQR } from '../middleware/roleGuard';

const router = Router();

const todayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const monthRange = (month?: string, year?: string) => {
  const now = new Date();
  const m = month ? Number(month) : now.getMonth() + 1;
  const y = year ? Number(year) : now.getFullYear();
  const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const end = new Date(y, m, 0, 23, 59, 59, 999);
  return { start, end, month: m, year: y };
};

// GET /api/dashboard/today
router.get('/today', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: userId, role, projectLeadId, qualityReviewerId } = req.user!;
    const uid = new mongoose.Types.ObjectId(userId);
    const { start, end } = todayRange();

    // Today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const punchRecord = await Attendance.findOne({ userId: uid, date: today }).lean();

    // Tasker-specific data
    let todaySessions: unknown[] = [];
    let myEntries: unknown[] = [];
    let teamInfo = {};
    let stats: Record<string, number> = { tasksCompleted: 0, totalTimeMinutes: 0, avgTaskTimeMinutes: 0, qcChecksCompleted: 0 };
    let leavePanel = { pendingApprovals: 0, teamOnLeaveToday: 0, recentRequests: [] as any[] };

    if (role === 'TASKER') {
      const assignedEntries = await TaskEntry.find({ assigneeId: uid }).select('todoSessionId').lean();
      const sessionIds = [...new Set(assignedEntries.map((e) => e.todoSessionId.toString()))];

      const sessions = await TodoSession.find({
        _id: { $in: sessionIds.map((s) => new mongoose.Types.ObjectId(s)) },
        date: { $gte: start, $lte: end },
      })
        .populate('projectId', 'name taskType dailyTarget')
        .populate('createdById', 'fullName')
        .lean();
      todaySessions = sessions;

      if (todaySessions.length > 0) {
        myEntries = await TaskEntry.find({
          todoSessionId: { $in: todaySessions.map((s: any) => s._id) },
          assigneeId: uid,
        }).lean();
      }

      const doneEntries = (myEntries as { status: string; countDone?: number; countTarget?: number }[]).filter((e) => e.status === 'DONE');
      stats.tasksCompleted = doneEntries.reduce((acc, e) => {
        if (!e.countTarget || e.countTarget <= 0) return acc + 1;
        return acc + Math.min(e.countDone || 0, e.countTarget);
      }, 0);
      stats.totalTimeMinutes = punchRecord?.totalMinutes || 0;
      stats.avgTaskTimeMinutes = doneEntries.length > 0 ? Math.round(stats.totalTimeMinutes / doneEntries.length) : 0;

      const me = await User.findById(userId)
        .populate('projectLeadId', 'fullName email jobTitle')
        .populate('qualityReviewerId', 'fullName email jobTitle')
        .select('-passwordHash')
        .lean();
      teamInfo = {
        projectLead: me?.projectLeadId,
        qualityReviewer: me?.qualityReviewerId,
      };
    } else {
      const actorId = new mongoose.Types.ObjectId(userId);
      if (role === 'QUALITY_REVIEWER') {
        const qrTaskers = await User.find({ qualityReviewerId: actorId, role: 'TASKER' }).select('_id');
        const taskerIds = qrTaskers.map((u) => u._id);
        const assignedEntries = await TaskEntry.find({
          assigneeId: { $in: taskerIds },
          updatedAt: { $gte: start, $lte: end },
          status: 'DONE',
        }).select('totalDurationSeconds').lean();
        stats.qcChecksCompleted = assignedEntries.length;
        stats.totalTimeMinutes = punchRecord?.totalMinutes || 0;
        stats.avgTaskTimeMinutes = assignedEntries.length > 0 ? Math.round(stats.totalTimeMinutes / assignedEntries.length) : 0;

        leavePanel.pendingApprovals = await LeaveRequest.countDocuments({ userId: { $in: taskerIds }, status: 'QR_PENDING' });
        leavePanel.teamOnLeaveToday = await LeaveRequest.countDocuments({
          userId: { $in: taskerIds },
          status: { $in: ['PL_PENDING', 'APPROVED'] },
          startDate: { $lte: end },
          endDate: { $gte: start },
        });
        leavePanel.recentRequests = await LeaveRequest.find({ userId: { $in: taskerIds } })
          .populate('userId', 'fullName role')
          .sort({ createdAt: -1 })
          .limit(5)
          .lean();
      } else if (role === 'PROJECT_LEAD') {
        const team = await User.find({ projectLeadId: actorId, role: { $in: ['TASKER', 'QUALITY_REVIEWER'] } }).select('_id');
        const teamIds = team.map((u) => u._id);
        leavePanel.pendingApprovals = await LeaveRequest.countDocuments({ userId: { $in: teamIds }, status: 'PL_PENDING' });
        leavePanel.teamOnLeaveToday = await LeaveRequest.countDocuments({
          userId: { $in: teamIds },
          status: 'APPROVED',
          startDate: { $lte: end },
          endDate: { $gte: start },
        });
        leavePanel.recentRequests = await LeaveRequest.find({ userId: { $in: teamIds } })
          .populate('userId', 'fullName role')
          .sort({ createdAt: -1 })
          .limit(5)
          .lean();
      }
    }

    res.json({
      success: true,
      data: { todaySessions, myEntries, punchStatus: { isPunchedIn: !!punchRecord?.punchIn && !punchRecord?.punchOut, punchIn: punchRecord?.punchIn, punchOut: punchRecord?.punchOut, totalMinutes: punchRecord?.totalMinutes }, stats, teamInfo, leavePanel },
      message: 'OK',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, data: null, message: 'Server error' });
  }
});

// GET /api/dashboard/team-progress (PL/QR)
router.get('/team-progress', authenticate, requirePLorQR, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role, id, projectLeadId } = req.user!;
    const plId = new mongoose.Types.ObjectId(role === 'PROJECT_LEAD' ? id : projectLeadId!);
    const { start, end } = todayRange();
    const { date, projectId } = req.query;

    const dateFilter = date
      ? (() => {
          const d = new Date(date as string);
          const n = new Date(d);
          n.setDate(n.getDate() + 1);
          return { $gte: d, $lt: n };
        })()
      : { $gte: start, $lte: end };

    const sessionFilter: Record<string, unknown> = { date: dateFilter };
    const plProjects = await Project.find({ projectLeadId: plId }).select('_id name');
    const plProjectIds = plProjects.map((p) => p._id);
    sessionFilter.projectId = projectId ? new mongoose.Types.ObjectId(projectId as string) : { $in: plProjectIds };

    const sessions = await TodoSession.find(sessionFilter).populate('projectId', 'name taskType dailyTarget').lean();
    const sessionProgress = await Promise.all(sessions.map(async (session) => {
      const entries = await TaskEntry.find({ todoSessionId: session._id }).populate('assigneeId', 'fullName email jobTitle qualityReviewerId qualityLevel').lean();
      const total = entries.reduce((a, e) => a + (e.countTarget || 0), 0);
      const done = entries.reduce((a, e) => a + (e.countDone || 0), 0);
      return { session, entries, overall: { total, done, percent: total > 0 ? Math.round((done / total) * 100) : 0 } };
    }));

    const teamMembers = await User.find({ projectLeadId: plId }).select('-passwordHash').populate('qualityReviewerId', 'fullName').lean();
    res.json({ success: true, data: { sessionProgress, teamMembers, projects: plProjects }, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, data: null, message: 'Server error' });
  }
});

// GET /api/dashboard/monthly-report (PL/QR) -> Flexible Range Report
router.get('/monthly-report', authenticate, requirePLorQR, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role, id, projectLeadId } = req.user!;
    const { month, year, from, to } = req.query as { month?: string; year?: string; from?: string; to?: string };
    
    let start: Date;
    let end: Date;

    if (from && to) {
      start = new Date(from);
      start.setHours(0, 0, 0, 0);
      end = new Date(to);
      end.setHours(23, 59, 59, 999);
    } else {
      const range = monthRange(month, year);
      start = range.start;
      end = range.end;
    }

    const plId = new mongoose.Types.ObjectId(role === 'PROJECT_LEAD' ? id : projectLeadId!);
    const qrId = role === 'QUALITY_REVIEWER' ? new mongoose.Types.ObjectId(id) : null;

    const projects = await Project.find({ projectLeadId: plId }).select('_id').lean();
    const projectIds = projects.map((p) => p._id);

    const sessions = await TodoSession.find({
      projectId: { $in: projectIds },
      date: { $gte: start, $lte: end },
    }).select('_id date').lean();
    const sessionIds = sessions.map((s) => s._id);

    const qrs = await User.find({ role: 'QUALITY_REVIEWER', projectLeadId: plId }).select('_id fullName').lean();
    const taskerFilter: Record<string, unknown> = { role: 'TASKER', projectLeadId: plId };
    if (qrId) taskerFilter.qualityReviewerId = qrId;
    const taskers = await User.find(taskerFilter).select('_id fullName qualityReviewerId').lean();
    const taskerIds = taskers.map((t) => t._id);

    const entries = await TaskEntry.find({
      assigneeId: { $in: taskerIds },
      todoSessionId: { $in: sessionIds },
    }).select('assigneeId todoSessionId status reviewStatus countDone countTarget totalDurationSeconds updatedAt').lean();

    const sessionsById = new Map(sessions.map((s) => [s._id.toString(), s]));

    // Generate Trend Data based on the actual range
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const trend = Array.from({ length: diffDays + 1 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return {
        date: d.toISOString().slice(0, 10),
        day: d.getDate(),
        label: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        pendingReviews: 0,
      };
    });

    const dateToIdx = new Map(trend.map((t, i) => [t.date, i]));

    for (const e of entries) {
      const s = sessionsById.get(e.todoSessionId.toString());
      if (!s) continue;
      const dateKey = new Date(s.date).toISOString().slice(0, 10);
      const idx = dateToIdx.get(dateKey);
      if (idx !== undefined) {
        const bucket = trend[idx];
        bucket.totalTasks += 1;
        if (e.status === 'DONE') bucket.completedTasks += 1;
        else bucket.pendingTasks += 1;
        if (e.status === 'DONE' && e.reviewStatus === 'PENDING') bucket.pendingReviews += 1;
      }
    }

    const activeTaskerSet = new Set(entries.map((e) => e.assigneeId.toString()));
    const totalTasks = entries.length;
    const completedTasks = entries.filter((e) => e.status === 'DONE').length;
    const pendingTasks = totalTasks - completedTasks;
    const submissionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const commonData = {
      totalTasks,
      completedTasks,
      pendingTasks,
      submissionPercentage,
      activeTaskers: activeTaskerSet.size,
      trend,
    };

    if (role === 'PROJECT_LEAD') {
      const qrRows = qrs.map((qr) => {
        const qrTaskers = taskers.filter((t) => t.qualityReviewerId?.toString() === qr._id.toString());
        const qrTaskerIds = new Set(qrTaskers.map((t) => t._id.toString()));
        const qrEntries = entries.filter((e) => qrTaskerIds.has(e.assigneeId.toString()));
        const qrTotal = qrEntries.length;
        const qrCompleted = qrEntries.filter((e) => e.status === 'DONE').length;
        return {
          qrId: qr._id,
          qrName: qr.fullName,
          totalTaskers: qrTaskers.length,
          totalTasks: qrTotal,
          completedTasks: qrCompleted,
          pendingTasks: qrTotal - qrCompleted,
          submissionPercentage: qrTotal > 0 ? Math.round((qrCompleted / qrTotal) * 100) : 0,
          activeTaskers: new Set(qrEntries.map((e) => e.assigneeId.toString())).size,
        };
      });

      res.json({
        success: true,
        data: {
          role: 'PROJECT_LEAD',
          cards: { ...commonData, totalQRs: qrs.length },
          hierarchy: qrRows,
          trend,
        },
        message: 'OK',
      });
    } else {
      const taskerRows = taskers.map((t) => {
        const tEntries = entries.filter((e) => e.assigneeId.toString() === t._id.toString());
        const tTotal = tEntries.length;
        const tCompleted = tEntries.filter((e) => e.status === 'DONE').length;
        return {
          taskerId: t._id,
          taskerName: t.fullName,
          totalAssignedTasks: tTotal,
          completedSubmissions: tCompleted,
          pendingReviews: tEntries.filter((e) => e.status === 'DONE' && e.reviewStatus === 'PENDING').length,
          completionRate: tTotal > 0 ? Math.round((tCompleted / tTotal) * 100) : 0,
          isActive: tEntries.length > 0,
        };
      });

      res.json({
        success: true,
        data: {
          role: 'QUALITY_REVIEWER',
          cards: {
            totalAssignedTasks: totalTasks,
            completedSubmissions: completedTasks,
            pendingReviews: entries.filter((e) => e.status === 'DONE' && e.reviewStatus === 'PENDING').length,
            completionRate: submissionPercentage,
            activeTaskers: activeTaskerSet.size,
            inactiveTaskers: Math.max(0, taskers.length - activeTaskerSet.size),
          },
          hierarchy: taskerRows,
          trend,
        },
        message: 'OK',
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, data: null, message: 'Server error' });
  }
});

export default router;
