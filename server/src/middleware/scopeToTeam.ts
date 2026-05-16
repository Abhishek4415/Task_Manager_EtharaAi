import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import mongoose from 'mongoose';

/**
 * Returns a MongoDB filter that scopes the query to the user's team.
 * PROJECT_LEAD  → filter by projectLeadId = self._id
 * QUALITY_REVIEWER → filter by projectLeadId = self.projectLeadId
 * TASKER → filter by userId/assigneeId = self._id
 */
export const getTeamFilter = (user: AuthRequest['user']): Record<string, unknown> => {
  if (!user) return {};

  switch (user.role) {
    case 'PROJECT_LEAD':
      return { projectLeadId: new mongoose.Types.ObjectId(user.id) };
    case 'QUALITY_REVIEWER':
      return { projectLeadId: new mongoose.Types.ObjectId(user.projectLeadId!) };
    case 'TASKER':
      return { _id: new mongoose.Types.ObjectId(user.id) };
    default:
      return {};
  }
};

/**
 * Middleware that attaches teamFilter to req for use in route handlers.
 */
export const scopeToTeam = (req: AuthRequest, _res: Response, next: NextFunction): void => {
  if (req.user) {
    (req as AuthRequest & { teamFilter: Record<string, unknown> }).teamFilter = getTeamFilter(req.user);
  }
  next();
};
