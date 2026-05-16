import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, BarChart3, Users, FolderOpen } from 'lucide-react';
import { useTaskEntries } from '../hooks/useTaskEntries';
import { useAttendanceStore } from '../store/attendanceStore';
import { useUpdateProgress } from '../hooks/useTaskEntries';
import { useTeamProgress } from '../hooks/useDashboard';
import { useTodoSessions } from '../hooks/useTodoSessions';
import { useAuthStore } from '../store/authStore';
import { statusColor, statusLabel, formatDate, todayISO, formatMinutes } from '../lib/utils';
import toast from 'react-hot-toast';

type FilterTab = 'ALL' | 'TODO' | 'IN_PROGRESS' | 'DONE' | 'PARTIAL';
const TABS: FilterTab[] = ['ALL', 'TODO', 'IN_PROGRESS', 'DONE', 'PARTIAL'];

type TaskButton = { label: string; buttonType: string; color?: string; isCountInput?: boolean };
type TaskEntry = {
  _id: string;
  status: string;
  reviewStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  countDone?: number;
  countTarget?: number;
  totalDurationSeconds?: number;
  todoSessionId?: { _id: string; title: string; date: string; taskType: string; customButtons?: TaskButton[] };
};

type TeamAssignee = { _id: string; fullName: string; qualityReviewerId?: { fullName?: string } | null };
type TeamEntry = {
  _id: string;
  assigneeId: TeamAssignee;
  status: string;
  countDone?: number;
  countTarget?: number;
  totalDurationSeconds?: number;
};
type TeamSession = {
  _id: string;
  title: string;
  date: string;
  taskType: string;
  projectId: { _id?: string; name?: string } | string;
};
type SessionProgress = {
  session: TeamSession;
  entries: TeamEntry[];
  overall: { total: number; done: number; percent: number };
};

type MemberReport = {
  memberId: string;
  fullName: string;
  reviewerName: string;
  totalDone: number;
  totalTarget: number;
  totalDurationSeconds: number;
  statusCounts: Record<'TODO' | 'IN_PROGRESS' | 'PARTIAL' | 'DONE', number>;
};

type SessionLite = { _id: string; date: string };

const entryTargetUnits = (entry: TeamEntry): number => {
  if (entry.countTarget && entry.countTarget > 0) return entry.countTarget;
  return 1;
};

const entryDoneUnits = (entry: TeamEntry): number => {
  if (entry.countTarget && entry.countTarget > 0) {
    return Math.min(entry.countDone || 0, entry.countTarget);
  }
  return entry.status === 'DONE' ? 1 : 0;
};

