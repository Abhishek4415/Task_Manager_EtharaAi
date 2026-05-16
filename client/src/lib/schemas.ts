import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Valid email required').endsWith('@ethara.ai', 'Only @ethara.ai emails are allowed'),
  password: z.string().min(1, 'Password required'),
});

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name required'),
  email: z.string().email('Valid email required').endsWith('@ethara.ai', 'Only @ethara.ai emails are allowed'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['PROJECT_LEAD', 'QUALITY_REVIEWER', 'TASKER']),
  jobTitle: z.string().optional(),
  projectLeadId: z.string().optional(),
  qualityReviewerId: z.string().optional(),
}).refine(
  (d) => d.role === 'PROJECT_LEAD' || !!d.projectLeadId,
  { message: 'Project Lead is required', path: ['projectLeadId'] }
).refine(
  (d) => d.role !== 'TASKER' || !!d.qualityReviewerId,
  { message: 'Quality Reviewer is required', path: ['qualityReviewerId'] }
);

export const projectSchema = z.object({
  name: z.string().min(2, 'Project name required'),
  description: z.string().optional(),
  taskType: z.enum(['STEM', 'NON_STEM']),
  dailyTarget: z.number().int().min(1).optional(),
  status: z.string().optional(),
});

export const todoSessionSchema = z.object({
  title: z.string().min(2, 'Title required'),
  date: z.string().min(1, 'Date required'),
  projectId: z.string().min(1, 'Project required'),
  taskType: z.enum(['STEM', 'NON_STEM']),
  totalAssigned: z.number().int().min(0).optional(),
  assigneeIds: z.array(z.string()).min(1, 'Select at least one tasker'),
  customButtons: z.array(z.object({
    label: z.string(),
    buttonType: z.enum(['DONE_ALL', 'COUNT_INPUT', 'PARTIAL_DONE', 'CUSTOM']),
    color: z.string().optional(),
    isCountInput: z.boolean(),
    sortOrder: z.number(),
  })).optional(),
});

export const leaveSchema = z.object({
  type: z.enum(['SICK', 'PERSONAL', 'ANNUAL', 'EMERGENCY']),
  startDate: z.string().min(1, 'Start date required'),
  endDate: z.string().min(1, 'End date required'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type TodoSessionInput = z.infer<typeof todoSessionSchema>;
export type LeaveInput = z.infer<typeof leaveSchema>;
