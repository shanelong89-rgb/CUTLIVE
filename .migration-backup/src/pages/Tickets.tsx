import { mockEvents } from '../data/events';

export function Tickets() {
  // Mock ticket data
  const myTickets = [
    {
      event: mockEvents[0],
      ticketId: 'CULT-240520-001',
      status: 'active',
      qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=CULT-240520-001'
    },
    {
      event: mockEvents[2],
      ticketId: 'CULT-240522-002',
      status: 'active',
      qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=CULT-240522-002'
    }
  ];

  const pastTickets = [
    {
      event: mockEvents[4],
      ticketId: 'CULT-240515-003',
      status: 'used',
      date: 'May 15, 2024'
    }
  ];

  return (
    <div className="tickets-page">
      <div className="submit-header">
        <h1>My Tickets</h1>
        <p>Show QR code at the door for entry</p>
      </div>

      <h3 style={{ marginBottom: '16px', fontSize: '15px', color: 'var(--text-secondary)' }}>Upcoming Events</h3>

      {myTickets.map((ticket) => (
        <div key={ticket.ticketId} className="ticket-card">
          <div className="ticket-header">
            <img src={ticket.event.image} alt={ticket.event.title} className="ticket-image" />
            <div className="ticket-info">
              <h3>{ticket.event.title}</h3>
              <p>{ticket.event.date} • {ticket.event.time}</p>
              <p>{ticket.event.venue}</p>
              <span className={`ticket-status ${ticket.status}`}>
                {ticket.status === 'active' ? '✓ Confirmed' : 'Used'}
              </span>
            </div>
          </div>
          <div style={{ padding: '16px', textAlign: 'center', borderTop: '1px dashed var(--card-hover)' }}>
            <img 
              src={ticket.qrCode} 
              alt="QR Code" 
              style={{ width: '150px', height: '150px', borderRadius: '8px' }}
            />
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
              {ticket.ticketId}
            </p>
          </div>
        </div>
      ))}

      <h3 style={{ margin: '32px 0 16px', fontSize: '15px', color: 'var(--text-secondary)' }}>Past Events</h3>

      {pastTickets.map((ticket) => (
        <div key={ticket.ticketId} className="ticket-card" style={{ opacity: 0.6 }}>
          <div className="ticket-header">
            <img src={ticket.event.image} alt={ticket.event.title} className="ticket-image" />
            <div className="ticket-info">
              <h3>{ticket.event.title}</h3>
              <p>{ticket.date}</p>
              <span className="ticket-status" style={{ background: 'var(--card-hover)', color: 'var(--text-secondary)' }}>
                Attended
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}