import { Router, Response } from 'express';
import { body } from 'express-validator';
import mongoose from 'mongoose';
import multer from 'multer';
import * as XLSX from 'xlsx';
import TodoSession from '../models/TodoSession';
import TaskEntry from '../models/TaskEntry';
import Project from '../models/Project';
import User from '../models/User';
import Notification from '../models/Notification';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requirePL } from '../middleware/roleGuard';
import { validate } from '../middleware/validate';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Helper: resolve PL id from user
const getPlId = (req: AuthRequest): string => {
  const { role, id, projectLeadId } = req.user!;
  return role === 'PROJECT_LEAD' ? id : projectLeadId!;
};

// POST /api/todo-sessions (PL only)
router.post(
  '/',
  authenticate,
  requirePL,
  [
    body('title').trim().notEmpty(),
    body('date').isISO8601(),
    body('projectId').notEmpty(),
    body('taskType').isIn(['STEM', 'NON_STEM']),
    body('assigneeIds').isArray({ min: 1 }),
  ],
  validate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { title, date, projectId, taskType, totalAssigned, assigneeIds, customButtons } = req.body;

      // Verify project belongs to PL
      const project = await Project.findOne({
        _id: projectId,
        projectLeadId: new mongoose.Types.ObjectId(req.user!.id),
      });
      if (!project) {
        res.status(404).json({ success: false, data: null, message: 'Project not found' });
        return;
      }

      const session = await TodoSession.create({
        title,
        date: new Date(date),
        taskType,
        totalAssigned: totalAssigned || 0,
        projectId: new mongoose.Types.ObjectId(projectId),
        createdById: new mongoose.Types.ObjectId(req.user!.id),
        customButtons: customButtons || [],
      });

      // Create one TaskEntry per assignee
      const entries = assigneeIds.map((assigneeId: string) => ({
        todoSessionId: session._id,
        assigneeId: new mongoose.Types.ObjectId(assigneeId),
        status: 'TODO',
        countTarget: taskType === 'NON_STEM' ? project.dailyTarget : undefined,
        countDone: 0,
      }));
      await TaskEntry.insertMany(entries);

      const assignees = await User.find({ _id: { $in: assigneeIds.map((a: string) => new mongoose.Types.ObjectId(a)) } })
        .select('_id fullName')
        .lean();
      if (assignees.length > 0) {
        await Notification.insertMany(
          assignees.map((u) => ({
            userId: u._id,
            type: 'TASK_ASSIGNED' as const,
            title: 'New Task Assigned',
            message: `${title} assigned by Project Lead.`,
            entityType: 'SESSION' as const,
            entityId: session._id,
          }))
        );
      }

      res.status(201).json({ success: true, data: session, message: 'Session created' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, data: null, message: 'Server error' });
    }
  }
);

// GET /api/todo-sessions
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { date, projectId } = req.query;
    const { role, id, projectLeadId } = req.user!;

    let sessionFilter: Record<string, unknown> = {};

    if (date) {
      const d = new Date(date as string);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      sessionFilter.date = { $gte: d, $lt: next };
    }
    if (projectId) sessionFilter.projectId = new mongoose.Types.ObjectId(projectId as string);

    if (role === 'PROJECT_LEAD') {
      sessionFilter.createdById = new mongoose.Types.ObjectId(id);
    } else if (role === 'QUALITY_REVIEWER') {
      // Sessions for their PL's projects
      const plProjects = await Project.find({
        projectLeadId: new mongoose.Types.ObjectId(projectLeadId!),
      }).select('_id');
      sessionFilter.projectId = { $in: plProjects.map((p) => p._id) };
    } else {
      // TASKER — find sessions where they are an assignee
      const assignedEntries = await TaskEntry.find({ assigneeId: new mongoose.Types.ObjectId(id) }).select('todoSessionId');
      const sessionIds = [...new Set(assignedEntries.map((e) => e.todoSessionId.toString()))];
      sessionFilter._id = { $in: sessionIds.map((sid) => new mongoose.Types.ObjectId(sid)) };
    }

    const sessions = await TodoSession.find(sessionFilter)
      .populate('projectId', 'name taskType dailyTarget')
      .populate('createdById', 'fullName')
      .sort({ date: -1 })
      .lean();

    res.json({ success: true, data: sessions, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, data: null, message: 'Server error' });
  }
});

