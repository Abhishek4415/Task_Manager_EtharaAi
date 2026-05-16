import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, BarChart3, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { useAttendanceHistory, useAttendanceReport, useHolidays } from '../hooks/useAttendance';
import { useMyLeave } from '../hooks/useLeave';
import { useAuthStore } from '../store/authStore';
import { useProjectLeads, useQualityReviewers, useUpdateUser, useProjectsByPL } from '../hooks/useAuth';
import { formatDate, formatTime, formatMinutes, getInitials } from '../lib/utils';
import ProfileModal from '../components/common/ProfileModal';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  getDay, 
  addMonths, 
  subMonths, 
  isSameDay, 
  isSameMonth, 
  startOfWeek, 
  endOfWeek,
  isSunday,
  parseISO
} from 'date-fns';
import { X, Save, User as UserIcon, Briefcase, Mail, ShieldCheck } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

type AttRec = { date: string; punchIn?: string; punchOut?: string; totalMinutes?: number; userId?: { _id: string; fullName: string } };
type HolidayRec = { name: string; date: string; type: 'FESTIVAL' | 'CUSTOM' };
type LeaveRec = { startDate: string; endDate: string; status: string; type: string };

export default function AttendancePage() {
  const { user } = useAuthStore();
  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');
  const [monthDate, setMonthDate] = useState(new Date());

  const from = format(startOfMonth(monthDate), 'yyyy-MM-dd');
  const to = format(endOfMonth(monthDate), 'yyyy-MM-dd');

  // Extended range for calendar grid (including overflow days)
  const gridStart = format(startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const gridEnd = format(endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const { data: history = [] } = useAttendanceHistory({ from: gridStart, to: gridEnd });
  const { data: report } = useAttendanceReport({ from, to });
  const { data: holidays = [] } = useHolidays({ from: gridStart, to: gridEnd });
  const { data: leaves = [] } = useMyLeave();

  const records = history as AttRec[];
  const recordMap = new Map(records.map((r) => [r.date.slice(0, 10), r]));
  const holidayMap = new Map((holidays as HolidayRec[]).map((h) => [h.date.slice(0, 10), h]));
  
  // Map leaves to dates
  const leaveDates = new Set<string>();
  (leaves as LeaveRec[]).forEach(l => {
    if (l.status === 'APPROVED') {
      const start = parseISO(l.startDate);
      const end = parseISO(l.endDate);
      eachDayOfInterval({ start, end }).forEach(d => {
        leaveDates.add(format(d, 'yyyy-MM-dd'));
      });
    }
  });

  const days = eachDayOfInterval({ 
    start: startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 }), 
    end: endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 }) 
  });

  const totalPresent = records.filter((r) => r.punchIn && isSameMonth(parseISO(r.date), monthDate)).length;
  const totalMinutes = records.reduce((a, r) => isSameMonth(parseISO(r.date), monthDate) ? a + (r.totalMinutes || 0) : a, 0);
  const avgMinutes = totalPresent > 0 ? Math.round(totalMinutes / totalPresent) : 0;

  const getDayStatus = (day: Date) => {
    const key = format(day, 'yyyy-MM-dd');
    const rec = recordMap.get(key);
    const holiday = holidayMap.get(key);
    const isLeave = leaveDates.has(key);
    
    if (holiday) return holiday.type === 'FESTIVAL' ? 'festival' : 'custom-holiday';
    if (isSunday(day)) return 'sunday';
    if (isLeave) return 'leave';
    if (rec?.punchIn) return 'present';
    return 'none';
  };

  const statusConfig = {
    present: { label: 'Present', color: '#4ade80', bg: 'rgba(74, 222, 128, 0.1)', dot: '#4ade80' },
    leave: { label: 'Leave', color: '#f87171', bg: 'rgba(248, 113, 113, 0.1)', dot: '#f87171' },
    sunday: { label: 'Sunday', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', dot: '#3b82f6' },
    festival: { label: 'Festival / Holiday', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', dot: '#f59e0b' },
    'custom-holiday': { label: 'Custom Holiday', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)', dot: '#a855f7' },
    none: { label: '', color: 'transparent', bg: 'transparent', dot: 'transparent' }
  };

  const handlePrevMonth = () => setMonthDate(subMonths(monthDate, 1));
  const handleNextMonth = () => setMonthDate(addMonths(monthDate, 1));
  const handleToday = () => setMonthDate(new Date());

  const [searchTerm, setSearchTerm] = useState('');
  const [qrFilter, setQrFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  // Edit Modal State
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const updateUser = useUpdateUser();
  const { data: allLeads = [] } = useProjectLeads();
  const { data: modalQRs = [] } = useQualityReviewers(editForm?.projectLeadId);
  const { data: modalProjects = [] } = useProjectsByPL(editForm?.projectLeadId);

  const teamData = (report as any)?.teamMembers || [];
  
  // Extract unique QRs for the filter
  const uniqueQRs = Array.from(new Map<string, string>(
    teamData
      .filter((m: any) => m.qualityReviewerId)
      .map((m: any) => [
        (m.qualityReviewerId._id || m.qualityReviewerId) as string, 
        (m.qualityReviewerId.fullName || 'Unknown Reviewer') as string
      ])
  ).entries());

  const filteredTeam = teamData.filter((m: any) => {
    const matchesSearch = m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesQR = qrFilter === 'all' || m.qualityReviewerId?._id === qrFilter;
    const matchesRole = roleFilter === 'all' || m.role === roleFilter;
    return matchesSearch && matchesQR && matchesRole;
  });

  const filteredRecords = (report as any)?.records?.filter((rec: any) => {
    const member = teamData.find((m: any) => m._id === (rec.userId?._id || rec.userId));
    if (!member) return false;
    
    const matchesSearch = member.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          member.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesQR = qrFilter === 'all' || member.qualityReviewerId?._id === qrFilter;
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    
    return matchesSearch && matchesQR && matchesRole;
  }) || [];

  const handleMemberClick = (member: any) => {
    setSelectedMember(member);
    setEditForm({
      fullName: member.fullName,
      jobTitle: member.jobTitle || '',
      qualityLevel: member.qualityLevel || 'QL1',
      projectLeadId: (report as any)?.projectLeadId || member.projectLeadId || '',
      qualityReviewerId: member.qualityReviewerId?._id || member.qualityReviewerId || '',
      projectId: member.projectId || '',
    });
  };

  const handleSave = async () => {
    await updateUser.mutateAsync({ id: selectedMember._id, data: editForm });
    setSelectedMember(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>
      {/* Original Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        {[
          { label: 'Present Days', value: totalPresent, color: 'var(--color-success)', icon: Calendar },
          { label: 'Total Hours', value: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`, color: 'var(--color-info)', icon: Clock },
          { label: 'Avg Hours/Day', value: formatMinutes(avgMinutes), color: 'var(--color-teal)', icon: BarChart3 },
        ].map((s) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderTop: `3px solid ${s.color}`, borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <s.icon size={16} style={{ color: s.color }} />
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 500 }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>{s.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Original Toggle */}
      <div style={{ display: 'flex', gap: 8 }}>
        {(['calendar', 'table'] as const).map((m) => (
          <button key={m} onClick={() => setViewMode(m)} style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid', borderColor: viewMode === m ? 'var(--color-teal)' : 'var(--color-border)', background: viewMode === m ? 'var(--color-teal-muted)' : 'transparent', color: viewMode === m ? 'var(--color-teal)' : 'var(--color-text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>
            {m}
          </button>
        ))}
      </div>

      {viewMode === 'calendar' ? (
        <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 20, padding: '20px 24px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
          {/* New Calendar Header with Nav */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--color-text)' }}>Attendance Calendar</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
                <button onClick={handlePrevMonth} style={{ padding: '6px 10px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>
                  <ChevronLeft size={16} />
                </button>
                <div style={{ padding: '6px 14px', borderLeft: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
                  {format(monthDate, 'MMMM yyyy')}
                  <CalendarDays size={14} style={{ color: 'var(--color-text-subtle)' }} />
                </div>
                <button onClick={handleNextMonth} style={{ padding: '6px 10px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>
                  <ChevronRight size={16} />
                </button>
              </div>
              <button onClick={handleToday} style={{ padding: '7px 14px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 12, fontWeight: 600, color: 'var(--color-text)', cursor: 'pointer' }}>
                Today
              </button>
            </div>
          </div>

          {/* New Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 20, padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
            {(['present', 'leave', 'sunday', 'festival', 'custom-holiday'] as const).map(type => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 500, color: 'var(--color-text-muted)' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusConfig[type].dot }} />
                {statusConfig[type].label}
              </div>
            ))}
          </div>

          {/* New Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 8 }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d} style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: d === 'Sun' ? '#3b82f6' : 'var(--color-text-muted)', paddingBottom: 6 }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
            {days.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const status = getDayStatus(day);
              const config = statusConfig[status];
              const isCurrentMonth = isSameMonth(day, monthDate);
              const isToday = isSameDay(day, new Date());
              const holiday = holidayMap.get(key);

              return (
                <div key={key} style={{ 
                  aspectRatio: '1.4', 
                  display: 'flex', 
                  flexDirection: 'column',
                  padding: '6px 8px',
                  borderRadius: 10, 
                  background: isToday ? 'var(--color-teal-muted)' : 'rgba(255,255,255,0.01)', 
                  border: isToday ? '1px solid var(--color-teal)' : '1px solid var(--color-border)', 
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: isCurrentMonth ? (status === 'sunday' ? '#3b82f6' : 'var(--color-text)') : 'var(--color-text-subtle)', marginBottom: 'auto' }}>
                    {format(day, 'd')}
                  </div>
                  {status !== 'none' && (
                    <div style={{ 
                      fontSize: 9, 
                      fontWeight: 800, 
                      padding: '2px 5px', 
                      borderRadius: 5, 
                      background: config.bg, 
                      color: config.color,
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      width: '100%'
                    }}>
                      {holiday ? holiday.name : config.label}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Date', 'Punch In', 'Punch Out', 'Total Hours'].map((h) => (
                  <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>No records found</td></tr>
              ) : records.sort((a,b) => b.date.localeCompare(a.date)).map((rec, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <td style={{ padding: '12px 20px', fontSize: 14 }}>{formatDate(rec.date)}</td>
                  <td style={{ padding: '12px 20px', fontSize: 14, color: 'var(--color-success)' }}>{rec.punchIn ? formatTime(rec.punchIn) : '—'}</td>
                  <td style={{ padding: '12px 20px', fontSize: 14, color: 'var(--color-danger)' }}>{rec.punchOut ? formatTime(rec.punchOut) : '—'}</td>
                  <td style={{ padding: '12px 20px', fontSize: 14, fontWeight: 600 }}>{rec.totalMinutes ? formatMinutes(rec.totalMinutes) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Team Directory for PL/QR */}
      {user?.role !== 'TASKER' && teamData.length > 0 && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>My Team Members</div>
            <div style={{ display: 'flex', gap: 12, flex: 1, minWidth: 300, justifyContent: 'flex-end' }}>
              <input 
                type="text" 
                placeholder="Search by name or email..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: 13, flex: 1, maxWidth: 300 }}
              />
              {user?.role === 'PROJECT_LEAD' && (
                <select 
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: 13, minWidth: 120 }}
                >
                  <option value="all">All Roles</option>
                  <option value="QUALITY_REVIEWER">Reviewers</option>
                  <option value="TASKER">Taskers</option>
                </select>
              )}
              {user?.role === 'PROJECT_LEAD' && uniqueQRs.length > 0 && (
                <select 
                  value={qrFilter}
                  onChange={(e) => setQrFilter(e.target.value)}
                  style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: 13, minWidth: 150 }}
                >
                  <option value="all">All Reviewers</option>
                  {uniqueQRs.map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {filteredTeam.map((member: any) => (
              <div 
                key={member._id} 
                onClick={() => handleMemberClick(member)}
                style={{ padding: 16, background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'all 0.2s ease' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-teal)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--color-teal-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'var(--color-teal)' }}>
                  {getInitials(member.fullName)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.fullName}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>{member.email}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: member.role === 'QUALITY_REVIEWER' ? 'var(--color-teal-muted)' : 'rgba(255,255,255,0.05)', color: member.role === 'QUALITY_REVIEWER' ? 'var(--color-teal)' : 'var(--color-text-subtle)', border: member.role === 'QUALITY_REVIEWER' ? '1px solid var(--color-teal)' : 'none' }}>
                      {member.role === 'QUALITY_REVIEWER' ? 'QR' : (member.qualityLevel || 'QL1')}
                    </span>
                    {member.projectId && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--color-info-muted)', color: 'var(--color-info)' }}>
                        {member.projectId.name || member.projectId}
                      </span>
                    )}
                    {member.qualityReviewerId && member.role === 'TASKER' && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.03)', color: 'var(--color-text-muted)' }}>
                        QR: {member.qualityReviewerId.fullName || member.qualityReviewerId}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {filteredTeam.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)', fontSize: 14 }}>No team members found matching your search.</div>
          )}
        </div>
      )}

      <ProfileModal 
        member={selectedMember} 
        isOpen={!!selectedMember} 
        onClose={() => setSelectedMember(null)} 
      />

      {/* Team Attendance Report Table */}
      {user?.role !== 'TASKER' && report && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Team Attendance Report</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Quick Filter:</span>
              <select 
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.02)', color: 'var(--color-text)', fontSize: 12 }}
              >
                <option value="all">All Roles</option>
                <option value="QUALITY_REVIEWER">Reviewers</option>
                <option value="TASKER">Taskers</option>
              </select>
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Member', 'Role', 'QR', 'Project', 'Date', 'Punch In', 'Punch Out', 'Hours'].map((h) => (
                  <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((rec: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <td style={{ padding: '12px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-teal-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--color-teal)' }}>
                        {getInitials(rec.userId?.fullName || '?')}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{rec.userId?.fullName}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 20px' }}>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: rec.userId?.role === 'QUALITY_REVIEWER' ? 'var(--color-teal-muted)' : 'rgba(255,255,255,0.05)', color: rec.userId?.role === 'QUALITY_REVIEWER' ? 'var(--color-teal)' : 'var(--color-text-subtle)' }}>
                      {rec.userId?.role === 'QUALITY_REVIEWER' ? 'QR' : 'Tasker'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--color-text-subtle)' }}>
                    {rec.userId?.qualityReviewerId?.fullName || '—'}
                  </td>
                  <td style={{ padding: '12px 20px', fontSize: 12, fontWeight: 600, color: 'var(--color-info)' }}>
                    {rec.userId?.projectId?.name || '—'}
                  </td>
                  <td style={{ padding: '12px 20px', fontSize: 13 }}>{formatDate(rec.date)}</td>
                  <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--color-success)' }}>{rec.punchIn ? formatTime(rec.punchIn) : '—'}</td>
                  <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--color-danger)' }}>{rec.punchOut ? formatTime(rec.punchOut) : '—'}</td>
                  <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600 }}>{rec.totalMinutes ? formatMinutes(rec.totalMinutes) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
