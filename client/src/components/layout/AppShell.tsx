import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/team-progress': 'Team Progress',
  '/my-tasks': 'My Tasks',
  '/projects': 'Projects',
  '/create-todo': 'Create TODO Session',
  '/attendance': 'Attendance',
  '/apply-leave': 'Leave Management',
};

export default function AppShell() {
  const { pathname } = useLocation();
  const title = pageTitles[pathname] || 'TaskTrack';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="app-shell">
      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />
      <div
        className="app-shell-main"
        style={{ marginLeft: sidebarCollapsed ? 88 : 240 }}
      >
        <Topbar title={title} onMenuClick={() => setMobileOpen((prev) => !prev)} />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