// GET /api/todo-sessions/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const session = await TodoSession.findById(req.params.id as string)
      .populate('projectId', 'name taskType dailyTarget')
      .populate('createdById', 'fullName email')
      .lean();
    if (!session) {
      res.status(404).json({ success: false, data: null, message: 'Session not found' });
      return;
    }
    const entries = await TaskEntry.find({ todoSessionId: req.params.id as string })
      .populate('assigneeId', 'fullName email jobTitle')
      .lean();
    res.json({ success: true, data: { ...session, entries }, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, data: null, message: 'Server error' });
  }
});

// PUT /api/todo-sessions/:id (PL only)
router.put('/:id', authenticate, requirePL, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const session = await TodoSession.findOneAndUpdate(
      { _id: req.params.id as string, createdById: new mongoose.Types.ObjectId(req.user!.id) },
      { $set: req.body },
      { new: true }
    );
    if (!session) {
      res.status(404).json({ success: false, data: null, message: 'Session not found' });
      return;
    }
    res.json({ success: true, data: session, message: 'Session updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, data: null, message: 'Server error' });
  }
});

// DELETE /api/todo-sessions/:id (PL only)
router.delete('/:id', authenticate, requirePL, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const session = await TodoSession.findOneAndDelete({
      _id: req.params.id as string,
      createdById: new mongoose.Types.ObjectId(req.user!.id),
    });
    if (!session) {
      res.status(404).json({ success: false, data: null, message: 'Session not found' });
      return;
    }
    await TaskEntry.deleteMany({ todoSessionId: req.params.id as string });
    res.json({ success: true, data: null, message: 'Session deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, data: null, message: 'Server error' });
  }
});

// POST /api/todo-sessions/:id/upload-stem (PL only)
router.post(
  '/:id/upload-stem',
  authenticate,
  requirePL,
  upload.single('file'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, data: null, message: 'No file uploaded' });
        return;
      }
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      const session = await TodoSession.findOneAndUpdate(
        { _id: req.params.id as string, createdById: new mongoose.Types.ObjectId(req.user!.id) },
        { $set: { stemFileData: rows, totalAssigned: rows.length } },
        { new: true }
      );
      if (!session) {
        res.status(404).json({ success: false, data: null, message: 'Session not found' });
        return;
      }

      // Update TaskEntries with per-row data
      const entries = await TaskEntry.find({ todoSessionId: req.params.id as string });
      const updateOps = entries.flatMap((entry) =>
        rows.map((row, idx) => ({
          updateOne: {
            filter: { todoSessionId: session._id, assigneeId: entry.assigneeId, stemRowIndex: idx },
            update: { $set: { stemRowData: row as Record<string, unknown>, stemRowIndex: idx, status: 'TODO' as const } },
            upsert: true,
          },
        }))
      );
      if (updateOps.length > 0) await TaskEntry.bulkWrite(updateOps as Parameters<typeof TaskEntry.bulkWrite>[0]);

      res.json({ success: true, data: { rows: rows.length, session }, message: 'STEM file uploaded' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, data: null, message: 'Server error' });
    }
  }
);

// GET /api/todo-sessions/:id/progress
router.get('/:id/progress', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const entries = await TaskEntry.find({ todoSessionId: req.params.id as string })
      .populate('assigneeId', 'fullName email jobTitle')
      .lean();

    // Group by assignee
    const grouped: Record<string, {
      assignee: unknown;
      totalAssigned: number;
      countDone: number;
      entries: typeof entries;
      lastUpdated: Date | null;
    }> = {};

    for (const entry of entries) {
      const aid = entry.assigneeId?._id?.toString() || entry.assigneeId?.toString();
      if (!grouped[aid]) {
        grouped[aid] = {
          assignee: entry.assigneeId,
          totalAssigned: entry.countTarget || 0,
          countDone: 0,
          entries: [],
          lastUpdated: null,
        };
      }
      grouped[aid].countDone += entry.countDone || 0;
      grouped[aid].entries.push(entry);
      const up = entry.updatedAt as Date;
      if (!grouped[aid].lastUpdated || up > grouped[aid].lastUpdated!) {
        grouped[aid].lastUpdated = up;
      }
    }

    const result = Object.values(grouped).map((g) => ({
      ...g,
      percentComplete: g.totalAssigned > 0 ? Math.round((g.countDone / g.totalAssigned) * 100) : 0,
      status: g.countDone === 0 ? 'TODO' : g.countDone >= g.totalAssigned ? 'DONE' : 'IN_PROGRESS',
    }));

    res.json({ success: true, data: result, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, data: null, message: 'Server error' });
  }
});

export default router;
