import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Play, Square, CheckCircle2, Clock, BarChart3, ClipboardList, RefreshCw, Pause, Users, Activity } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useDashboardToday, useMonthlyReport } from '../hooks/useDashboard';
import { useAttendanceReport } from '../hooks/useAttendance';
import { usePunchIn, usePunchOut } from '../hooks/useAttendance';
import { useUpdateProgress, useUpdateTimer } from '../hooks/useTaskEntries';
import { formatTime, formatMinutes, statusColor, statusLabel, getInitials } from '../lib/utils';
import toast from 'react-hot-toast';

function Stopwatch({ punchIn }: { punchIn: string }) {
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const start = new Date(punchIn).getTime();
    ref.current = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [punchIn]);

  const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
  const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
  const s = String(elapsed % 60).padStart(2, '0');
  return <span style={{ fontFamily: 'monospace', fontSize: 26, fontWeight: 700, color: 'var(--color-teal)' }}>{h}:{m}:{s}</span>;
}

function TaskTimer({ isTiming, currentTimerStart, totalDurationSeconds }: { isTiming: boolean, currentTimerStart?: string | null, totalDurationSeconds: number }) {
  const [elapsed, setElapsed] = useState(totalDurationSeconds);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isTiming || !currentTimerStart) {
      setElapsed(totalDurationSeconds);
      if (ref.current) clearInterval(ref.current);
      return;
    }
    const start = new Date(currentTimerStart).getTime();
    ref.current = setInterval(() => {
      setElapsed(totalDurationSeconds + Math.floor((Date.now() - start) / 1000));
    }, 1000);
    setElapsed(totalDurationSeconds + Math.floor((Date.now() - start) / 1000));
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [isTiming, currentTimerStart, totalDurationSeconds]);

  const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
  const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
  const s = String(elapsed % 60).padStart(2, '0');
  return <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: isTiming ? 'var(--color-warning)' : 'var(--color-text)' }}>{h}:{m}:{s}</span>;
}

