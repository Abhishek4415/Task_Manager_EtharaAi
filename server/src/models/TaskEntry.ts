import mongoose, { Schema, Document, Model } from 'mongoose';

export type EntryStatus = 'TODO' | 'IN_PROGRESS' | 'PARTIAL' | 'DONE' | 'SKIPPED';

export interface ITaskEntry extends Document {
  todoSessionId: mongoose.Types.ObjectId;
  assigneeId: mongoose.Types.ObjectId;
  stemRowIndex?: number;
  stemRowData?: Record<string, unknown>;
  status: EntryStatus;
  countDone?: number;
  countTarget?: number;
  notes?: string;
  completedAt?: Date;
  timeLogs: { startTime: Date; endTime: Date; durationSeconds: number }[];
  currentTimerStart?: Date | null;
  isTiming: boolean;
  totalDurationSeconds: number;
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNote?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TaskEntrySchema = new Schema<ITaskEntry>(
  {
    todoSessionId: { type: Schema.Types.ObjectId, ref: 'TodoSession', required: true },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    stemRowIndex: { type: Number },
    stemRowData: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['TODO', 'IN_PROGRESS', 'PARTIAL', 'DONE', 'SKIPPED'],
      default: 'TODO',
    },
    countDone: { type: Number, min: 0 },
    countTarget: { type: Number, min: 0 },
    notes: { type: String },
    completedAt: { type: Date },
    timeLogs: [
      {
        startTime: { type: Date, required: true },
        endTime: { type: Date, required: true },
        durationSeconds: { type: Number, required: true },
      },
    ],
    currentTimerStart: { type: Date, default: null },
    isTiming: { type: Boolean, default: false },
    totalDurationSeconds: { type: Number, default: 0 },
    reviewStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    reviewNote: { type: String },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

TaskEntrySchema.index({ todoSessionId: 1 });
TaskEntrySchema.index({ assigneeId: 1 });
TaskEntrySchema.index({ todoSessionId: 1, assigneeId: 1 });

const TaskEntry: Model<ITaskEntry> = mongoose.model<ITaskEntry>('TaskEntry', TaskEntrySchema);
export default TaskEntry;
