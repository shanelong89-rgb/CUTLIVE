import { useState } from 'react';

interface Message {
  id: number;
  title: string;
  preview: string;
  time: string;
  unread: boolean;
}

export function Inbox() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      title: 'Welcome to CULTIVE! 🎉',
      preview: 'Your curated guide to Hong Kong\'s best events starts now...',
      time: '2h ago',
      unread: true
    },
    {
      id: 2,
      title: 'Your Jazz Night RSVP confirmed',
      preview: 'Show your QR code at The Peninsula entrance. See you there!',
      time: '1d ago',
      unread: false
    },
    {
      id: 3,
      title: 'New exclusive: Hidden Speakeasy Tour',
      preview: 'Members-only access to 4 secret bars in Central. Limited spots...',
      time: '2d ago',
      unread: false
    },
    {
      id: 4,
      title: 'Payment received: $50 HKD',
      preview: 'Thanks for submitting "Street Art Workshop" - it\'s now live!',
      time: '3d ago',
      unread: false
    }
  ]);

  const unreadCount = messages.filter(m => m.unread).length;

  const markAsRead = (id: number) => {
    setMessages(messages.map(m => m.id === id ? { ...m, unread: false } : m));
  };

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1>Inbox</h1>
          {unreadCount > 0 && (
            <span className="badge">{unreadCount}</span>
          )}
        </div>
        <p>Updates, confirmations, and exclusive invites</p>
      </div>

      <div className="inbox-list">
        {messages.length === 0 ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/>
            </svg>
            <p>No messages yet</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`message-card ${msg.unread ? 'unread' : ''}`}
              onClick={() => markAsRead(msg.id)}
            >
              <div className="message-header">
                <h3 className="message-title">{msg.title}</h3>
                <span className="message-time">{msg.time}</span>
              </div>
              <p className="message-preview">{msg.preview}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