function MemberLineChart({ members }: { members: MemberReport[] }) {
  if (members.length === 0) return null;

  const width = 700;
  const height = 240;
  const pad = 28;
  const chartW = width - pad * 2;
  const chartH = height - pad * 2;

  const doneValues = members.map((m) => m.totalDone);
  const durationValues = members.map((m) => Math.round(m.totalDurationSeconds / 60));
  const maxDone = Math.max(1, ...doneValues);
  const maxDuration = Math.max(1, ...durationValues);

  const getX = (idx: number) => {
    if (members.length === 1) return pad + chartW / 2;
    return pad + (idx / (members.length - 1)) * chartW;
  };
  const getDoneY = (value: number) => pad + chartH - (value / maxDone) * chartH;
  const getDurationY = (value: number) => pad + chartH - (value / maxDuration) * chartH;

  const donePath = members
    .map((m, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getDoneY(m.totalDone)}`)
    .join(' ');
  const durationPath = members
    .map((m, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getDurationY(Math.round(m.totalDurationSeconds / 60))}`)
    .join(' ');

  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><BarChart3 size={16} /> Member-wise Line Chart</div>
        <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--color-text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 16, height: 2, background: '#14b8a6', display: 'inline-block' }} /> Tasks Done</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 16, height: 2, background: '#3b82f6', display: 'inline-block' }} /> Duration (min)</span>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', minWidth: 650, height: 240 }}>
          <rect x={pad} y={pad} width={chartW} height={chartH} fill="transparent" stroke="var(--color-border)" />
          {[0.25, 0.5, 0.75].map((r) => (
            <line key={r} x1={pad} y1={pad + chartH * r} x2={pad + chartW} y2={pad + chartH * r} stroke="var(--color-border)" strokeDasharray="4 4" />
          ))}
          <path d={donePath} fill="none" stroke="#14b8a6" strokeWidth="3" />
          <path d={durationPath} fill="none" stroke="#3b82f6" strokeWidth="3" />
          {members.map((m, idx) => {
            const x = getX(idx);
            const doneY = getDoneY(m.totalDone);
            const durationY = getDurationY(Math.round(m.totalDurationSeconds / 60));
            return (
              <g key={m.memberId}>
                <circle cx={x} cy={doneY} r="4" fill="#14b8a6" />
                <circle cx={x} cy={durationY} r="4" fill="#3b82f6" />
                <text x={x} y={height - 8} textAnchor="middle" fill="var(--color-text-subtle)" fontSize="11">
                  {m.fullName.length > 12 ? `${m.fullName.slice(0, 12)}...` : m.fullName}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function TaskerTasksView() {
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [search, setSearch] = useState('');
  const { isPunchedIn } = useAttendanceStore();
  const updateMut = useUpdateProgress();
  const { data: entries = [], isLoading } = useTaskEntries();
  const [countInputs, setCountInputs] = useState<Record<string, number>>({});

  const filtered = (entries as TaskEntry[]).filter((e) => {
    if (!e.todoSessionId?._id) return false;
    if (activeTab !== 'ALL' && e.status !== activeTab) return false;
    if (search) {
      const title = e.todoSessionId?.title || '';
      if (!title.toLowerCase().includes(search.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {TABS.map((t) => (
            <button key={t} onClick={() => setActiveTab(t)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid', borderColor: activeTab === t ? 'var(--color-teal)' : 'var(--color-border)', background: activeTab === t ? 'var(--color-teal-muted)' : 'transparent', color: activeTab === t ? 'var(--color-teal)' : 'var(--color-text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
              {statusLabel(t)}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', marginLeft: 'auto' }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)' }} />
          <input className="input-base" placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 34, width: 200 }} />
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>Loading tasks...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--color-text-muted)' }}>
          <Filter size={40} style={{ marginBottom: 16, opacity: 0.4 }} />
          <p>No tasks found</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((entry) => {
            const session = entry.todoSessionId;
            const pct = entry.countTarget ? Math.round(((entry.countDone || 0) / entry.countTarget) * 100) : 0;
            return (
              <motion.div key={entry._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: `3px solid ${statusColor(entry.status)}`, borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{session?.title || 'Task'}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {session?.date && formatDate(session.date)}
                      {session?.taskType && <span style={{ marginLeft: 10, padding: '2px 8px', borderRadius: 20, background: 'var(--color-card)', fontSize: 11, fontWeight: 600 }}>{session.taskType}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 700,
                      background: entry.reviewStatus === 'APPROVED' ? 'rgba(34,197,94,0.12)' : entry.reviewStatus === 'REJECTED' ? 'rgba(239,68,68,0.12)' : 'rgba(156,163,175,0.12)',
                      color: entry.reviewStatus === 'APPROVED' ? '#22c55e' : entry.reviewStatus === 'REJECTED' ? '#ef4444' : '#9ca3af',
                      border: `1px solid ${entry.reviewStatus === 'APPROVED' ? 'rgba(34,197,94,0.3)' : entry.reviewStatus === 'REJECTED' ? 'rgba(239,68,68,0.3)' : 'rgba(156,163,175,0.3)'}`,
                    }}>
                      QC: {entry.reviewStatus || 'PENDING'}
                    </span>
                    <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: `${statusColor(entry.status)}22`, color: statusColor(entry.status) }}>{statusLabel(entry.status)}</span>
                  </div>
                </div>

                {entry.countTarget && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Progress</span>
                      <span style={{ fontWeight: 600, color: 'var(--color-teal)' }}>{entry.countDone || 0} / {entry.countTarget} ({pct}%)</span>
                    </div>
                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
                  </div>
                )}

                {entry.status !== 'DONE' && session?.customButtons && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {session.customButtons.map((btn, idx) => {
                      if (btn.isCountInput || btn.buttonType === 'COUNT_INPUT') {
                        return (
                          <div key={idx} style={{ display: 'flex', gap: 8 }}>
                            <input type="number" min={0} max={entry.countTarget} value={countInputs[entry._id] ?? ''} onChange={(e) => setCountInputs((p) => ({ ...p, [entry._id]: +e.target.value }))} className="input-base" style={{ width: 80 }} disabled={!isPunchedIn} />
                            <button className="btn btn-sm" style={{ background: btn.color || 'var(--color-info)', color: '#fff' }} disabled={!isPunchedIn || updateMut.isPending}
                              onClick={() => { if (!isPunchedIn) { toast.error('Punch in first!'); return; } updateMut.mutate({ entryId: entry._id, action: 'COUNT_INPUT', countDone: countInputs[entry._id] || 0 }); }}>
                              {btn.label}
                            </button>
                          </div>
                        );
                      }
                      return (
                        <button key={idx} className="btn btn-sm" style={{ background: btn.color || 'var(--color-teal)', color: '#0d1117' }} disabled={!isPunchedIn || updateMut.isPending}
                          onClick={() => { if (!isPunchedIn) { toast.error('Punch in first!'); return; } updateMut.mutate({ entryId: entry._id, action: btn.buttonType }); }}
                          title={!isPunchedIn ? 'Punch in to start' : undefined}>
                          {btn.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LeadReviewerTasksView() {
  const [date, setDate] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<'ALL' | string>('ALL');
  const { data: allSessions = [] } = useTodoSessions();
  const { data, isLoading } = useTeamProgress({ date });
  const sessionProgressList = (data?.sessionProgress || []) as SessionProgress[];

  const latestDate = useMemo(() => {
    const sessions = allSessions as SessionLite[];
    if (sessions.length === 0) return todayISO();
    const sorted = [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return new Date(sorted[0].date).toISOString().split('T')[0];
  }, [allSessions]);

  useEffect(() => {
    if (!date && latestDate) setDate(latestDate);
  }, [date, latestDate]);

  const dailySessions = useMemo(() => {
    const seen = new Set<string>();
    const unique: SessionProgress[] = [];
    for (const sp of sessionProgressList) {
      if (seen.has(sp.session._id)) continue;
      seen.add(sp.session._id);
      unique.push(sp);
    }
    return unique;
  }, [sessionProgressList]);

  const selectedSessions = useMemo(() => {
    if (selectedTaskId === 'ALL') return dailySessions;
    return dailySessions.filter((sp) => sp.session._id === selectedTaskId);
  }, [dailySessions, selectedTaskId]);

  useEffect(() => {
    if (selectedTaskId === 'ALL') return;
    const exists = dailySessions.some((sp) => sp.session._id === selectedTaskId);
    if (!exists) setSelectedTaskId('ALL');
  }, [dailySessions, selectedTaskId]);

  const selectedTaskTitle = useMemo(() => {
    if (selectedTaskId === 'ALL') return 'All Daily Tasks';
    const found = dailySessions.find((sp) => sp.session._id === selectedTaskId);
    return found?.session.title || 'Selected Task';
  }, [dailySessions, selectedTaskId]);

  const memberReports = useMemo<MemberReport[]>(() => {
    const map = new Map<string, MemberReport>();
    for (const sp of selectedSessions) {
      for (const entry of sp.entries) {
        const assignee = entry.assigneeId;
        const existing = map.get(assignee._id);
        const status = (entry.status === 'TODO' || entry.status === 'IN_PROGRESS' || entry.status === 'PARTIAL' || entry.status === 'DONE') ? entry.status : 'TODO';
        if (!existing) {
          map.set(assignee._id, {
            memberId: assignee._id,
            fullName: assignee.fullName,
            reviewerName: assignee.qualityReviewerId?.fullName || 'Unassigned',
            totalDone: entryDoneUnits(entry),
            totalTarget: entryTargetUnits(entry),
            totalDurationSeconds: entry.totalDurationSeconds || 0,
            statusCounts: {
              TODO: status === 'TODO' ? 1 : 0,
              IN_PROGRESS: status === 'IN_PROGRESS' ? 1 : 0,
              PARTIAL: status === 'PARTIAL' ? 1 : 0,
              DONE: status === 'DONE' ? 1 : 0,
            },
          });
          continue;
        }
        existing.totalDone += entryDoneUnits(entry);
        existing.totalTarget += entryTargetUnits(entry);
        existing.totalDurationSeconds += entry.totalDurationSeconds || 0;
        existing.statusCounts[status] += 1;
      }
    }
    const rows = Array.from(map.values());
    const filteredRows = memberSearch
      ? rows.filter((m) => m.fullName.toLowerCase().includes(memberSearch.toLowerCase()))
      : rows;
    return filteredRows.sort((a, b) => {
      const aPct = a.totalTarget > 0 ? a.totalDone / a.totalTarget : 0;
      const bPct = b.totalTarget > 0 ? b.totalDone / b.totalTarget : 0;
      return bPct - aPct;
    });
  }, [selectedSessions, memberSearch]);

  const statusTotals = useMemo(() => {
    return selectedSessions.flatMap((sp) => sp.entries).reduce(
      (acc, item) => {
        if (item.status === 'TODO') acc.TODO += 1;
        else if (item.status === 'IN_PROGRESS') acc.IN_PROGRESS += 1;
        else if (item.status === 'PARTIAL') acc.PARTIAL += 1;
        else if (item.status === 'DONE') acc.DONE += 1;
        return acc;
      },
      { TODO: 0, IN_PROGRESS: 0, PARTIAL: 0, DONE: 0 }
    );
  }, [selectedSessions]);

  const totalStatusCount = statusTotals.TODO + statusTotals.IN_PROGRESS + statusTotals.PARTIAL + statusTotals.DONE;
  const totalMembers = memberReports.length;
  const totalDone = memberReports.reduce((acc, member) => acc + member.totalDone, 0);
  const totalTarget = memberReports.reduce((acc, member) => acc + member.totalTarget, 0);
  const overallPct = totalTarget > 0 ? Math.round((totalDone / totalTarget) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <input type="date" value={date || latestDate} onChange={(e) => setDate(e.target.value)} className="input-base" style={{ width: 170 }} />
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Showing daily tasks only (not project management data).</div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>Loading daily task reports...</div>
      ) : dailySessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--color-text-muted)' }}>
          <FolderOpen size={40} style={{ marginBottom: 16, opacity: 0.4 }} />
          <p>No daily tasks found for selected date.</p>
        </div>
      ) : (
        <>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
              <div style={{ fontWeight: 700 }}>Daily Tasks Summary</div>
              <span style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>{overallPct}%</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>
              {selectedTaskId === 'ALL' ? `${dailySessions.length} tasks` : `Task: ${selectedTaskTitle}`} • {totalMembers} members
            </div>
            <div className="progress-bar" style={{ height: 6 }}><div className="progress-fill" style={{ width: `${overallPct}%` }} /></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><Users size={16} /> Assigned Member Report</div>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)' }} />
                  <input className="input-base" value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Search member..." style={{ width: 190, paddingLeft: 30 }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {memberReports.map((member) => {
                  const pct = member.totalTarget > 0 ? Math.round((member.totalDone / member.totalTarget) * 100) : 0;
                  return (
                    <div key={member.memberId} style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{member.fullName}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>QR: {member.reviewerName}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, color: 'var(--color-teal)' }}>{member.totalDone}/{member.totalTarget || 0}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{formatMinutes(Math.floor(member.totalDurationSeconds / 60))}</div>
                        </div>
                      </div>
                      <div style={{ height: 8, borderRadius: 6, background: 'var(--color-bg)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: 'linear-gradient(90deg, #0d9488, #14b8a6)' }} />
                      </div>
                      <div style={{ marginTop: 6, fontSize: 12, color: 'var(--color-text-muted)' }}>{pct}% completion</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 16 }}>
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}><BarChart3 size={16} /> Status Graph</div>
                {(['DONE', 'IN_PROGRESS', 'PARTIAL', 'TODO'] as const).map((status) => {
                  const count = statusTotals[status];
                  const pct = totalStatusCount > 0 ? Math.round((count / totalStatusCount) * 100) : 0;
                  return (
                    <div key={status} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span>{statusLabel(status)}</span>
                        <span style={{ color: 'var(--color-text-muted)' }}>{count} ({pct}%)</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 6, background: 'var(--color-bg)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: statusColor(status) }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 12 }}>Daily Tasks</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setSelectedTaskId('ALL')}
                    style={{
                      border: `1px solid ${selectedTaskId === 'ALL' ? 'var(--color-teal)' : 'var(--color-border)'}`,
                      borderRadius: 8,
                      padding: 10,
                      background: selectedTaskId === 'ALL' ? 'var(--color-teal-muted)' : 'var(--color-bg)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      color: 'inherit',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ fontWeight: 600 }}>All Daily Tasks</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{dailySessions.length} tasks</div>
                    </div>
                  </button>
                  {dailySessions.map((item) => (
                    <button
                      key={item.session._id}
                      type="button"
                      onClick={() => setSelectedTaskId(item.session._id)}
                      style={{
                        border: `1px solid ${selectedTaskId === item.session._id ? 'var(--color-teal)' : 'var(--color-border)'}`,
                        borderRadius: 8,
                        padding: 10,
                        background: selectedTaskId === item.session._id ? 'var(--color-teal-muted)' : 'var(--color-bg)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: 'inherit',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{item.session.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>
                            {formatDate(item.session.date)} • {item.session.taskType}
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                          {item.entries.length} assigned
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <MemberLineChart members={memberReports} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function MyTasksPage() {
  const { user } = useAuthStore();
  if (user?.role === 'TASKER') return <TaskerTasksView />;
  return <LeadReviewerTasksView />;
}
