import { Bell, ExternalLink, Menu } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { getInitials } from '../../lib/utils';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '../../hooks/useNotifications';
import { useMe } from '../../hooks/useAuth';
import ProfileModal from '../common/ProfileModal';

interface TopbarProps {
  title?: string;
  onMenuClick?: () => void;
}

export default function Topbar({ title, onMenuClick }: TopbarProps) {
  const { user } = useAuthStore();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { data: me } = useMe();
  const { data } = useNotifications();
  const markOne = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  return (
    <header className="topbar">
      <button className="btn btn-ghost btn-sm topbar-menu-btn" onClick={onMenuClick}>
        <Menu size={18} />
      </button>
      {title && (
        <h1 style={{ fontWeight: 700, fontSize: 18, color: 'var(--color-text)', flex: 1, letterSpacing: '-0.01em' }}>
          {title}
        </h1>
      )}
      {!title && <div style={{ flex: 1 }} />}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Wiki link */}
        <a
          href="https://www.ethara.ai/"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            color: 'var(--color-text-muted)', fontSize: 13, textDecoration: 'none',
          }}
          className="btn btn-ghost btn-sm"
        >
          <ExternalLink size={14} /> Ethara.AI
        </a>

        {/* Notification bell */}
        <button className="btn btn-ghost btn-sm" style={{ position: 'relative' }} onClick={() => setNotifOpen((v) => !v)}>
          <Bell size={18} />
          {unreadCount > 0 && <span style={{
            position: 'absolute', top: -2, right: -2,
            minWidth: 16, height: 16, borderRadius: 10,
            background: 'var(--color-teal)',
            color: '#03120f',
            border: '2px solid var(--color-surface)',
            fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingInline: 3,
          }}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
        </button>
        {notifOpen && (
          <div style={{
            position: 'absolute',
            right: 70,
            top: 56,
            width: 360,
            maxHeight: 420,
            overflowY: 'auto',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            boxShadow: '0 18px 40px rgba(0,0,0,0.3)',
            zIndex: 100,
          }}>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 14 }}>Notifications</strong>
              <button className="btn btn-ghost btn-sm" onClick={() => markAll.mutate()} disabled={markAll.isPending}>Mark all read</button>
            </div>
            {notifications.length === 0 ? (
              <div style={{ padding: 14, fontSize: 13, color: 'var(--color-text-muted)' }}>No updates yet.</div>
            ) : notifications.map((n: any) => (
              <button key={n._id} onClick={() => !n.isRead && markOne.mutate(n._id)} style={{
                width: '100%',
                textAlign: 'left',
                border: 'none',
                background: n.isRead ? 'transparent' : 'rgba(0,212,188,0.08)',
                borderBottom: '1px solid var(--color-border-subtle)',
                padding: '10px 12px',
                cursor: 'pointer',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{n.title}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{n.message}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-subtle)', marginTop: 4 }}>{new Date(n.createdAt).toLocaleString()}</div>
              </button>
            ))}
          </div>
        )}

        {/* User avatar */}
        {user && (
          <div 
            onClick={() => setProfileOpen(true)}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'var(--color-teal-muted)',
              border: '2px solid var(--color-teal)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 12, color: 'var(--color-teal)',
              cursor: 'pointer',
            }}
          >
            {getInitials(user.fullName)}
          </div>
        )}
      </div>

      <ProfileModal 
        member={me} 
        isOpen={profileOpen} 
        onClose={() => setProfileOpen(false)} 
      />
    </header>
  );
}
