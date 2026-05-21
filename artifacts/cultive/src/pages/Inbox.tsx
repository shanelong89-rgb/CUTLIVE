import { Link, useNavigate } from 'react-router-dom';
import { useInboxMessages } from '../hooks/useInboxMessages';

export function Inbox() {
  const { messages, unreadCount, loading, signedIn, markRead, markAllRead } =
    useInboxMessages();
  const navigate = useNavigate();

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1>Inbox</h1>
          {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
        </div>
        <p>Updates on your submissions and CULTIVE news</p>
        {signedIn && messages.length > 0 && unreadCount > 0 && (
          <button className="inbox-mark-all" onClick={markAllRead}>
            Mark all as read
          </button>
        )}
      </div>

      {!signedIn ? (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/>
          </svg>
          <p>Sign in to see your inbox</p>
          <Link to="/account" className="inbox-cta-link">Go to account →</Link>
        </div>
      ) : loading ? (
        <div className="empty-state"><p>Loading…</p></div>
      ) : messages.length === 0 ? (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/>
          </svg>
          <p>No messages yet</p>
          <Link to="/submit" className="inbox-cta-link">Submit an event →</Link>
        </div>
      ) : (
        <div className="inbox-list">
          {messages.map((msg) => {
            const isSoon = msg.kind === 'saved-reminder-soon';
            const cardClass = `message-card ${msg.unread ? 'unread' : ''}`;

            const inner = (
              <>
                <div className="message-header">
                  <h3 className="message-title">{msg.title}</h3>
                  <span className="message-time">{msg.time}</span>
                </div>
                <p className="message-preview">{msg.preview}</p>
                {isSoon && msg.mapsUrl && (
                  <a
                    href={msg.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inbox-maps-btn"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Get directions →
                  </a>
                )}
              </>
            );

            if (isSoon) {
              return (
                <div
                  key={msg.id}
                  className={cardClass}
                  onClick={() => {
                    markRead(msg.id);
                    if (msg.linkTo) navigate(msg.linkTo);
                  }}
                >
                  {inner}
                </div>
              );
            }

            if (msg.linkTo) {
              return (
                <Link
                  key={msg.id}
                  to={msg.linkTo}
                  className={cardClass}
                  style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                  onClick={() => markRead(msg.id)}
                >
                  {inner}
                </Link>
              );
            }

            return (
              <div
                key={msg.id}
                className={cardClass}
                onClick={() => markRead(msg.id)}
              >
                {inner}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