function MonthlyTrend({ points, mode }: { points: any[]; mode: 'PL' | 'QR' }) {
  if (!points.length) return null;
  const width = 1000;
  const height = 300;
  const padL = 60;
  const padR = 20;
  const padT = 30;
  const padB = 40;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;
  
  const maxValue = Math.max(1, ...points.map((p) => p.totalTasks));
  const ySteps = 5;
  const yAxisMax = Math.ceil(maxValue / ySteps) * ySteps;

  const x = (idx: number) => (points.length === 1 ? padL + chartW / 2 : padL + (idx / (points.length - 1)) * chartW);
  const y = (v: number) => padT + chartH - (v / yAxisMax) * chartH;
  
  const line = (key: string) => points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p[key] || 0)}`).join(' ');
  const area = (key: string) => `M ${x(0)} ${y(0)} ${line(key)} L ${x(points.length - 1)} ${y(0)} Z`;
  
  const secondKey = mode === 'PL' ? 'completedTasks' : 'pendingReviews';

  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 24, position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Activity size={20} style={{ color: 'var(--color-teal)' }} />
            Performance Trend
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>Daily task volume and completion metrics</div>
        </div>
        <div style={{ display: 'flex', gap: 20, fontSize: 13, fontWeight: 600 }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#14b8a6' }} /> Total Tasks</div>
           <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#3b82f6' }} /> {mode === 'PL' ? 'Completed' : 'Pending Reviews'}</div>
        </div>
      </div>

      <div style={{ overflowX: 'auto', paddingBottom: 10 }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', minWidth: 800, height: 300, overflow: 'visible' }}>
          {/* Horizontal Grid Lines */}
          {Array.from({ length: ySteps + 1 }).map((_, i) => {
            const val = Math.round((yAxisMax / ySteps) * i);
            const yy = y(val);
            return (
              <g key={i}>
                <line x1={padL} y1={yy} x2={width - padR} y2={yy} stroke="var(--color-border)" strokeWidth="1" strokeDasharray="4 4" />
                <text x={padL - 12} y={yy + 4} textAnchor="end" style={{ fill: 'var(--color-text-subtle)', fontSize: '11px', fontWeight: 600 }}>{val}</text>
              </g>
            );
          })}

          {/* Area shading */}
          <path d={area('totalTasks')} style={{ fill: 'rgba(20, 184, 166, 0.04)', transition: 'all 0.3s' }} />
          <path d={area(secondKey)} style={{ fill: 'rgba(59, 130, 246, 0.08)', transition: 'all 0.3s' }} />

          {/* Lines */}
          <motion.path initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, ease: 'easeInOut' }}
            d={line('totalTasks')} fill="none" stroke="#14b8a6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <motion.path initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, ease: 'easeInOut', delay: 0.2 }}
            d={line(secondKey)} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* X Axis Labels and Dots */}
          {points.map((p, i) => {
            const xx = x(i);
            const showLabel = points.length < 12 || i % Math.ceil(points.length / 10) === 0;
            return (
              <g key={i}>
                {showLabel && (
                  <>
                    <line x1={xx} y1={padT} x2={xx} y2={height - padB} stroke="var(--color-border-subtle)" strokeWidth="1" />
                    <text x={xx} y={height - 12} textAnchor="middle" style={{ fill: 'var(--color-text-subtle)', fontSize: '11px', fontWeight: 700 }}>{p.label || p.day}</text>
                  </>
                )}
                <circle cx={xx} cy={y(p.totalTasks)} r="4" fill="var(--color-surface)" stroke="#14b8a6" strokeWidth="2" />
                <circle cx={xx} cy={y(p[secondKey])} r="4" fill="var(--color-surface)" stroke="#3b82f6" strokeWidth="2" />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { isPunchedIn } = useAttendanceStore();
  const { data, isLoading, refetch } = useDashboardToday();
  const punchInMut = usePunchIn();
  const punchOutMut = usePunchOut();
  const updateProgressMut = useUpdateProgress();
  const updateTimerMut = useUpdateTimer();
  const [countInputs, setCountInputs] = useState<Record<string, number>>({});
  
  const now = new Date();
  const [reportType, setReportType] = useState<'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'MTD' | 'CUSTOM'>('MONTH');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const todayIso = new Date().toISOString().slice(0, 10);
  const [customFrom, setCustomFrom] = useState(todayIso);
  const [customTo, setCustomTo] = useState(todayIso);

  const getDates = () => {
    const today = new Date(); today.setHours(0,0,0,0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    
    if (reportType === 'TODAY') return { from: today.toISOString().slice(0, 10), to: today.toISOString().slice(0, 10) };
    if (reportType === 'YESTERDAY') return { from: yesterday.toISOString().slice(0, 10), to: yesterday.toISOString().slice(0, 10) };
    if (reportType === 'WEEK') {
      const week = new Date(today); week.setDate(week.getDate() - 6);
      return { from: week.toISOString().slice(0, 10), to: today.toISOString().slice(0, 10) };
    }
    if (reportType === 'MTD') {
      const mtd = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: mtd.toISOString().slice(0, 10), to: today.toISOString().slice(0, 10) };
    }
    if (reportType === 'MONTH') {
      const mStart = new Date(year, month - 1, 1);
      const mEnd = new Date(year, month, 0);
      return { from: mStart.toISOString().slice(0, 10), to: mEnd.toISOString().slice(0, 10) };
    }
    return { from: customFrom, to: customTo };
  };

  const dates = getDates();
  const { data: monthlyData, isLoading: monthlyLoading } = useMonthlyReport({ 
    month: reportType === 'MONTH' ? month : undefined, 
    year: reportType === 'MONTH' ? year : undefined,
    from: reportType !== 'MONTH' ? dates.from : undefined,
    to: reportType !== 'MONTH' ? dates.to : undefined,
  });

  const [rangeType, setRangeType] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM'>('DAILY');
  const getAttendanceRange = () => {
    const end = new Date();
    const start = new Date();
    if (rangeType === 'WEEKLY') start.setDate(end.getDate() - 6);
    else if (rangeType === 'MONTHLY') start.setDate(1);
    else if (rangeType === 'CUSTOM') return { from: customFrom, to: customTo };
    return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
  };
  const { data: attendanceReport, isLoading: attendanceLoading } = useAttendanceReport(getAttendanceRange());

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
        <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-teal)' }} />
      </div>
    );
  }

  const { todaySessions = [], myEntries = [], punchStatus, stats, teamInfo, leavePanel } = data || {};
  const punchedIn = punchStatus?.isPunchedIn || isPunchedIn;
  const getEntryTarget = (entry: any) => (entry?.countTarget && entry.countTarget > 0 ? entry.countTarget : 1);
  const getEntryDone = (entry: any) => {
    const target = getEntryTarget(entry);
    if (entry?.countTarget && entry.countTarget > 0) return Math.min(entry?.countDone || 0, target);
    return entry?.status === 'DONE' ? 1 : 0;
  };

  // Role-based render for PL/QR
  if (user?.role !== 'TASKER') {
    const isPL = user?.role === 'PROJECT_LEAD';
    const isQR = user?.role === 'QUALITY_REVIEWER';
    const cards = monthlyData?.cards || {};
    const trend = monthlyData?.trend || [];
    const rows = monthlyData?.hierarchy || [];
    const punchedInRole = punchStatus?.isPunchedIn || isPunchedIn;
    const reportRecords = (attendanceReport as any)?.records || [];
    const reportSummary = (attendanceReport as any)?.summary || {};

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {isQR && (
          <>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: '24px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-subtle)', letterSpacing: 2, marginBottom: 6 }}>QUALITY REVIEWER ATTENDANCE</div>
                  {punchedInRole && punchStatus?.punchIn ? <Stopwatch punchIn={punchStatus.punchIn} /> : <span style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>00:00:00</span>}
                  <div style={{ marginTop: 8, display: 'flex', gap: 24 }}>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      <span style={{ color: 'var(--color-text-subtle)', fontWeight: 600 }}>PUNCH IN</span><br />
                      <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{punchStatus?.punchIn ? formatTime(punchStatus.punchIn) : '—'}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      <span style={{ color: 'var(--color-text-subtle)', fontWeight: 600 }}>PUNCH OUT</span><br />
                      <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{punchStatus?.punchOut ? formatTime(punchStatus.punchOut) : '—'}</span>
                    </div>
                  </div>
                </div>
                <div>
                  {!punchedInRole ? (
                    <button className="btn btn-success btn-lg" onClick={() => punchInMut.mutate()} disabled={punchInMut.isPending} style={{ gap: 10 }}>
                      <Play size={18} /> Punch In
                    </button>
                  ) : !punchStatus?.punchOut ? (
                    <button className="btn btn-danger btn-lg" onClick={() => punchOutMut.mutate()} disabled={punchOutMut.isPending} style={{ gap: 10 }}>
                      <Square size={18} /> Punch Out
                    </button>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-success)', fontWeight: 600 }}>
                      <CheckCircle2 size={20} /> Day Complete
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>Today Performance</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                {[
                  { label: 'QC Checks Completed', value: (stats as any)?.qcChecksCompleted || 0, icon: CheckCircle2, color: 'var(--color-success)' },
                  { label: 'Total Working Hours', value: formatMinutes((stats as any)?.totalTimeMinutes || 0), icon: Clock, color: 'var(--color-info)' },
                  { label: 'Total Active Time', value: formatMinutes((stats as any)?.totalTimeMinutes || 0), icon: Activity, color: 'var(--color-warning)' },
                  { label: 'AHT', value: formatMinutes((stats as any)?.avgTaskTimeMinutes || 0), icon: BarChart3, color: 'var(--color-teal)' },
                ].map((c) => (
                  <div key={c.label} style={{ border: '1px solid var(--color-border)', borderTop: `3px solid ${c.color}`, borderRadius: 10, padding: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <c.icon size={15} style={{ color: c.color }} />
                      <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{c.label}</span>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{c.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Leave Notifications</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>Pending Approvals</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{(leavePanel as any)?.pendingApprovals || 0}</div>
            </div>
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>Team On Leave Today</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{(leavePanel as any)?.teamOnLeaveToday || 0}</div>
            </div>
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>Recent Requests</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{((leavePanel as any)?.recentRequests || []).length}</div>
            </div>
          </div>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {((leavePanel as any)?.recentRequests || []).slice(0, 4).map((leave: any) => (
              <div key={leave._id} style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                <strong style={{ color: 'var(--color-text)' }}>{leave.userId?.fullName || 'Member'}</strong> • {statusLabel(leave.status)}
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 14, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20 }}>Performance Analytics</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
                {isPL ? 'Complete team hierarchy performance data' : 'Tasker quality and submission metrics'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <select className="input-base" value={reportType} onChange={(e) => setReportType(e.target.value as any)} style={{ width: 160, fontWeight: 600 }}>
                <option value="TODAY">Today</option>
                <option value="YESTERDAY">Yesterday</option>
                <option value="WEEK">Last 7 Days</option>
                <option value="MTD">Month to Date</option>
                <option value="MONTH">Current Month</option>
                <option value="CUSTOM">Custom Range</option>
              </select>

              {reportType === 'CUSTOM' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="date" className="input-base" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={{ width: 140 }} />
                  <input type="date" className="input-base" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={{ width: 140 }} />
                </div>
              )}
            </div>
          </div>
        </div>

        {monthlyLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-teal)' }} /></div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
              {(isPL
                ? [
                    { label: 'Total Tasks', value: cards.totalTasks || 0 },
                    { label: 'Completed', value: cards.completedTasks || 0 },
                    { label: 'Pending', value: cards.pendingTasks || 0 },
                    { label: 'Submission %', value: `${cards.submissionPercentage || 0}%` },
                    { label: 'Active Taskers', value: cards.activeTaskers || 0 },
                    { label: 'Total QRs', value: cards.totalQRs || 0 },
                  ]
                : [
                    { label: 'Assigned Tasks', value: cards.totalAssignedTasks || 0 },
                    { label: 'Completed', value: cards.completedSubmissions || 0 },
                    { label: 'Pending Reviews', value: cards.pendingReviews || 0 },
                    { label: 'Completion %', value: `${cards.completionRate || 0}%` },
                    { label: 'Active Taskers', value: cards.activeTaskers || 0 },
                    { label: 'Inactive Taskers', value: cards.inactiveTaskers || 0 },
                  ]).map((c) => (
                <div key={c.label} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>{c.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{c.value}</div>
                </div>
              ))}
            </div>

            <MonthlyTrend points={trend} mode={isPL ? 'PL' : 'QR'} />

            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={16} />
                {isPL ? 'QR Monthly Hierarchy Report' : 'Tasker Monthly Report'}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-subtle)' }}>
                      {(isPL
                        ? ['QR', 'Taskers', 'Total', 'Completed', 'Pending', 'Submission %', 'Active Taskers']
                        : ['Tasker', 'Assigned', 'Completed', 'Pending Reviews', 'Completion %', 'Status']
                      ).map((h) => <th key={h} style={{ textAlign: 'left', padding: '12px 14px' }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r: any) => (
                      <tr key={String(r.qrId || r.taskerId)} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        {isPL ? (
                          <>
                            <td style={{ padding: '12px 14px', fontWeight: 600 }}>{r.qrName}</td>
                            <td style={{ padding: '12px 14px' }}>{r.totalTaskers}</td>
                            <td style={{ padding: '12px 14px' }}>{r.totalTasks}</td>
                            <td style={{ padding: '12px 14px' }}>{r.completedTasks}</td>
                            <td style={{ padding: '12px 14px' }}>{r.pendingTasks}</td>
                            <td style={{ padding: '12px 14px' }}>{r.submissionPercentage}%</td>
                            <td style={{ padding: '12px 14px' }}>{r.activeTaskers}</td>
                          </>
                        ) : (
                          <>
                            <td style={{ padding: '12px 14px', fontWeight: 600 }}>{r.taskerName}</td>
                            <td style={{ padding: '12px 14px' }}>{r.totalAssignedTasks}</td>
                            <td style={{ padding: '12px 14px' }}>{r.completedSubmissions}</td>
                            <td style={{ padding: '12px 14px' }}>{r.pendingReviews}</td>
                            <td style={{ padding: '12px 14px' }}>{r.completionRate}%</td>
                            <td style={{ padding: '12px 14px' }}>{r.isActive ? 'Active' : 'Inactive'}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 700 }}>Attendance Report</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <select className="input-base" value={rangeType} onChange={(e) => setRangeType(e.target.value as any)} style={{ width: 120 }}>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                  {rangeType === 'CUSTOM' && (
                    <>
                      <input type="date" className="input-base" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={{ width: 150 }} />
                      <input type="date" className="input-base" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={{ width: 150 }} />
                    </>
                  )}
                </div>
              </div>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                <div><div style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>Present Days</div><div style={{ fontWeight: 700 }}>{reportSummary.presentDays || 0}</div></div>
                <div><div style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>Partial Days</div><div style={{ fontWeight: 700 }}>{reportSummary.partialDays || 0}</div></div>
                <div><div style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>Working Hours</div><div style={{ fontWeight: 700 }}>{formatMinutes(reportSummary.totalWorkingMinutes || 0)}</div></div>
                <div><div style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>Completed Tasks/QC</div><div style={{ fontWeight: 700 }}>{reportSummary.totalCompletedTasks || 0}</div></div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-subtle)' }}>
                      {['Tasker', 'Date', 'Punch In', 'Punch Out', 'Working Hours', 'Attendance', 'Completed Tasks/QC', 'Productivity/hr'].map((h) => (
                        <th key={h} style={{ textAlign: 'left', padding: '12px 14px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceLoading ? (
                      <tr><td colSpan={8} style={{ padding: '20px 14px' }}>Loading...</td></tr>
                    ) : reportRecords.length === 0 ? (
                      <tr><td colSpan={8} style={{ padding: '20px 14px' }}>No attendance data for selected range.</td></tr>
                    ) : reportRecords.map((r: any, idx: number) => (
                      <tr key={`${r._id || idx}`} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 600 }}>{r.userId?.fullName || '-'}</td>
                        <td style={{ padding: '12px 14px' }}>{new Date(r.date).toLocaleDateString()}</td>
                        <td style={{ padding: '12px 14px' }}>{r.punchIn ? formatTime(r.punchIn) : '—'}</td>
                        <td style={{ padding: '12px 14px' }}>{r.punchOut ? formatTime(r.punchOut) : '—'}</td>
                        <td style={{ padding: '12px 14px' }}>{r.totalMinutes ? formatMinutes(r.totalMinutes) : '—'}</td>
                        <td style={{ padding: '12px 14px' }}>{r.attendanceStatus}</td>
                        <td style={{ padding: '12px 14px' }}>{r.completedTasks || 0}</td>
                        <td style={{ padding: '12px 14px' }}>{r.productivityPerHour || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>
      {/* Punch card */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-subtle)', letterSpacing: 2, marginBottom: 6 }}>READY TO START</div>
            {punchedIn && punchStatus?.punchIn ? <Stopwatch punchIn={punchStatus.punchIn} /> : <span style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>00:00:00</span>}
            <div style={{ marginTop: 8, display: 'flex', gap: 24 }}>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                <span style={{ color: 'var(--color-text-subtle)', fontWeight: 600 }}>PUNCH IN</span><br />
                <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{punchStatus?.punchIn ? formatTime(punchStatus.punchIn) : '—'}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                <span style={{ color: 'var(--color-text-subtle)', fontWeight: 600 }}>PUNCH OUT</span><br />
                <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{punchStatus?.punchOut ? formatTime(punchStatus.punchOut) : '—'}</span>
              </div>
            </div>
          </div>
          <div>
            {!punchedIn ? (
              <button className="btn btn-success btn-lg" onClick={() => punchInMut.mutate()} disabled={punchInMut.isPending} style={{ gap: 10 }}>
                <Play size={18} /> Punch In
              </button>
            ) : !punchStatus?.punchOut ? (
              <button className="btn btn-danger btn-lg" onClick={() => punchOutMut.mutate()} disabled={punchOutMut.isPending} style={{ gap: 10 }}>
                <Square size={18} /> Punch Out
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-success)', fontWeight: 600 }}>
                <CheckCircle2 size={20} /> Day Complete
              </div>
            )}
          </div>
        </div>
        {/* Team info */}
        {teamInfo && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--color-border)', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {(teamInfo as { projectLead?: { fullName: string }; qualityReviewer?: { fullName: string } }).projectLead && (
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                PROJECT LEAD: <strong style={{ color: 'var(--color-text)' }}>{(teamInfo as { projectLead?: { fullName: string } }).projectLead?.fullName}</strong>
              </span>
            )}
            {(teamInfo as { qualityReviewer?: { fullName: string } }).qualityReviewer && (
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                QUALITY REVIEWER: <strong style={{ color: 'var(--color-text)' }}>{(teamInfo as { qualityReviewer?: { fullName: string } }).qualityReviewer?.fullName}</strong>
              </span>
            )}
          </div>
        )}
      </motion.div>

      {/* Punch-in warning */}
      {!punchedIn && !punchStatus?.punchOut && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: 'var(--color-warning-muted)', border: '1px solid var(--color-warning)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, color: 'var(--color-warning)' }}>
          <AlertTriangle size={18} />
          <span style={{ fontSize: 14 }}>⚠ You haven't punched in yet. You must punch in before starting tasks.</span>
        </motion.div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        {[
          { label: 'Tasks Completed', value: stats?.tasksCompleted || 0, color: 'var(--color-success)', icon: CheckCircle2 },
          { label: 'Total Time', value: formatMinutes(stats?.totalTimeMinutes || 0), color: 'var(--color-info)', icon: Clock },
          { label: 'Avg Task Time · AHT', value: formatMinutes(stats?.avgTaskTimeMinutes || 0), color: 'var(--color-teal)', icon: BarChart3 },
        ].map((stat) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderTop: `3px solid ${stat.color}`, borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <stat.icon size={16} style={{ color: stat.color }} />
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 500 }}>{stat.label}</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text)' }}>{stat.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Today's task */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <ClipboardList size={18} style={{ color: 'var(--color-teal)' }} />
          <span style={{ fontWeight: 700, fontSize: 16 }}>Today's Task</span>
        </div>

        {todaySessions.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <ClipboardList size={40} style={{ color: 'var(--color-text-subtle)', marginBottom: 12 }} />
            <p style={{ color: 'var(--color-text-muted)', fontSize: 15 }}>No tasks assigned for today</p>
            {(teamInfo as { projectLead?: { fullName: string } })?.projectLead && (
              <p style={{ color: 'var(--color-text-subtle)', fontSize: 13, marginTop: 6 }}>
                Your Project Lead <strong>{(teamInfo as { projectLead?: { fullName: string } }).projectLead?.fullName}</strong> will assign tasks when ready.
              </p>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px' }}>
            {todaySessions.map((session: any) => {
              const totalEntry = myEntries.find((e: any) => e.todoSessionId === session._id) as any;
              if (!totalEntry) return null;

              return (
                <div key={session._id} style={{ border: '1px solid var(--color-border)', borderRadius: 12, padding: 20, background: 'var(--color-bg)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 18 }}>{session.title}</span>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'var(--color-teal-muted)', color: 'var(--color-teal)' }}>
                          {session.taskType}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                        Assigned by: <strong style={{ color: 'var(--color-text)' }}>{session.createdById?.fullName}</strong>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: 'var(--color-text-subtle)', marginBottom: 4 }}>QC STATUS</div>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: 16,
                        fontSize: 11,
                        fontWeight: 700,
                        background: totalEntry.reviewStatus === 'APPROVED' ? 'rgba(34,197,94,0.12)' : totalEntry.reviewStatus === 'REJECTED' ? 'rgba(239,68,68,0.12)' : 'rgba(156,163,175,0.12)',
                        color: totalEntry.reviewStatus === 'APPROVED' ? '#22c55e' : totalEntry.reviewStatus === 'REJECTED' ? '#ef4444' : '#9ca3af',
                        border: `1px solid ${totalEntry.reviewStatus === 'APPROVED' ? 'rgba(34,197,94,0.3)' : totalEntry.reviewStatus === 'REJECTED' ? 'rgba(239,68,68,0.3)' : 'rgba(156,163,175,0.3)'}`,
                      }}>
                        {totalEntry.reviewStatus || 'PENDING'}
                      </span>
                    </div>
                  </div>

            {/* Progress */}
            {totalEntry && (
              <div style={{ marginBottom: 20 }}>
                {(() => {
                  const target = getEntryTarget(totalEntry);
                  const done = getEntryDone(totalEntry);
                  const pct = Math.round((done / target) * 100);
                  return (
                    <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Target: {target} tasks</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: totalEntry.status === 'DONE' ? 'var(--color-success)' : 'var(--color-teal)' }}>
                    {done} / {target} ({pct}%)
                  </span>
                </div>
                <div className="progress-bar" style={{ height: 12, background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 6, overflow: 'hidden' }}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    style={{ 
                      height: '100%', 
                      background: totalEntry.status === 'DONE' 
                        ? 'linear-gradient(90deg, #16a34a, #22c55e)' 
                        : 'linear-gradient(90deg, #0d9488, #14b8a6)',
                      boxShadow: totalEntry.status === 'DONE' ? '0 0 10px rgba(34, 197, 94, 0.4)' : '0 0 10px rgba(20, 184, 166, 0.4)'
                    }} 
                  />
                </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Action buttons or Completion State */}
            {totalEntry && (
              totalEntry.status === 'DONE' ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  style={{ background: 'var(--color-success-muted)', border: '1px solid var(--color-success)', borderRadius: 12, padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <CheckCircle2 size={32} style={{ color: 'var(--color-success)' }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-success)' }}>Task Completed!</div>
                      <div style={{ fontSize: 13, color: 'var(--color-text)', opacity: 0.8 }}>This task has been submitted to your Project Lead.</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', background: 'var(--color-card)', padding: '10px 16px', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-subtle)', marginBottom: 4, letterSpacing: 1 }}>FINAL DURATION</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>
                      {formatMinutes(Math.floor((totalEntry.totalDurationSeconds || 0) / 60))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  {/* Timer Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-card)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                    <TaskTimer isTiming={!!totalEntry.isTiming} currentTimerStart={totalEntry.currentTimerStart} totalDurationSeconds={totalEntry.totalDurationSeconds || 0} />
                    <div style={{ width: 1, height: 20, background: 'var(--color-border)', margin: '0 4px' }} />
                    {!totalEntry.isTiming ? (
                      <button className="btn btn-ghost btn-sm" onClick={() => updateTimerMut.mutate({ entryId: totalEntry._id, action: 'START' })} title="Start Timer" disabled={!punchedIn} style={{ color: 'var(--color-success)', padding: '4px 8px' }}>
                        <Play size={18} fill="currentColor" />
                      </button>
                    ) : (
                      <button className="btn btn-ghost btn-sm" onClick={() => updateTimerMut.mutate({ entryId: totalEntry._id, action: 'PAUSE' })} title="Pause Timer" style={{ color: 'var(--color-warning)', padding: '4px 8px' }}>
                        <Pause size={18} fill="currentColor" />
                      </button>
                    )}
                    <button className="btn btn-ghost btn-sm" disabled={!totalEntry.isTiming && !totalEntry.totalDurationSeconds} onClick={() => updateTimerMut.mutate({ entryId: totalEntry._id, action: 'STOP' })} title="Stop Timer" style={{ color: 'var(--color-danger)', padding: '4px 8px' }}>
                      <Square size={18} fill="currentColor" />
                    </button>
                  </div>
                  {(session.customButtons || []).map((btn: any, idx: number) => {
                    if (btn.isCountInput || btn.buttonType === 'COUNT_INPUT') {
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="number"
                            min={0}
                            max={totalEntry?.countTarget}
                            placeholder="Count"
                            value={countInputs[totalEntry._id] ?? ''}
                            onChange={(e) => setCountInputs((prev) => ({ ...prev, [totalEntry._id]: +e.target.value }))}
                            className="input-base"
                            style={{ width: 90, textAlign: 'center' }}
                            disabled={!punchedIn}
                          />
                          <button
                            className="btn"
                            style={{ background: btn.color || 'var(--color-info)', color: 'white', opacity: !punchedIn ? 0.5 : 1 }}
                            disabled={!punchedIn || updateProgressMut.isPending}
                            onClick={() => {
                              if (!punchedIn) { toast.error('Punch in first!'); return; }
                              updateProgressMut.mutate({ entryId: totalEntry._id, action: 'COUNT_INPUT', countDone: countInputs[totalEntry._id] || 0 });
                            }}
                            title={!punchedIn ? 'Punch in before submitting' : undefined}
                          >
                            {btn.label}
                          </button>
                        </div>
                      );
                    }
                    return (
                      <button
                        key={idx}
                        className="btn"
                        style={{ background: btn.color || 'var(--color-teal)', color: '#0d1117', opacity: !punchedIn ? 0.5 : 1, fontWeight: 600, boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }}
                        disabled={!punchedIn || updateProgressMut.isPending}
                        onClick={() => {
                          if (!punchedIn) { toast.error('Punch in first!'); return; }
                          updateProgressMut.mutate({ entryId: totalEntry._id, action: btn.buttonType });
                        }}
                        title={!punchedIn ? 'Punch in before submitting' : undefined}
                      >
                        {btn.label}
                      </button>
                    );
                  })}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
