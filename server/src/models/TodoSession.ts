import mongoose, { Schema, Document, Model } from 'mongoose';
import { TaskType } from './Project';

export type ButtonType = 'DONE_ALL' | 'COUNT_INPUT' | 'PARTIAL_DONE' | 'CUSTOM';

export interface ITodoButton {
  _id?: mongoose.Types.ObjectId;
  label: string;
  buttonType: ButtonType;
  color?: string;
  isCountInput: boolean;
  sortOrder: number;
}

export interface ITodoSession extends Document {
  title: string;
  date: Date;
  taskType: TaskType;
  totalAssigned: number;
  projectId: mongoose.Types.ObjectId;
  createdById: mongoose.Types.ObjectId;
  stemFileUrl?: string;
  stemFileData?: unknown[];
  customButtons: ITodoButton[];
  createdAt: Date;
}

const TodoButtonSchema = new Schema<ITodoButton>({
  label: { type: String, required: true },
  buttonType: { type: String, enum: ['DONE_ALL', 'COUNT_INPUT', 'PARTIAL_DONE', 'CUSTOM'], required: true },
  color: { type: String },
  isCountInput: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0 },
});

const TodoSessionSchema = new Schema<ITodoSession>(
  {
    title: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    taskType: { type: String, enum: ['STEM', 'NON_STEM'], required: true },
    totalAssigned: { type: Number, default: 0 },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    stemFileUrl: { type: String },
    stemFileData: { type: Schema.Types.Mixed },
    customButtons: { type: [TodoButtonSchema], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

TodoSessionSchema.index({ date: 1 });
TodoSessionSchema.index({ projectId: 1 });
TodoSessionSchema.index({ createdById: 1 });

const TodoSession: Model<ITodoSession> = mongoose.model<ITodoSession>('TodoSession', TodoSessionSchema);
export default TodoSession;
