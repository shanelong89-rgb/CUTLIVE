import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getEvents, type Event } from '../lib/supabase';

type Stats = {
  events: number;
  categories: number;
  districts: number;
};

function computeStats(events: Event[]): Stats {
  const categories = new Set(events.map(e => e.category).filter(Boolean));
  const districts = new Set(
    events
      .map(e => (e.district || e.venue?.split(',')[0] || '').trim().toLowerCase())
      .filter(Boolean),
  );
  return { events: events.length, categories: categories.size, districts: districts.size };
}

const TEAM = [
  {
    name: 'Shane',
    role: 'Founder & Curation',
    bio: 'Started CULTIVE after one too many "wait, that was last night?" moments. Hand-reviews every event before it goes live.',
  },
  {
    name: 'Eugene',
    role: 'Community & Partnerships',
    bio: 'The connector. Works with venues, collectives, and organisers across Hong Kong to surface events you won\'t find anywhere else.',
  },
  {
    name: 'Andy',
    role: 'Product & Engineering',
    bio: 'Builds the thing you\'re looking at. Obsessed with making event discovery feel effortless on a phone at 11pm.',
  },
  {
    name: 'William',
    role: 'Editorial & Content',
    bio: 'Writes the words, checks the details, and makes sure every listing tells you exactly why a night is worth leaving the house for.',
  },
];

export function About() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    document.title = 'About | CULTIVE';
    let cancelled = false;
    getEvents((fresh) => {
      if (!cancelled) setStats(computeStats(fresh));
    }).then((data) => {
      if (!cancelled) setStats(computeStats(data));
    });
    return () => {
      cancelled = true;
      document.title = 'CULTIVE | 文化活';
    };
  }, []);

  return (
    <div className="page about-page">
      <div className="page-header">
        <h1>About CULTIVE</h1>
        <p className="about-tagline">
          Hong Kong's curated cultural calendar — every event reviewed by a real person.
        </p>
      </div>

      <section className="about-section">
        <p className="about-lead">
          CULTIVE (文化活) exists because the best nights in Hong Kong are the hardest to find.
          They live on Instagram stories, in group chats, on posters taped to Sheung Wan lamp posts.
          We track them down, verify the details, and put them all in one place — so you never
          find out about the perfect event the morning after.
        </p>
      </section>

      <section className="about-section">
        <h2 className="about-heading">CULTIVE right now</h2>
        <div className="about-stats" aria-live="polite">
          <div className="about-stat">
            <span className="about-stat-num">{stats ? stats.events : '—'}</span>
            <span className="about-stat-label">Events curated</span>
          </div>
          <div className="about-stat">
            <span className="about-stat-num">{stats ? stats.categories : '—'}</span>
            <span className="about-stat-label">Categories</span>
          </div>
          <div className="about-stat">
            <span className="about-stat-num">{stats ? stats.districts : '—'}</span>
            <span className="about-stat-label">Districts covered</span>
          </div>
        </div>
      </section>

      <section className="about-section">
        <h2 className="about-heading">The team</h2>
        <div className="about-team">
          {TEAM.map(member => (
            <div key={member.name} className="about-member">
              <div className="about-member-avatar" aria-hidden="true">
                {member.name.charAt(0)}
              </div>
              <div>
                <h3 className="about-member-name">{member.name}</h3>
                <p className="about-member-role">{member.role}</p>
                <p className="about-member-bio">{member.bio}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="about-section">
        <h2 className="about-heading">Get in touch</h2>
        <div className="about-contact">
          <a
            className="about-contact-link"
            href="https://wa.me/85255271026"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
            </svg>
            WhatsApp us
          </a>
          <a
            className="about-contact-link"
            href="https://www.instagram.com/cultive.city/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <circle cx="12" cy="12" r="4"/>
              <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
            </svg>
            @cultive.city
          </a>
          <Link className="about-contact-link" to="/submit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Submit an event
          </Link>
        </div>
      </section>
    </div>
  );
}
