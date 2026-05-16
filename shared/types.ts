export type Role = 'PROJECT_LEAD' | 'QUALITY_REVIEWER' | 'TASKER';
export type TaskType = 'STEM' | 'NON_STEM';
export type EntryStatus = 'TODO' | 'IN_PROGRESS' | 'PARTIAL' | 'DONE' | 'SKIPPED';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ButtonType = 'DONE_ALL' | 'COUNT_INPUT' | 'PARTIAL_DONE' | 'CUSTOM';

export interface IUser {
  _id: string;
  fullName: string;
  email: string;
  role: Role;
  jobTitle?: string;
  projectLeadId?: string;
  qualityReviewerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IProject {
  _id: string;
  name: string;
  description?: string;
  taskType: TaskType;
  dailyTarget?: number;
  projectLeadId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ITodoButton {
  _id?: string;
  label: string;
  buttonType: ButtonType;
  color?: string;
  isCountInput: boolean;
  sortOrder: number;
}

export interface ITodoSession {
  _id: string;
  title: string;
  date: string;
  taskType: TaskType;
  totalAssigned: number;
  projectId: string | IProject;
  createdById: string | IUser;
  stemFileUrl?: string;
  stemFileData?: unknown[];
  customButtons: ITodoButton[];
  createdAt: string;
}

export interface ITaskEntry {
  _id: string;
  todoSessionId: string | ITodoSession;
  assigneeId: string | IUser;
  stemRowIndex?: number;
  stemRowData?: Record<string, unknown>;
  status: EntryStatus;
  countDone?: number;
  countTarget?: number;
  notes?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ITaskEntryLog {
  _id: string;
  entryId: string;
  userId: string | IUser;
  action: string;
  value?: string;
  createdAt: string;
}

export interface IAttendance {
  _id: string;
  userId: string | IUser;
  date: string;
  punchIn?: string;
  punchOut?: string;
  totalMinutes?: number;
}

export interface ILeaveRequest {
  _id: string;
  userId: string | IUser;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  reviewedById?: string | IUser;
  reviewNote?: string;
  createdAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message: string;
}

export interface AuthUser extends IUser {
  token: string;
  projectLead?: IUser;
  qualityReviewer?: IUser;
}
