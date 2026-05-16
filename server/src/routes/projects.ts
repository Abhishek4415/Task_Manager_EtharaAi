import { Router, Response } from 'express';
import { body } from 'express-validator';
import mongoose from 'mongoose';
import Project from '../models/Project';
import TodoSession from '../models/TodoSession';
import TaskEntry from '../models/TaskEntry';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requirePL } from '../middleware/roleGuard';
import { validate } from '../middleware/validate';

const router = Router();

const getPlId = (req: AuthRequest): mongoose.Types.ObjectId => {
  const { role, id, projectLeadId } = req.user!;
  return new mongoose.Types.ObjectId(role === 'PROJECT_LEAD' ? id : projectLeadId!);
};

// GET /api/projects
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const plId = getPlId(req);
    const projects = await Project.find({ projectLeadId: plId })
      .populate('projectLeadId', 'fullName email')
      .lean();
    res.json({ success: true, data: projects, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, data: null, message: 'Server error' });
  }
});

// GET /api/projects/by-pl/:plId (protected)
router.get('/by-pl/:plId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const plId = req.params.plId as string;
    if (!mongoose.isValidObjectId(plId)) {
      res.status(400).json({ success: false, data: null, message: 'Invalid plId' });
      return;
    }
    const projects = await Project.find({ projectLeadId: new mongoose.Types.ObjectId(plId) })
      .select('_id name status')
      .lean();
    res.json({ success: true, data: projects, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, data: null, message: 'Server error' });
  }
});

// POST /api/projects (PL only)
router.post(
  '/',
  authenticate,
  requirePL,
  [
    body('name').trim().notEmpty().withMessage('Project name is required'),
    body('taskType').isIn(['STEM', 'NON_STEM']).withMessage('Invalid task type'),
    body('dailyTarget').optional().isInt({ min: 1 }),
  ],
  validate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, description, taskType, dailyTarget } = req.body;
      const project = await Project.create({
        name,
        description,
        taskType,
        dailyTarget: taskType === 'NON_STEM' ? dailyTarget : undefined,
        projectLeadId: new mongoose.Types.ObjectId(req.user!.id),
      });
      res.status(201).json({ success: true, data: project, message: 'Project created' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, data: null, message: 'Server error' });
    }
  }
);

// GET /api/projects/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const plId = getPlId(req);
    const project = await Project.findOne({ _id: req.params.id as string, projectLeadId: plId })
      .populate('projectLeadId', 'fullName email')
      .lean();
    if (!project) {
      res.status(404).json({ success: false, data: null, message: 'Project not found' });
      return;
    }
    res.json({ success: true, data: project, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, data: null, message: 'Server error' });
  }
});

// PUT /api/projects/:id (PL only)
router.put('/:id', authenticate, requirePL, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id as string, projectLeadId: new mongoose.Types.ObjectId(req.user!.id) },
      { $set: req.body },
      { new: true }
    );
    if (!project) {
      res.status(404).json({ success: false, data: null, message: 'Project not found' });
      return;
    }
    res.json({ success: true, data: project, message: 'Project updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, data: null, message: 'Server error' });
  }
});

// DELETE /api/projects/:id (PL only)
router.delete('/:id', authenticate, requirePL, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const project = await Project.findOne({
      _id: req.params.id as string,
      projectLeadId: new mongoose.Types.ObjectId(req.user!.id),
    });
    if (!project) {
      res.status(404).json({ success: false, data: null, message: 'Project not found' });
      return;
    }

    // Cascade delete: remove all sessions and task entries under this project
    const sessions = await TodoSession.find({ projectId: project._id }).select('_id').lean();
    const sessionIds = sessions.map((s) => s._id);
    if (sessionIds.length > 0) {
      await TaskEntry.deleteMany({ todoSessionId: { $in: sessionIds } });
      await TodoSession.deleteMany({ _id: { $in: sessionIds } });
    }
    await Project.deleteOne({ _id: project._id });

    res.json({ success: true, data: null, message: 'Project deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, data: null, message: 'Server error' });
  }
});

export default router;
