interface AccountProps {
  setIsAuthOpen?: (open: boolean) => void;
}

export function Account({ setIsAuthOpen }: AccountProps) {
  const isLoggedIn = false; // Mock auth state

  const menuItems = [
    { icon: '👤', label: 'Edit Profile' },
    { icon: '👑', label: 'Membership' },
    { icon: '💳', label: 'Payment Methods' },
    { icon: '📋', label: 'My Submissions' },
    { icon: '👥', label: 'Invite Friends' },
    { icon: '⚙️', label: 'Settings' },
    { icon: '💚', label: 'Help & Support' },
  ];

  return (
    <div className="account-page">
      <div className="account-header">
        <div className="account-avatar">
          {isLoggedIn ? '😎' : '👤'}
        </div>
        <h1 className="account-name">{isLoggedIn ? 'Jane Smith' : 'Guest User'}</h1>
        <p className="account-status">
          {isLoggedIn ? 'Premium Member' : 'Sign in to access exclusive events'}
        </p>
        
        {!isLoggedIn && (
          <button
            onClick={() => setIsAuthOpen?.(true)}
            style={{
              marginTop: '24px',
              padding: '14px 36px',
              background: 'var(--n-text)',
              border: 'none',
              borderRadius: '4px',
              color: 'var(--n-bg)',
              fontSize: '0.85rem',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
          >
            Sign In / Sign Up
          </button>
        )}
      </div>

      <div className="account-menu">
        {menuItems.map((item, index) => (
          <button
            key={index}
            className="account-menu-item"
          >
            <span className="account-menu-icon">{item.icon}</span>
            <span>{item.label}</span>
            <span className="account-menu-arrow">›</span>
          </button>
        ))}
      </div>

      <p className="account-footer">
        CULTIVE v1.0.0 · Made with ❤️ in Hong Kong
      </p>
    </div>
  );
}
