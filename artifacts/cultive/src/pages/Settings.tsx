import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAgentPreferences } from '../hooks/useAgentPreferences';
import { getLinkedWhatsApp } from '../lib/supabase';
import { CATEGORY_LABELS } from '../data/events';

const WA_NUMBER = '85255271026';
const WA_QUIZ_URL = `https://wa.me/${WA_NUMBER}?text=/quiz`;

function TagPill({ label }: { label: string }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: 99,
      border: '1px solid var(--n-border)',
      fontSize: '0.78rem',
      fontWeight: 600,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      color: 'var(--n-muted)',
      background: 'var(--n-bg-soft, #f8f8f7)',
      margin: '3px 4px 3px 0',
    }}>
      {label}
    </span>
  );
}

export function Settings({ setIsAuthOpen }: { setIsAuthOpen?: (open: boolean) => void }) {
  const { user, loading: authLoading } = useAuth();
  const { preferences, loading: prefsLoading } = useAgentPreferences();
  const [waPhone, setWaPhone] = useState<string | null>(null);
  const [waLoading, setWaLoading] = useState(false);

  useEffect(() => {
    if (!user) { setWaPhone(null); return; }
    let active = true;
    setWaLoading(true);
    getLinkedWhatsApp().then(phone => {
      if (active) { setWaPhone(phone); setWaLoading(false); }
    });
    return () => { active = false; };
  }, [user?.id]);

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="account-page">
        <div className="account-card">
          <div className="account-section-head">
            <span className="account-section-label">— SETTINGS —</span>
          </div>
          <p className="account-meta-value" style={{ marginTop: 16 }}>
            Sign in to view your settings.
          </p>
          <button
            className="account-cta"
            style={{ marginTop: 20 }}
            onClick={() => setIsAuthOpen?.(true)}
          >
            Sign In / Sign Up
          </button>
        </div>
      </div>
    );
  }

  const loading = prefsLoading || waLoading;

  return (
    <div className="account-page">
      <div className="account-card">

        {/* WhatsApp connection */}
        <div className="account-section-head">
          <span className="account-section-label">— WHATSAPP —</span>
        </div>
        <div className="account-invite-panel">
          {waLoading ? (
            <p className="account-meta-value" style={{ color: 'var(--n-muted)' }}>Loading…</p>
          ) : waPhone ? (
            <>
              <p className="account-invite-desc">
                ✓ Connected — <strong>{waPhone}</strong>
              </p>
              <p className="account-invite-desc" style={{ marginTop: 6, color: 'var(--n-muted)', fontSize: '0.85rem' }}>
                We'll text you curated picks. Reply anytime to chat.
              </p>
            </>
          ) : (
            <>
              <p className="account-invite-desc">No WhatsApp number linked yet.</p>
              <a href="/account" className="account-invite-copy" style={{ display: 'inline-block', marginTop: 10 }}>
                Link in Account →
              </a>
            </>
          )}
        </div>

        {/* Taste profile */}
        <div className="account-section-head" style={{ marginTop: 24 }}>
          <span className="account-section-label">— TASTE PROFILE —</span>
        </div>
        <div className="account-invite-panel">
          {loading ? (
            <p className="account-meta-value" style={{ color: 'var(--n-muted)' }}>Loading…</p>
          ) : !preferences ? (
            <>
              <p className="account-invite-desc">
                No preferences yet — complete the quiz on WhatsApp to personalise your feed.
              </p>
              <a
                href={WA_QUIZ_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="account-invite-copy"
                style={{ display: 'inline-block', marginTop: 10 }}
              >
                Take the quiz on WhatsApp →
              </a>
            </>
          ) : (
            <>
              {preferences.canonicalCategories.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <p className="account-meta-key" style={{ marginBottom: 6 }}>Categories</p>
                  <div>
                    {preferences.canonicalCategories.map(id => (
                      <TagPill key={id} label={CATEGORY_LABELS[id] ?? id} />
                    ))}
                  </div>
                </div>
              )}

              {preferences.raw.explicit_interests.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <p className="account-meta-key" style={{ marginBottom: 6 }}>Interests</p>
                  <div>
                    {preferences.raw.explicit_interests.map(tag => (
                      <TagPill key={tag} label={tag} />
                    ))}
                  </div>
                </div>
              )}

              {preferences.raw.vibe_tags.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <p className="account-meta-key" style={{ marginBottom: 6 }}>Vibes</p>
                  <div>
                    {preferences.raw.vibe_tags.map(tag => (
                      <TagPill key={tag} label={tag} />
                    ))}
                  </div>
                </div>
              )}

              <a
                href={WA_QUIZ_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="account-invite-copy"
                style={{ display: 'inline-block', marginTop: 4 }}
              >
                Retake quiz →
              </a>
            </>
          )}
        </div>

        {/* Back link */}
        <div style={{ marginTop: 32 }}>
          <a href="/account" className="account-invite-copy" style={{ display: 'inline-block' }}>
            ← Back to Account
          </a>
        </div>

      </div>
    </div>
  );
}
