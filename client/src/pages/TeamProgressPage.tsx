import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Search, Filter, CheckCircle2, Clock, BarChart3, Users, ChevronDown, ChevronLeft, ChevronRight, Check, X, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { useTeamProgress } from '../hooks/useDashboard';
import { useProjects } from '../hooks/useProjects';
import { useReviewTask } from '../hooks/useTaskEntries';
import { useDeleteTodoSession } from '../hooks/useTodoSessions';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { formatMinutes, getInitials, statusColor, statusLabel, todayISO } from '../lib/utils';

interface Assignee { _id: string; fullName: string; jobTitle?: string; qualityLevel?: string; qualityReviewerId?: { fullName: string } }
interface Entry { _id: string; assigneeId: Assignee; countDone?: number; countTarget?: number; status: string; totalDurationSeconds?: number; updatedAt?: string; reviewStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' }
interface Session { _id: string; title: string; date: string; taskType: string; totalAssigned: number; projectId: { name: string; dailyTarget?: number } }
interface SessionProgress { session: Session; entries: Entry[]; overall: { total: number; done: number; percent: number } }
interface TeamMember { _id: string; fullName: string; role?: string; qualityReviewerId?: { fullName: string } }

export default function TeamProgressPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [date, setDate] = useState(todayISO());
  const [projectId, setProjectId] = useState('');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubmission, setFilterSubmission] = useState<'ALL' | 'SUBMITTED' | 'NOT_SUBMITTED'>('ALL');
  const [filterQR, setFilterQR] = useState('ALL');
  const [filterSession, setFilterSession] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [reviewingEntry, setReviewingEntry] = useState<any | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const reviewMut = useReviewTask();
  const deleteSessionMut = useDeleteTodoSession();

  const { data, isLoading, refetch, dataUpdatedAt } = useTeamProgress({ date, projectId: projectId || undefined });
  const { data: projects = [] } = useProjects();

  const sessionProgressList: SessionProgress[] = data?.sessionProgress || [];
  const teamMembers: TeamMember[] = data?.teamMembers || [];

  // Flatten all entries for the table
  const allEntries = useMemo(() => {
    return sessionProgressList.flatMap((sp) => 
      sp.entries.map(entry => ({ ...entry, session: sp.session }))
    );
  }, [sessionProgressList]);

  const getAssigneeQrName = (assignee: Assignee) => {
    return assignee.qualityReviewerId?.fullName || teamMembers.find((member) => member._id === assignee._id)?.qualityReviewerId?.fullName || '';
  };

  // Dynamic Filter Options
  const uniqueTasks = useMemo(() => {
    return Array.from(new Set(sessionProgressList.map(sp => sp.session.title))).sort();
  }, [sessionProgressList]);

  const uniqueQRs = useMemo(() => {
    const qrs = new Set<string>();
    allEntries.forEach(entry => {
      const qrName = getAssigneeQrName(entry.assigneeId as Assignee);
      if (qrName) qrs.add(qrName);
    });
    teamMembers.forEach((member) => {
      if (member.role === 'QUALITY_REVIEWER') qrs.add(member.fullName);
      if (member.qualityReviewerId?.fullName) qrs.add(member.qualityReviewerId.fullName);
    });
    return Array.from(qrs).sort();
  }, [allEntries, teamMembers]);

  // Apply Filters First (so stats update dynamically)
  const filteredEntries = useMemo(() => {
    return allEntries.filter(entry => {
      const assignee = entry.assigneeId as Assignee;
      
      // Text Search
      if (searchQuery && !assignee.fullName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      
      // Task Session Filter
      if (filterSession !== 'ALL' && entry.session.title !== filterSession) return false;

      // Submission Filter
      if (filterSubmission === 'SUBMITTED' && entry.status !== 'DONE') return false;
      if (filterSubmission === 'NOT_SUBMITTED' && entry.status === 'DONE') return false;
      
      // QR Filter
      const qrName = getAssigneeQrName(assignee);
      if (filterQR !== 'ALL' && qrName !== filterQR) return false;

      return true;
    }).sort((a, b) => {
      // Sort by status (DONE first) then by name
      if (a.status === 'DONE' && b.status !== 'DONE') return -1;
      if (a.status !== 'DONE' && b.status === 'DONE') return 1;
      return (a.assigneeId as Assignee).fullName.localeCompare((b.assigneeId as Assignee).fullName);
    });
  }, [allEntries, searchQuery, filterSession, filterSubmission, filterQR]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEntries.slice(start, start + itemsPerPage);
  }, [filteredEntries, currentPage]);

  const handleReview = (status: 'APPROVED' | 'REJECTED') => {
    if (!reviewingEntry) return;
    reviewMut.mutate(
      { entryId: reviewingEntry._id, status, note: reviewNote },
      { onSuccess: () => { setReviewingEntry(null); setReviewNote(''); } }
    );
  };

  // Analytics Calculations based on FILTERED entries
  const stats = useMemo(() => {
    const doneEntries = filteredEntries.filter(e => e.status === 'DONE');
    const totalTimeSeconds = filteredEntries.reduce((acc, e) => acc + (e.totalDurationSeconds || 0), 0);
    const totalTimeMinutes = Math.floor(totalTimeSeconds / 60);
    const tasksCompleted = doneEntries.length;
    const ahtMinutes = tasksCompleted > 0 ? Math.round(totalTimeMinutes / tasksCompleted) : 0;
    
    // New stats
    const uniqueTaskers = new Set(filteredEntries.map(e => (e.assigneeId as Assignee)._id)).size;

    return {
      totalTasksCompleted: tasksCompleted,
      totalWorkingTime: formatMinutes(totalTimeMinutes),
      aht: formatMinutes(ahtMinutes),
      totalTaskers: uniqueTaskers,
      submittedCount: tasksCompleted,
      notSubmittedCount: filteredEntries.length - tasksCompleted,
    };
  }, [filteredEntries]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', background: 'var(--color-surface)', padding: '16px 20px', borderRadius: 12, border: '1px solid var(--color-border)' }}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-base" style={{ width: 160 }} />
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="input-base" style={{ width: 220 }}>
          <option value="">All Projects</option>
          {(projects as { _id: string; name: string }[]).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
        
        {user?.role === 'PROJECT_LEAD' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={() => navigate('/create-todo')}><Plus size={16} /> New Session</button>
            {filterSession !== 'ALL' && (
              <button className="btn btn-danger btn-sm" onClick={() => {
                const session = sessionProgressList.find(s => s.session.title === filterSession)?.session;
                if (session && confirm(`Are you sure you want to delete the session "${session.title}" and all its tasks?`)) {
                  deleteSessionMut.mutate(session._id, { onSuccess: () => { setFilterSession('ALL'); refetch(); } });
                }
              }}>
                <Trash2 size={14} /> Delete Session
              </button>
            )}
          </div>
        )}
        
        <div style={{ width: 1, height: 24, background: 'var(--color-border)', margin: '0 8px' }} />
        
        <select value={filterSession} onChange={(e) => setFilterSession(e.target.value)} className="input-base" style={{ width: 220, borderColor: filterSession !== 'ALL' ? 'var(--color-teal)' : '' }}>
          <option value="ALL">All Today's Tasks</option>
          {uniqueTasks.map(taskName => <option key={taskName} value={taskName}>{taskName}</option>)}
        </select>
        
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-subtle)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)', boxShadow: '0 0 8px var(--color-success)' }} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>Live Sync</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => refetch()}><RefreshCw size={14} /> Refresh</button>
          {user?.role === 'PROJECT_LEAD' && (
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/create-todo')}>+ Create TODO</button>
          )}
        </div>
      </div>

      {/* Analytics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {[
          { label: 'Total Taskers', value: stats.totalTaskers, icon: Users, color: '#f59e0b', gradient: 'linear-gradient(135deg, rgba(245,158,11,0.1), transparent)' },
          { label: 'Submitted Count', value: stats.submittedCount, icon: CheckCircle2, color: '#10b981', gradient: 'linear-gradient(135deg, rgba(16,185,129,0.1), transparent)' },
          { label: 'Not Submitted', value: stats.notSubmittedCount, icon: Clock, color: '#ef4444', gradient: 'linear-gradient(135deg, rgba(239,68,68,0.1), transparent)' },
          { label: 'Total Time', value: stats.totalWorkingTime, icon: Clock, color: '#3b82f6', gradient: 'linear-gradient(135deg, rgba(59,130,246,0.1), transparent)' },
          { label: 'AHT', value: stats.aht, icon: BarChart3, color: '#8b5cf6', gradient: 'linear-gradient(135deg, rgba(139,92,246,0.1), transparent)' },
        ].map((card, idx) => (
          <motion.div key={idx} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
            style={{ background: 'var(--color-surface)', backgroundImage: card.gradient, border: '1px solid var(--color-border)', borderRadius: 16, padding: '20px', position: 'relative', overflow: 'hidden' }}
          >
            <div style={{ position: 'absolute', top: -10, right: -10, opacity: 0.1 }}><card.icon size={80} style={{ color: card.color }} /></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ padding: 6, background: `${card.color}20`, borderRadius: 8, color: card.color }}><card.icon size={16} /></div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-subtle)', whiteSpace: 'nowrap' }}>{card.label}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>{card.value}</div>
          </motion.div>
        ))}
      </div>

      {isLoading && !dataUpdatedAt ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-teal)' }} /></div>
      ) : allEntries.length === 0 ? (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, textAlign: 'center', padding: 80, color: 'var(--color-text-muted)' }}>
          <Users size={48} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
          <p style={{ fontSize: 16, fontWeight: 500 }}>No tasks found for the selected team & date.</p>
          {user?.role === 'PROJECT_LEAD' && <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => navigate('/create-todo')}>+ Assign Tasks</button>}
        </div>
      ) : (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          
          {/* Table Toolbar */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', background: 'var(--color-card)' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input type="text" placeholder="Search taskers..." className="input-base" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ width: '100%', paddingLeft: 36 }} />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Filter size={14} style={{ color: 'var(--color-text-muted)' }} />
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>Status:</span>
                <select className="input-base" value={filterSubmission} onChange={e => setFilterSubmission(e.target.value as any)} style={{ width: 150, padding: '6px 10px' }}>
                  <option value="ALL">All Status</option>
                  <option value="SUBMITTED">Submitted (Done)</option>
                  <option value="NOT_SUBMITTED">Not Submitted</option>
                </select>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>Quality Reviewer:</span>
                <select className="input-base" value={filterQR} onChange={e => setFilterQR(e.target.value as any)} style={{ width: 140, padding: '6px 10px' }}>
                  <option value="ALL">All Reviewers</option>
                  {uniqueQRs.map(qr => <option key={qr} value={qr}>{qr}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Table Data */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-subtle)', background: 'rgba(0,0,0,0.1)' }}>
                  <th style={{ padding: '16px 20px', fontWeight: 600 }}>Tasker</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600 }}>Quality</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600 }}>Task Session</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600 }}>Progress</th>
                   <th style={{ padding: '16px 20px', fontWeight: 600 }}>Duration</th>
                   <th style={{ padding: '16px 20px', fontWeight: 600 }}>Submission</th>
                   <th style={{ padding: '16px 20px', fontWeight: 600 }}>Review</th>
                   <th style={{ padding: '16px 20px', fontWeight: 600 }}>Action</th>
                 </tr>
               </thead>
               <tbody>
                 <AnimatePresence>
                   {paginatedEntries.map((entry, idx) => {
                    const assignee = entry.assigneeId as Assignee;
                    const pct = entry.status === 'DONE' ? 100 : (entry.countTarget ? Math.round(((entry.countDone || 0) / entry.countTarget) * 100) : 0);
                    const isDone = entry.status === 'DONE';
                    
                    return (
                      <motion.tr 
                        key={entry._id} 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                        style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.2s', background: isDone ? 'rgba(16,185,129,0.02)' : 'transparent' }}
                      >
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-teal-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: 'var(--color-teal)', flexShrink: 0 }}>
                              {getInitials(assignee.fullName)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600 }}>{assignee.fullName}</div>
                              {assignee.jobTitle && <div style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>{assignee.jobTitle}</div>}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ padding: '4px 8px', borderRadius: 6, background: 'var(--color-bg)', border: '1px solid var(--color-border)', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)' }}>
                            {getAssigneeQrName(assignee) || 'Unassigned'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ fontWeight: 500 }}>{entry.session.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-subtle)', marginTop: 2 }}>
                            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: statusColor(entry.status), marginRight: 6 }}></span>
                            {statusLabel(entry.status)}
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px', minWidth: 180 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                            <span style={{ color: isDone ? 'var(--color-success)' : 'var(--color-teal)', fontWeight: 600 }}>{pct}%</span>
                            <span style={{ color: 'var(--color-text-muted)' }}>{entry.countDone || 0} / {entry.countTarget || 0}</span>
                          </div>
                          <div className="progress-bar" style={{ height: 6, background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 4, overflow: 'hidden' }}>
                            <motion.div 
                              initial={false}
                              animate={{ width: `${pct}%` }} 
                              transition={{ duration: 0.5 }}
                              style={{ 
                                height: '100%', 
                                background: isDone ? 'linear-gradient(90deg, #16a34a, #22c55e)' : 'linear-gradient(90deg, #0d9488, #14b8a6)',
                              }} 
                            />
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                          {formatMinutes(Math.floor((entry.totalDurationSeconds || 0) / 60))}
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ 
                            padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                            background: entry.reviewStatus === 'APPROVED' ? 'rgba(34,197,94,0.1)' : entry.reviewStatus === 'REJECTED' ? 'rgba(239,68,68,0.1)' : 'rgba(156,163,175,0.1)',
                            color: entry.reviewStatus === 'APPROVED' ? '#22c55e' : entry.reviewStatus === 'REJECTED' ? '#ef4444' : '#9ca3af',
                            border: `1px solid ${entry.reviewStatus === 'APPROVED' ? 'rgba(34,197,94,0.2)' : entry.reviewStatus === 'REJECTED' ? 'rgba(239,68,68,0.2)' : 'rgba(156,163,175,0.2)'}`
                          }}>
                            {entry.reviewStatus || 'PENDING'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          {(user?.role === 'PROJECT_LEAD' || user?.role === 'QUALITY_REVIEWER') && (
                            <button className="btn btn-ghost btn-sm" onClick={() => setReviewingEntry(entry)} title="Review Task">
                              <CheckCircle2 size={16} />
                            </button>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
                {filteredEntries.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)' }}>
                      No tasks match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, padding: '20px', borderTop: '1px solid var(--color-border)', background: 'var(--color-card)' }}>
              <button className="btn btn-secondary btn-sm" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>
                <ChevronLeft size={16} /> Previous
              </button>
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                Page <strong style={{ color: 'var(--color-text)' }}>{currentPage}</strong> of {totalPages}
              </span>
              <button className="btn btn-secondary btn-sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)}>
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Review Modal */}
      <AnimatePresence>
        {reviewingEntry && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setReviewingEntry(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000 }} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: 460, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 28, zIndex: 1001, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontWeight: 700, fontSize: 18 }}>Review Task Output</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setReviewingEntry(null)}><X size={18} /></button>
              </div>

              <div style={{ background: 'var(--color-card)', padding: 16, borderRadius: 12, marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>TASKER</div>
                <div style={{ fontWeight: 600, marginBottom: 12 }}>{(reviewingEntry.assigneeId as Assignee).fullName}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>PROGRESS</div>
                    <div style={{ fontWeight: 700, color: 'var(--color-teal)' }}>{reviewingEntry.countDone || 0} / {reviewingEntry.countTarget || 0}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>DURATION</div>
                    <div style={{ fontWeight: 700 }}>{formatMinutes(Math.floor((reviewingEntry.totalDurationSeconds || 0) / 60))}</div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 8 }}>Review Feedback (Optional)</label>
                <textarea className="input-base" rows={3} placeholder="Add a note for the tasker..." value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} style={{ resize: 'none' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <button className="btn btn-danger" disabled={reviewMut.isPending} onClick={() => handleReview('REJECTED')} style={{ width: '100%', justifyContent: 'center' }}>
                  <X size={16} /> Reject Task
                </button>
                <button className="btn btn-success" disabled={reviewMut.isPending} onClick={() => handleReview('APPROVED')} style={{ width: '100%', justifyContent: 'center' }}>
                  <Check size={16} /> Approve Task
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
