import { create } from 'zustand';

interface AttendanceRecord {
  _id: string;
  userId: string;
  date: string;
  punchIn?: string;
  punchOut?: string;
  totalMinutes?: number;
}

interface AttendanceState {
  todayRecord: AttendanceRecord | null;
  isPunchedIn: boolean;
  setTodayRecord: (record: AttendanceRecord | null) => void;
  punchIn: (record: AttendanceRecord) => void;
  punchOut: (record: AttendanceRecord) => void;
}

export const useAttendanceStore = create<AttendanceState>((set) => ({
  todayRecord: null,
  isPunchedIn: false,
  setTodayRecord: (record) =>
    set({ todayRecord: record, isPunchedIn: !!record?.punchIn && !record?.punchOut }),
  punchIn: (record) => set({ todayRecord: record, isPunchedIn: true }),
  punchOut: (record) => set({ todayRecord: record, isPunchedIn: false }),
}));
