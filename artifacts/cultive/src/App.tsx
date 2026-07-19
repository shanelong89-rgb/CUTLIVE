import { Routes, Route, useLocation, useNavigationType, NavLink, Link } from 'react-router-dom';
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
import { MySubmissions } from './pages/MySubmissions';
import { AuthCallback } from './pages/AuthCallback';
import { AuthVerify } from './pages/AuthVerify';
import { Settings } from './pages/Settings';
import { AuthModal } from './components/AuthModal';
import { ProfileMenu } from './components/ProfileMenu';
import { useAuth } from './hooks/useAuth';
import { useInbox } from './contexts/InboxContext';
import { useState, useEffect, useRef } from 'react';
import { supabase, applyReferralCode } from './lib/supabase';

const REF_CODE_KEY = 'cultive:pending-ref';
const INVITE_BANNER_KEY = 'cultive:invite-banner';

function AboutRedirect() {
  useEffect(() => {
    window.location.replace('/about.html');
  }, []);
  return null;
}

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

function InviteBanner({ onSignUp }: { onSignUp: () => void }) {
  const { user } = useAuth();
  const [visible, setVisible] = useState(() => {
    try { return sessionStorage.getItem(INVITE_BANNER_KEY) === '1'; } catch { return false; }
  });

  useEffect(() => {
    if (user) {
      setVisible(false);
      try { sessionStorage.removeItem(INVITE_BANNER_KEY); } catch { /* ignore */ }
    }
  }, [user]);

  if (!visible || user) return null;

  return (
    <div className="invite-banner">
      <div className="invite-banner-inner">
        <span className="invite-banner-text">
          You were invited to CULTIVE — sign up and you <strong>both get HK$25 credit</strong>
        </span>
        <button className="invite-banner-cta" onClick={onSignUp}>Sign Up</button>
        <button
          className="invite-banner-dismiss"
          onClick={() => {
            setVisible(false);
            try { sessionStorage.removeItem(INVITE_BANNER_KEY); } catch { /* ignore */ }
          }}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function App() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');
  const { unreadCount } = useInbox();
  const { user, loading } = useAuth();
  const appliedRef = useRef(false);
  const autoOpenedRef = useRef(false);

  // Capture ?ref=CODE + UTM params, set the invite banner flag, open the auth modal
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    const utmSource   = params.get('utm_source');
    const utmMedium   = params.get('utm_medium');
    const utmCampaign = params.get('utm_campaign');

    if (ref) {
      try { localStorage.setItem(REF_CODE_KEY, ref); } catch { /* ignore */ }
      try { sessionStorage.setItem(INVITE_BANNER_KEY, '1'); } catch { /* ignore */ }
    }

    // Store UTM / inferred source so sign_up events can report where the user came from.
    // A ?ref= link with no explicit UTM is treated as 'invite'.
    const source = utmSource ?? (ref ? 'invite' : null);
    if (source) {
      try { sessionStorage.setItem('cultive:utm_source', source); } catch { /* ignore */ }
      if (utmMedium)   try { sessionStorage.setItem('cultive:utm_medium', utmMedium); } catch { /* ignore */ }
      if (utmCampaign) try { sessionStorage.setItem('cultive:utm_campaign', utmCampaign); } catch { /* ignore */ }
    }
  }, []);

  // Once auth has resolved: if user is not signed in and came via invite, open the modal once
  useEffect(() => {
    if (loading || user || autoOpenedRef.current) return undefined;
    const hasInvite = (() => {
      try { return sessionStorage.getItem(INVITE_BANNER_KEY) === '1'; } catch { return false; }
    })();
    if (!hasInvite) return undefined;
    autoOpenedRef.current = true;
    const t = setTimeout(() => setIsAuthOpen(true), 700);
    return () => clearTimeout(t);
  }, [loading, user]);

  // When a new user signs up, apply any pending referral code
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user && !appliedRef.current) {
        const code = localStorage.getItem(REF_CODE_KEY);
        if (!code) return;
        const created = new Date(session.user.created_at).getTime();
        if (Date.now() - created > 5 * 60 * 1000) return;
        appliedRef.current = true;
        await applyReferralCode(code);
        try { localStorage.removeItem(REF_CODE_KEY); } catch { /* ignore */ }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="app">
      <ScrollToTop />
      {!isAdminPage && <WebNav setIsAuthOpen={setIsAuthOpen} unreadCount={unreadCount} />}
      {!isAdminPage && <InviteBanner onSignUp={() => setIsAuthOpen(true)} />}

      <Routes>
        <Route path="/" element={<Discover setIsAuthOpen={setIsAuthOpen} />} />
        <Route path="/event/:slug" element={<EventDetail setIsAuthOpen={setIsAuthOpen} />} />
        <Route path="/tickets" element={<Tickets />} />
        <Route path="/submit" element={<Submit />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/saved" element={<Saved />} />
        <Route path="/account" element={<Account setIsAuthOpen={setIsAuthOpen} />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/auth/verify" element={<AuthVerify />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/about" element={<AboutRedirect />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/my-submissions" element={<MySubmissions />} />
        <Route path="/admin/*" element={<Admin />} />
      </Routes>

      {!isAdminPage && <SiteFooter />}
      {!isAdminPage && <TabBar unreadCount={unreadCount} />}

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
}

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
        <Link to="/" className="web-logo">
          <span className="logo-text">CULTIVE</span>
          <span className="logo-sub">文化活</span>
        </Link>

        <nav className="web-nav-links">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `web-nav-link${isActive ? ' active' : ''}`}
            >
              {item.label}
              {item.path === '/inbox' && unreadCount > 0 && (
                <span className="nav-badge">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="web-nav-actions">
          {!loading && isAdmin && (
            <NavLink to="/admin" className="web-nav-link" style={{ marginRight: '8px' }}>
              Admin
            </NavLink>
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

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <span className="site-footer-brand">CULTIVE 文化活</span>
        <div className="site-footer-links">
          <a href="/about" className="site-footer-link">
            About
          </a>
          <a
            href="/partnerships"
            className="site-footer-link"
          >
            Partnerships
          </a>
          <a
            href="https://www.instagram.com/cultive.city/"
            target="_blank"
            rel="noopener noreferrer"
            className="site-footer-link"
            aria-label="Instagram"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <circle cx="12" cy="12" r="4"/>
              <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
            </svg>
            Instagram
          </a>
        </div>
      </div>
    </footer>
  );
}

export default App;
