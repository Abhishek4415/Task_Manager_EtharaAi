import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, User as UserIcon, Briefcase, ShieldCheck, Mail, Edit3, ChevronLeft } from 'lucide-react';
import { useProjectLeads, useQualityReviewers, useUpdateUser, useProjectsByPL } from '../../hooks/useAuth';
import { getInitials } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';

interface ProfileModalProps {
  member: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ member, isOpen, onClose }: ProfileModalProps) {
  const { user: currentUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const updateUser = useUpdateUser();
  const { data: allLeads = [] } = useProjectLeads();
  
  const { data: modalQRs = [] } = useQualityReviewers(editForm?.projectLeadId);
  const { data: modalProjects = [] } = useProjectsByPL(editForm?.projectLeadId);

  useEffect(() => {
    if (member) {
      setEditForm({
        fullName: member.fullName,
        jobTitle: member.jobTitle || '',
        qualityLevel: member.qualityLevel || 'QL1',
        projectLeadId: member.projectLeadId?._id || member.projectLeadId || '',
        qualityReviewerId: member.qualityReviewerId?._id || member.qualityReviewerId || '',
        projectId: member.projectId || '',
      });
      setIsEditing(false);
    }
  }, [member]);

  const handleSave = async () => {
    await updateUser.mutateAsync({ id: member._id, data: editForm });
    setIsEditing(false);
  };

  if (!member || !editForm) return null;

  const isSelf = currentUser?._id === member._id;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 10px' }}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} />
          
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
            style={{ position: 'relative', width: '100%', maxWidth: 460, maxHeight: 'calc(100vh - 40px)', background: 'var(--color-surface)', borderRadius: 28, border: '1px solid var(--color-border)', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '32px 32px 24px', position: 'relative', background: 'linear-gradient(to bottom, rgba(0,212,188,0.05), transparent)', display: 'flex', alignItems: 'center', gap: 20 }}>
              {isEditing && (
                <button onClick={() => setIsEditing(false)} style={{ position: 'absolute', right: 64, top: 32, padding: 8, borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.03)', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                  <ChevronLeft size={20} />
                </button>
              )}
              <button onClick={onClose} style={{ position: 'absolute', right: 24, top: 32, padding: 8, borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.03)', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>

              <div style={{ display: 'flex', width: 64, height: 64, borderRadius: 20, background: 'var(--color-teal-muted)', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, color: 'var(--color-teal)', border: '3px solid var(--color-surface)', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
                {getInitials(member.fullName)}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)', marginBottom: 2 }}>{member.fullName}</h3>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>{member.jobTitle || 'Team Member'} • {member.role}</p>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '0 32px 32px' }}>
              {!isEditing ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20, background: 'rgba(255,255,255,0.02)', borderRadius: 20, border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-subtle)' }}><Mail size={16} /></div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{member.email}</div>
                      </div>
                    </div>
                    <div style={{ height: 1, background: 'var(--color-border)', margin: '4px 0' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-subtle)' }}><ShieldCheck size={16} /></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Management</div>
                        <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                          <span style={{ color: 'var(--color-text-subtle)' }}>Lead:</span>
                          <span style={{ fontWeight: 600 }}>{member.projectLeadId?.fullName || 'N/A'}</span>
                        </div>
                        <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                          <span style={{ color: 'var(--color-text-subtle)' }}>Reviewer:</span>
                          <span style={{ fontWeight: 600 }}>{member.qualityReviewerId?.fullName || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ height: 1, background: 'var(--color-border)', margin: '4px 0' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-subtle)' }}><Briefcase size={16} /></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Project</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-teal)', marginTop: 2 }}>{member.projectId?.name || 'No Project Assigned'}</div>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setIsEditing(true)}
                    style={{ width: '100%', padding: '14px', borderRadius: 16, border: '1px solid var(--color-teal)', background: 'var(--color-teal-muted)', color: 'var(--color-teal)', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s ease' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-teal)'; e.currentTarget.style.color = '#03120f'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-teal-muted)'; e.currentTarget.style.color = 'var(--color-teal)'; }}
                  >
                    <Edit3 size={18} /> Edit Profile Details
                  </button>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)' }}>Quality Level</label>
                      <select value={editForm.qualityLevel} onChange={e => setEditForm({...editForm, qualityLevel: e.target.value})}
                        style={{ padding: '10px 12px', borderRadius: 12, border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text)', fontSize: 13 }}>
                        {['QL1', 'QL2', 'QL3', 'QL4'].map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)' }}>Project Lead</label>
                      <select value={editForm.projectLeadId} onChange={e => setEditForm({...editForm, projectLeadId: e.target.value, qualityReviewerId: '', projectId: ''})}
                        style={{ padding: '10px 12px', borderRadius: 12, border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text)', fontSize: 13 }}>
                        <option value="">Select Lead</option>
                        {allLeads.map((pl: any) => <option key={pl._id} value={pl._id}>{pl.fullName}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)' }}>Quality Reviewer</label>
                      <select value={editForm.qualityReviewerId} onChange={e => setEditForm({...editForm, qualityReviewerId: e.target.value})}
                        style={{ padding: '10px 12px', borderRadius: 12, border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text)', fontSize: 13 }}>
                        <option value="">No Reviewer</option>
                        {modalQRs.map((qr: any) => <option key={qr._id} value={qr._id}>{qr.fullName}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)' }}>Project</label>
                      <select value={editForm.projectId} onChange={e => setEditForm({...editForm, projectId: e.target.value})}
                        style={{ padding: '10px 12px', borderRadius: 12, border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text)', fontSize: 13 }}>
                        <option value="">No Project</option>
                        {modalProjects.map((p: any) => <option key={p._id} value={p._id}>{p.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                    <button onClick={() => setIsEditing(false)} style={{ flex: 1, padding: '12px', borderRadius: 14, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                      Cancel
                    </button>
                    <button 
                      onClick={handleSave} 
                      disabled={updateUser.isPending}
                      style={{ flex: 1, padding: '12px', borderRadius: 14, border: 'none', background: 'var(--color-teal)', color: '#03120f', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: updateUser.isPending ? 0.7 : 1 }}>
                      <Save size={18} /> {updateUser.isPending ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
