export function Tickets() {
  return (
    <div className="tickets-page">
      <div className="submit-header">
        <h1>Tickets</h1>
        <p>Your reservations and entry passes</p>
      </div>

      <div className="coming-soon-card">
        <div className="coming-soon-eyebrow">Coming Soon</div>
        <h2 className="coming-soon-title">Ticketing is on the way</h2>
        <p className="coming-soon-body">
          Soon you'll be able to reserve spots, hold members-only passes, and
          show a QR code at the door — all from this screen.
        </p>
        <ul className="coming-soon-list">
          <li>Reserve & pay for events in-app</li>
          <li>Members-only access to exclusive drops</li>
          <li>QR check-in at the venue</li>
          <li>Past tickets & receipts in one place</li>
        </ul>
      </div>
    </div>
  );
}
