import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarDays, CheckCircle2, XCircle, Clock, Eye } from 'lucide-react';
import { leaveSchema, type LeaveInput } from '../lib/schemas';
import {
  useMyLeave,
  useTeamLeave,
  usePendingLeave,
  useSubmitLeave,
  useApproveLeave,
  useRejectLeave,
  useLeaveCalendar,
  useLeaveMemberAnalytics,
} from '../hooks/useLeave';
import { useAuthStore } from '../store/authStore';
import { formatDate, statusColor, statusLabel, getInitials, formatMinutes } from '../lib/utils';

const LEAVE_TYPES = ['SICK', 'PERSONAL', 'ANNUAL', 'EMERGENCY'];

type LeaveReq = {
  _id: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  reviewNote?: string;
  userId?: { _id: string; fullName: string; role: string };
};

export default function ApplyLeavePage() {
  const { user } = useAuthStore();
  const isPL = user?.role === 'PROJECT_LEAD';
  const isQR = user?.role === 'QUALITY_REVIEWER';
  const isReviewer = isPL || isQR;

  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const { data: myLeave = [] } = useMyLeave();
  const { data: pendingLeave = [] } = usePendingLeave();
  const { data: teamLeave = [] } = useTeamLeave();
  const { data: calendarLeaves = [] } = useLeaveCalendar();
  const submitMut = useSubmitLeave();
  const approveMut = useApproveLeave();
  const rejectMut = useRejectLeave();

  const now = new Date();
  const analytics = useLeaveMemberAnalytics(selectedMemberId || undefined, { month: now.getMonth() + 1, year: now.getFullYear() });

  const form = useForm<LeaveInput>({ resolver: zodResolver(leaveSchema) });
  const onSubmit = form.handleSubmit((data) => submitMut.mutate(data, { onSuccess: () => form.reset() }));

  const grouped = useMemo(() => {
    const all = myLeave as LeaveReq[];
    return {
      pending: all.filter((l) => l.status === 'QR_PENDING' || l.status === 'PL_PENDING'),
      approved: all.filter((l) => l.status === 'APPROVED'),
      rejected: all.filter((l) => l.status === 'REJECTED'),
      history: all,
    };
  }, [myLeave]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {!isPL && <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 24 }}>
        <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <CalendarDays size={20} style={{ color: 'var(--color-teal)' }} /> Apply for Leave
        </h2>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {LEAVE_TYPES.map((t) => (
              <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--color-border)', cursor: 'pointer', fontSize: 13 }}>
                <input type="radio" value={t} {...form.register('type')} style={{ accentColor: 'var(--color-teal)' }} />
                {t.charAt(0) + t.slice(1).toLowerCase()}
              </label>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <input type="date" className="input-base" {...form.register('startDate')} />
            <input type="date" className="input-base" {...form.register('endDate')} />
          </div>
          <textarea className="input-base" rows={3} placeholder="Describe your reason for leave..." {...form.register('reason')} style={{ resize: 'vertical' }} />
          <button type="submit" className="btn btn-primary" disabled={submitMut.isPending} style={{ alignSelf: 'flex-start' }}>
            {submitMut.isPending ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      </div>}

      {!isPL && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        {[
          { k: 'Pending', v: grouped.pending.length, c: 'var(--color-warning)' },
          { k: 'Approved', v: grouped.approved.length, c: 'var(--color-success)' },
          { k: 'Rejected', v: grouped.rejected.length, c: 'var(--color-danger)' },
          { k: 'Leave History', v: grouped.history.length, c: 'var(--color-info)' },
        ].map((card) => (
          <div key={card.k} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderTop: `3px solid ${card.c}`, borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>{card.k}</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{card.v}</div>
          </div>
        ))}
      </div>}

      {!isPL && <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', fontWeight: 700 }}>My Leave History</div>
        {(myLeave as LeaveReq[]).length === 0 ? <div style={{ padding: 20, color: 'var(--color-text-muted)' }}>No leave requests yet</div> : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {(myLeave as LeaveReq[]).map((lr) => (
              <div key={lr._id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--color-border-subtle)', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{lr.type}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{formatDate(lr.startDate)} → {formatDate(lr.endDate)}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>{lr.reason}</div>
                </div>
                <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: `${statusColor(lr.status)}22`, color: statusColor(lr.status), height: 'fit-content' }}>{statusLabel(lr.status)}</span>
              </div>
            ))}
          </div>
        )}
      </div>}

      {isReviewer && (
        <>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', fontWeight: 700 }}>
              {isPL ? 'Pending Approvals (Step 2: PL)' : 'Pending Approvals (Step 1: QR)'}
            </div>
            {(pendingLeave as LeaveReq[]).length === 0 ? <div style={{ padding: 20, color: 'var(--color-text-muted)' }}>No pending requests</div> : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {(pendingLeave as LeaveReq[]).map((lr) => (
                  <div key={lr._id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-teal-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--color-teal)' }}>{getInitials(lr.userId?.fullName || '?')}</div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{lr.userId?.fullName}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{lr.type} • {formatDate(lr.startDate)} to {formatDate(lr.endDate)}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-subtle)', marginTop: 2 }}>
                            Reason: {lr.reason || '—'}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-success btn-sm" disabled={approveMut.isPending} onClick={() => approveMut.mutate({ id: lr._id })}><CheckCircle2 size={14} /> Approve</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setRejectId(lr._id)}><XCircle size={14} /> Reject</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelectedMemberId(lr.userId?._id || null)}><Eye size={14} /> Report</button>
                      </div>
                    </div>
                    {rejectId === lr._id && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <input className="input-base" placeholder="Rejection reason" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} style={{ flex: 1 }} />
                        <button className="btn btn-danger btn-sm" disabled={!rejectNote} onClick={() => rejectMut.mutate({ id: lr._id, reviewNote: rejectNote }, { onSuccess: () => { setRejectId(null); setRejectNote(''); } })}>Confirm</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 14 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Team Leave Calendar</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(calendarLeaves as LeaveReq[]).slice(0, 12).map((l) => (
                  <span key={l._id} style={{ padding: '4px 8px', borderRadius: 20, fontSize: 12, border: `1px solid ${statusColor(l.status)}`, color: statusColor(l.status) }}>
                    {new Date(l.startDate).toLocaleDateString()} • {l.userId?.fullName}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 14 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Member Leave Analytics</div>
              {!selectedMemberId ? <div style={{ color: 'var(--color-text-muted)' }}>Select a member from pending/team list.</div> : analytics.isLoading ? <div>Loading...</div> : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div><div style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>Total Leaves</div><div style={{ fontWeight: 700 }}>{analytics.data?.leave?.totalLeavesTaken || 0}</div></div>
                  <div><div style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>Completed Tasks</div><div style={{ fontWeight: 700 }}>{analytics.data?.productivity?.completedTasks || 0}</div></div>
                  <div><div style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>AHT</div><div style={{ fontWeight: 700 }}>{formatMinutes(Math.round(analytics.data?.productivity?.ahtMinutes || 0))}</div></div>
                  <div><div style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>Present Days</div><div style={{ fontWeight: 700 }}>{analytics.data?.productivity?.presentDays || 0}</div></div>
                </div>
              )}
            </div>
          </div>

          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', fontWeight: 700 }}>Team Leave Visibility</div>
            {(teamLeave as LeaveReq[]).length === 0 ? <div style={{ padding: 20, color: 'var(--color-text-muted)' }}>No team leaves</div> : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {(teamLeave as LeaveReq[]).map((lr) => (
                  <div key={lr._id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--color-border-subtle)', display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <div>
                      <div>{lr.userId?.fullName} • {lr.type} • {formatDate(lr.startDate)} to {formatDate(lr.endDate)}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-subtle)', marginTop: 2 }}>
                        Reason: {lr.reason || '—'}
                      </div>
                    </div>
                    <span style={{ color: statusColor(lr.status), fontWeight: 700 }}><Clock size={12} style={{ marginRight: 4 }} />{statusLabel(lr.status)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
