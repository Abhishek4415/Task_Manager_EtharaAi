import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITaskEntryLog extends Document {
  entryId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  action: string;
  value?: string;
  createdAt: Date;
}

const TaskEntryLogSchema = new Schema<ITaskEntryLog>(
  {
    entryId: { type: Schema.Types.ObjectId, ref: 'TaskEntry', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    value: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

TaskEntryLogSchema.index({ entryId: 1 });

const TaskEntryLog: Model<ITaskEntryLog> = mongoose.model<ITaskEntryLog>('TaskEntryLog', TaskEntryLogSchema);
export default TaskEntryLog;
