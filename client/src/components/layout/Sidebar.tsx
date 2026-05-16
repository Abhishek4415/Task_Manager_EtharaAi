import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, CheckSquare, FolderOpen,
  PlusSquare, Clock, CalendarDays, LogOut, ChevronRight, PanelLeftClose, PanelLeftOpen, X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { getInitials, roleLabel, roleColor } from '../../lib/utils';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['PROJECT_LEAD', 'QUALITY_REVIEWER', 'TASKER'] },
  { to: '/team-progress', icon: Users, label: 'Team Progress', roles: ['PROJECT_LEAD', 'QUALITY_REVIEWER'] },
  { to: '/my-tasks', icon: CheckSquare, label: 'My Tasks', roles: ['PROJECT_LEAD', 'QUALITY_REVIEWER', 'TASKER'] },
  { to: '/projects', icon: FolderOpen, label: 'Projects', roles: ['PROJECT_LEAD'] },
  { to: '/create-todo', icon: PlusSquare, label: 'Create TODO', roles: ['PROJECT_LEAD'] },
  { to: '/attendance', icon: Clock, label: 'Attendance', roles: ['PROJECT_LEAD', 'QUALITY_REVIEWER', 'TASKER'] },
  { to: '/apply-leave', icon: CalendarDays, label: 'Leave Management', roles: ['PROJECT_LEAD', 'QUALITY_REVIEWER', 'TASKER'] },
];

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({ mobileOpen, onCloseMobile, collapsed, onToggleCollapse }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const filtered = navItems.filter((item) => user && item.roles.includes(user.role));

  return (
    <>
      <div className={`sidebar-backdrop ${mobileOpen ? 'show' : ''}`} onClick={onCloseMobile} />
      <motion.aside
      initial={{ x: -260 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'open' : ''}`}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px 16px' }}>
        <div style={{
          position: 'relative',
          width: 40, height: 40, 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, rgba(13,211,185,0.1), rgba(59,130,246,0.1))',
          borderRadius: '20px',
          border: '1.5px solid rgba(13,211,185,0.3)',
          boxShadow: '0 8px 24px rgba(13,211,185,0.15), inset 0 1px 2px rgba(255,255,255,0.3)',
          overflow: 'hidden',
        }}>
          {/* Gradient orb background */}
          <div style={{
            position: 'absolute', width: 50, height: 50,
            background: 'radial-gradient(circle, rgba(13,211,185,0.4), transparent)',
            borderRadius: '50%',
            top: '-5px', left: '-5px',
          }} />
          {/* Geometric icon */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ position: 'relative', zIndex: 1 }}>
            {/* Top left circle */}
            <circle cx="8" cy="8" r="2.5" fill="currentColor" style={{ color: 'var(--color-teal)' }} opacity="0.9" />
            {/* Top right circle */}
            <circle cx="16" cy="8" r="2.5" fill="currentColor" style={{ color: '#3b82f6' }} opacity="0.9" />
            {/* Bottom center circle */}
            <circle cx="12" cy="16" r="2.5" fill="currentColor" style={{ color: 'var(--color-teal)' }} opacity="0.7" />
            {/* Connecting lines */}
            <line x1="8" y1="8" x2="12" y2="16" stroke="currentColor" style={{ color: 'var(--color-teal)' }} strokeWidth="1.2" opacity="0.5" />
            <line x1="16" y1="8" x2="12" y2="16" stroke="currentColor" style={{ color: '#3b82f6' }} strokeWidth="1.2" opacity="0.5" />
            <line x1="8" y1="8" x2="16" y2="8" stroke="currentColor" style={{ color: '#3b82f6' }} strokeWidth="1" opacity="0.3" />
          </svg>
        </div>
        {!collapsed && <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)', letterSpacing: '-0.5px' }}>Task Track</div>
          <div style={{ fontSize: 10, color: 'var(--color-text-subtle)', lineHeight: 1.2, fontWeight: 500 }}>Ethara.AI</div>
        </div>}
        <button className="btn btn-ghost btn-sm sidebar-desktop-toggle" onClick={onToggleCollapse}>
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
        <button className="btn btn-ghost btn-sm sidebar-mobile-close" onClick={onCloseMobile}>
          <X size={16} />
        </button>
      </div>

      {/* User card */}
      {user && (
        <div style={{
          background: 'var(--color-card)',
          borderRadius: 10,
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 8,
          border: '1px solid var(--color-border)',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--color-teal-muted)',
            border: '2px solid var(--color-teal)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 13, color: 'var(--color-teal)',
            flexShrink: 0,
          }}>{getInitials(user.fullName)}</div>
          <div style={{ minWidth: 0 }}>
            {!collapsed && <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.fullName}
            </div>}
            {!collapsed && <div style={{
              fontSize: 10, fontWeight: 600,
              color: roleColor(user.role),
              background: `${roleColor(user.role)}22`,
              padding: '1px 6px', borderRadius: 20, display: 'inline-block',
            }}>
              {roleLabel(user.role)}
            </div>}
          </div>
        </div>
      )}

      {/* Nav items */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filtered.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            title={collapsed ? item.label : undefined}
          >
            <item.icon size={17} />
            {!collapsed && item.label}
            {!collapsed && <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.4 }} />}
          </NavLink>
        ))}
      </nav>

      {/* Sign out */}
      <button
        onClick={handleLogout}
        className="nav-item"
        style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', color: 'var(--color-danger)', marginTop: 8 }}
        title={collapsed ? 'Sign Out' : undefined}
      >
        <LogOut size={17} />
        {!collapsed && 'Sign Out'}
      </button>
      </motion.aside>
    </>
  );
}
