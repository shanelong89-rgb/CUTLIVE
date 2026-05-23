import { Routes, Route, useLocation, useNavigationType } from 'react-router-dom';
import { TabBar } from './components/TabBar';
import { Discover } from './pages/Discover';
import { Tickets } from './pages/Tickets';
import { Submit } from './pages/Submit';
import { Inbox } from './pages/Inbox';
import { Account } from './pages/Account';
import { EventDetail } from './pages/EventDetail';
import { Admin } from './pages/Admin';
import { Saved } from './pages/Saved';
import { ResetPassword } from './pages/ResetPassword';
import { AuthModal } from './components/AuthModal';
import { ProfileMenu } from './components/ProfileMenu';
import { useAuth } from './hooks/useAuth';
import { useInboxMessages } from './hooks/useInboxMessages';
import { useState, useEffect } from 'react';

// Scroll to top only on forward navigation — browser handles scroll restoration on back/forward
function ScrollToTop() {
  const { pathname } = useLocation();
  const navType = useNavigationType();
  useEffect(() => {
    if (navType !== 'POP') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [pathname, navType]);
  return null;
}

function App() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');
  const { unreadCount } = useInboxMessages();

  return (
    <div className="app">
      <ScrollToTop />
      {!isAdminPage && <WebNav setIsAuthOpen={setIsAuthOpen} unreadCount={unreadCount} />}

      <Routes>
        <Route path="/" element={<Discover />} />
        <Route path="/event/:id" element={<EventDetail setIsAuthOpen={setIsAuthOpen} />} />
        <Route path="/tickets" element={<Tickets />} />
        <Route path="/submit" element={<Submit />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/saved" element={<Saved />} />
        <Route path="/account" element={<Account setIsAuthOpen={setIsAuthOpen} />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin/*" element={<Admin />} />
      </Routes>

      {!isAdminPage && <TabBar unreadCount={unreadCount} />}

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
}

// Web Navigation Component
function WebNav({
  setIsAuthOpen,
  unreadCount,
}: {
  setIsAuthOpen: (open: boolean) => void;
  unreadCount: number;
}) {
  const { user, isAdmin, loading } = useAuth();
  const navItems = [
    { path: '/', label: 'Discover' },
    { path: '/saved', label: 'Saved' },
    { path: '/tickets', label: 'Tickets' },
    { path: '/submit', label: 'Submit Event' },
    { path: '/inbox', label: 'Inbox' },
  ];

  return (
    <header className="web-nav">
      <div className="web-nav-container">
        <a href="/" className="web-logo">
          <span className="logo-text">CULTIVE</span>
          <span className="logo-sub">文化活</span>
        </a>

        <nav className="web-nav-links">
          {navItems.map((item) => (
            <a key={item.path} href={item.path} className="web-nav-link">
              {item.label}
              {item.path === '/inbox' && unreadCount > 0 && (
                <span className="nav-badge">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </a>
          ))}
        </nav>

        <div className="web-nav-actions">
          {!loading && isAdmin && (
            <a href="/admin" className="web-nav-link" style={{ marginRight: '8px' }}>
              Admin
            </a>
          )}
          {!loading && user ? (
            <ProfileMenu />
          ) : !loading ? (
            <button className="web-nav-btn" onClick={() => setIsAuthOpen(true)}>
              Sign In
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export default App;
