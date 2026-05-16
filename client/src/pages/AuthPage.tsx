import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ChevronDown, Loader2 } from 'lucide-react';
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from '../lib/schemas';
import { useLogin, useRegister, useProjectLeads, useQualityReviewers } from '../hooks/useAuth';

type TabType = 'signin' | 'register';
type RoleType = 'PROJECT_LEAD' | 'QUALITY_REVIEWER' | 'TASKER';

const ROLES: { value: RoleType; label: string; desc: string }[] = [
  { value: 'PROJECT_LEAD', label: 'Project Lead', desc: 'Manages the team & assigns tasks' },
  { value: 'QUALITY_REVIEWER', label: 'Quality Reviewer', desc: 'Reviews team output' },
  { value: 'TASKER', label: 'Tasker', desc: 'Completes assigned tasks' },
];

export default function AuthPage() {
  const [tab, setTab] = useState<TabType>('signin');
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPlId, setSelectedPlId] = useState('');

  const loginMut = useLogin();
  const registerMut = useRegister();
  const { data: projectLeads = [] } = useProjectLeads();
  const { data: qualityReviewers = [], isLoading: qrLoading } = useQualityReviewers(selectedPlId || undefined);

  const loginForm = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  const registerForm = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onLogin = loginForm.handleSubmit((d) => loginMut.mutate(d));
  const onRegister = registerForm.handleSubmit((d) => registerMut.mutate(d));

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--color-bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(0,212,188,0.06), transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(59,130,246,0.06), transparent 60%)',
    }}>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ width: '100%', maxWidth: 460 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 12 }}>
            <div style={{
              position: 'relative',
              width: 52, height: 52, 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, rgba(13,211,185,0.12), rgba(59,130,246,0.12))',
              borderRadius: '24px',
              border: '1.5px solid rgba(13,211,185,0.35)',
              boxShadow: '0 12px 32px rgba(13,211,185,0.2), inset 0 1px 2px rgba(255,255,255,0.4)',
              overflow: 'hidden',
            }}>
              {/* Gradient orb background */}
              <div style={{
                position: 'absolute', width: 64, height: 64,
                background: 'radial-gradient(circle, rgba(13,211,185,0.5), transparent)',
                borderRadius: '50%',
                top: '-6px', left: '-6px',
              }} />
              {/* Geometric icon */}
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ position: 'relative', zIndex: 1 }}>
                {/* Top left circle */}
                <circle cx="8" cy="8" r="2.8" fill="currentColor" style={{ color: 'var(--color-teal)' }} opacity="0.95" />
                {/* Top right circle */}
                <circle cx="16" cy="8" r="2.8" fill="currentColor" style={{ color: '#3b82f6' }} opacity="0.95" />
                {/* Bottom center circle */}
                <circle cx="12" cy="16" r="2.8" fill="currentColor" style={{ color: 'var(--color-teal)' }} opacity="0.75" />
                {/* Connecting lines */}
                <line x1="8" y1="8" x2="12" y2="16" stroke="currentColor" style={{ color: 'var(--color-teal)' }} strokeWidth="1.3" opacity="0.6" />
                <line x1="16" y1="8" x2="12" y2="16" stroke="currentColor" style={{ color: '#3b82f6' }} strokeWidth="1.3" opacity="0.6" />
                <line x1="8" y1="8" x2="16" y2="8" stroke="currentColor" style={{ color: '#3b82f6' }} strokeWidth="1.1" opacity="0.35" />
              </svg>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.5px' }}>Task Track</div>
            <div style={{ fontSize: 12, color: 'var(--color-teal)', fontWeight: 500, marginTop: 2 }}>Ethara.AI Intelligence Platform</div>
          </div>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
            {(['signin', 'register'] as TabType[]).map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '14px 16px', background: tab === t ? 'var(--color-teal)' : 'transparent', color: tab === t ? '#0d1117' : 'var(--color-text-muted)', fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
                {t === 'signin' ? '→ Sign In' : '👤 Register'}
              </button>
            ))}
          </div>

          <div style={{ padding: '28px 28px 32px' }}>
            <AnimatePresence mode="wait">
              {tab === 'signin' && (
                <motion.form key="signin" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.2 }} onSubmit={onLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 6 }}>Email</label>
                    <input className="input-base" type="email" placeholder="you@example.com" {...loginForm.register('email')} />
                    <AnimatePresence>
                      {loginForm.formState.errors.email && (
                        <motion.p 
                          initial={{ opacity: 0, height: 0 }} 
                          animate={{ opacity: 1, height: 'auto' }} 
                          exit={{ opacity: 0, height: 0 }}
                          style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 4, overflow: 'hidden' }}
                        >
                          {loginForm.formState.errors.email.message}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 6 }}>Password</label>
                    <div style={{ position: 'relative' }}>
                      <input className="input-base" type={showPassword ? 'text' : 'password'} placeholder="••••••••" {...loginForm.register('password')} style={{ paddingRight: 44 }} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary btn-lg" disabled={loginMut.isPending} style={{ marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    {loginMut.isPending ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Signing in...
                      </>
                    ) : 'Sign In'}
                  </button>
                </motion.form>
              )}

              {tab === 'register' && (
                <motion.div key="register" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 10 }}>Select Your Role</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {ROLES.map((role) => (
                        <button key={role.value} type="button" onClick={() => { setSelectedRole(role.value); registerForm.setValue('role', role.value); setSelectedPlId(''); }} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid', borderColor: selectedRole === role.value ? 'var(--color-teal)' : 'var(--color-border)', background: selectedRole === role.value ? 'var(--color-teal-muted)' : 'var(--color-card)', color: selectedRole === role.value ? 'var(--color-teal)' : 'var(--color-text)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{role.label}</div>
                          <div style={{ fontSize: 12, opacity: 0.7 }}>{role.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <AnimatePresence>
                    {selectedRole && (
                      <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.3 }} onSubmit={onRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 5 }}>Full Name *</label>
                            <input className="input-base" placeholder="John Smith" {...registerForm.register('fullName')} />
                            <AnimatePresence>
                              {registerForm.formState.errors.fullName && (
                                <motion.p 
                                  initial={{ opacity: 0, height: 0 }} 
                                  animate={{ opacity: 1, height: 'auto' }} 
                                  exit={{ opacity: 0, height: 0 }}
                                  style={{ color: 'var(--color-danger)', fontSize: 11, marginTop: 3, overflow: 'hidden' }}
                                >
                                  {registerForm.formState.errors.fullName.message}
                                </motion.p>
                              )}
                            </AnimatePresence>
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 5 }}>Job Title</label>
                            <input className="input-base" placeholder="Senior Analyst" {...registerForm.register('jobTitle')} />
                          </div>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 5 }}>Email *</label>
                          <input className="input-base" type="email" placeholder="you@ethara.ai" {...registerForm.register('email')} />
                          <AnimatePresence>
                            {registerForm.formState.errors.email && (
                              <motion.p 
                                initial={{ opacity: 0, height: 0 }} 
                                animate={{ opacity: 1, height: 'auto' }} 
                                exit={{ opacity: 0, height: 0 }}
                                style={{ color: 'var(--color-danger)', fontSize: 11, marginTop: 3, overflow: 'hidden' }}
                              >
                                {registerForm.formState.errors.email.message}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 5 }}>Password *</label>
                          <div style={{ position: 'relative' }}>
                            <input className="input-base" type={showPassword ? 'text' : 'password'} placeholder="Min. 6 characters" {...registerForm.register('password')} style={{ paddingRight: 44 }} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                          <AnimatePresence>
                            {registerForm.formState.errors.password && (
                              <motion.p 
                                initial={{ opacity: 0, height: 0 }} 
                                animate={{ opacity: 1, height: 'auto' }} 
                                exit={{ opacity: 0, height: 0 }}
                                style={{ color: 'var(--color-danger)', fontSize: 11, marginTop: 3, overflow: 'hidden' }}
                              >
                                {registerForm.formState.errors.password.message}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </div>

                        {(selectedRole === 'QUALITY_REVIEWER' || selectedRole === 'TASKER') && (
                          <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 5 }}>Select Project Lead *</label>
                            <div style={{ position: 'relative' }}>
                              <select className="input-base" style={{ appearance: 'none', paddingRight: 36 }} {...registerForm.register('projectLeadId')} onChange={(e) => { registerForm.setValue('projectLeadId', e.target.value); setSelectedPlId(e.target.value); registerForm.setValue('qualityReviewerId', ''); }}>
                                <option value="">— Select Project Lead —</option>
                                {(projectLeads as { _id: string; fullName: string; jobTitle?: string }[]).map((pl) => (
                                  <option key={pl._id} value={pl._id}>{pl.fullName}{pl.jobTitle ? ` · ${pl.jobTitle}` : ''}</option>
                                ))}
                              </select>
                              <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' }} />
                            </div>
                            <AnimatePresence>
                              {registerForm.formState.errors.projectLeadId && (
                                <motion.p 
                                  initial={{ opacity: 0, height: 0 }} 
                                  animate={{ opacity: 1, height: 'auto' }} 
                                  exit={{ opacity: 0, height: 0 }}
                                  style={{ color: 'var(--color-danger)', fontSize: 11, marginTop: 3, overflow: 'hidden' }}
                                >
                                  {registerForm.formState.errors.projectLeadId.message}
                                </motion.p>
                              )}
                            </AnimatePresence>
                          </div>
                        )}

                        {selectedRole === 'TASKER' && (
                          <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 5 }}>Select Quality Reviewer *</label>
                            {selectedPlId && <p style={{ fontSize: 11, color: 'var(--color-teal)', marginBottom: 6 }}>Only reviewers under selected Project Lead are shown</p>}
                            <div style={{ position: 'relative' }}>
                              <select className="input-base" style={{ appearance: 'none', paddingRight: 36 }} {...registerForm.register('qualityReviewerId')} disabled={!selectedPlId || qrLoading}>
                                <option value="">{qrLoading ? 'Loading...' : '— Select QR —'}</option>
                                {(qualityReviewers as { _id: string; fullName: string }[]).map((qr) => (
                                  <option key={qr._id} value={qr._id}>{qr.fullName}</option>
                                ))}
                              </select>
                              <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' }} />
                            </div>
                            <AnimatePresence>
                              {registerForm.formState.errors.qualityReviewerId && (
                                <motion.p 
                                  initial={{ opacity: 0, height: 0 }} 
                                  animate={{ opacity: 1, height: 'auto' }} 
                                  exit={{ opacity: 0, height: 0 }}
                                  style={{ color: 'var(--color-danger)', fontSize: 11, marginTop: 3, overflow: 'hidden' }}
                                >
                                  {registerForm.formState.errors.qualityReviewerId.message}
                                </motion.p>
                              )}
                            </AnimatePresence>
                          </div>
                        )}

                        <button type="submit" className="btn btn-primary btn-lg" disabled={registerMut.isPending} style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          {registerMut.isPending ? (
                            <>
                              <Loader2 size={18} className="animate-spin" />
                              Creating account...
                            </>
                          ) : 'Create Account'}
                        </button>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--color-text-subtle)' }}>© 2025 Ethara.AI Intelligence Platform</p>
      </motion.div>
    </div>
  );
}
