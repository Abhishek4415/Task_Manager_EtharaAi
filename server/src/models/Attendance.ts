import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAttendance extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  punchIn?: Date;
  punchOut?: Date;
  totalMinutes?: number;
}

const AttendanceSchema = new Schema<IAttendance>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  punchIn: { type: Date },
  punchOut: { type: Date },
  totalMinutes: { type: Number },
});

// Compound unique: one record per user per day
AttendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

const Attendance: Model<IAttendance> = mongoose.model<IAttendance>('Attendance', AttendanceSchema);
export default Attendance;
