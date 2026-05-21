import { useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, Clock, Tag } from "lucide-react";

const TAGS = ["Art", "Music", "Food", "Film", "Theatre", "Sports", "Kids", "Nightlife", "Talk", "Exhibition"];
const DATE_FILTERS = ["All", "Today", "Tomorrow", "Weekend", "This Week"];

const MOCK_EVENTS = [
  { id: 1, date: "Sat, May 23", time: "7:30 PM", title: "West Kowloon Jazz Night", category: "Music", venue: "Freespace", district: "West Kowloon", tags: ["Music"], image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=240&fit=crop", exclusive: false },
  { id: 2, date: "Sat, May 23", time: "2:00 PM", title: "Contemporary Chinese Art Exhibition", category: "Art", venue: "M+", district: "West Kowloon", tags: ["Art", "Exhibition"], image: "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=400&h=240&fit=crop", exclusive: true },
  { id: 3, date: "Sat, May 23", time: "6:00 PM", title: "Lamma Island Food Walk", category: "Food", venue: "Lamma Ferry Pier", district: "Lamma Island", tags: ["Food"], image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=240&fit=crop", exclusive: false },
  { id: 4, date: "Sun, May 24", time: "3:00 PM", title: "Hong Kong Documentary Film Festival", category: "Film", venue: "Broadway Cinematheque", district: "Yau Ma Tei", tags: ["Film"], image: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&h=240&fit=crop", exclusive: false },
  { id: 5, date: "Sun, May 24", time: "8:00 PM", title: "Electronic Music Night at Garage Society", category: "Nightlife", venue: "Garage Society", district: "Wan Chai", tags: ["Music", "Nightlife"], image: "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=400&h=240&fit=crop", exclusive: false },
  { id: 6, date: "Mon, May 25", time: "7:00 PM", title: "Cantonese Opera: Dream of the Red Chamber", category: "Theatre", venue: "Xiqu Centre", district: "West Kowloon", tags: ["Theatre"], image: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=400&h=240&fit=crop", exclusive: true },
  { id: 7, date: "Tue, May 26", time: "12:00 PM", title: "Dim Sum Masterclass", category: "Food", venue: "HK Culinary Academy", district: "Central", tags: ["Food"], image: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&h=240&fit=crop", exclusive: false },
  { id: 8, date: "Wed, May 27", time: "6:30 PM", title: "Hong Kong Philharmonic: Beethoven's 9th", category: "Music", venue: "HK Cultural Centre", district: "Tsim Sha Tsui", tags: ["Music"], image: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=400&h=240&fit=crop", exclusive: false },
  { id: 9, date: "Thu, May 28", time: "7:00 PM", title: "Startup Founders Talk: Building in Asia", category: "Talk", venue: "HKSTP", district: "Sha Tin", tags: ["Talk"], image: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=400&h=240&fit=crop", exclusive: false },
  { id: 10, date: "Fri, May 29", time: "9:00 PM", title: "Rooftop Cinema: Blade Runner 2049", category: "Film", venue: "PMQ, Central", district: "Central", tags: ["Film"], image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=240&fit=crop", exclusive: false },
  { id: 11, date: "Sat, May 30", time: "11:00 AM", title: "Pottery Workshop at PMQ", category: "Art", venue: "PMQ Studio", district: "Central", tags: ["Art"], image: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=240&fit=crop", exclusive: false },
  { id: 12, date: "Sat, May 30", time: "5:00 PM", title: "Stanley Dragon Boat Festival", category: "Sports", venue: "Stanley Beach", district: "Stanley", tags: ["Sports"], image: "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400&h=240&fit=crop", exclusive: false },
];

const PAGE_SIZE = 9;

const TAG_COLORS: Record<string, string> = {
  Music: "#e8f4fd", Art: "#fdf4e8", Food: "#e8fdf0", Film: "#f4e8fd",
  Theatre: "#fde8e8", Sports: "#e8fde8", Nightlife: "#1a1a2e", Talk: "#f0f0f0", Exhibition: "#fff3e0",
};

export function CardGrid() {
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [activeDateFilter, setActiveDateFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = MOCK_EVENTS.filter(e =>
    activeTags.length === 0 || e.tags.some(t => activeTags.includes(t))
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageEvents = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function toggleTag(tag: string) {
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    setCurrentPage(1);
  }

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#f8f8f8", color: "#030213", minHeight: "100vh" }}>
      {/* Nav */}
      <nav style={{ borderBottom: "1px solid rgba(0,0,0,0.1)", padding: "0 5vw", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", zIndex: 10 }}>
        <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: "1.1rem", letterSpacing: "0.08em" }}>CULTIVE</span>
        <div style={{ display: "flex", gap: 24, fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4a4a5a" }}>
          <span style={{ color: "#030213", borderBottom: "1px solid #030213", paddingBottom: 2 }}>Discover</span>
          <span>Saved</span>
          <span>Account</span>
        </div>
      </nav>

      {/* Filters bar */}
      <div style={{ background: "#fff", borderBottom: "1px solid rgba(0,0,0,0.08)", padding: "14px 5vw", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        {/* Date pills */}
        <div style={{ display: "flex", gap: 4 }}>
          {DATE_FILTERS.map(f => (
            <button key={f} onClick={() => { setActiveDateFilter(f); setCurrentPage(1); }}
              style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid", borderColor: activeDateFilter === f ? "#030213" : "rgba(0,0,0,0.15)", background: activeDateFilter === f ? "#030213" : "transparent", color: activeDateFilter === f ? "#fff" : "#4a4a5a", fontSize: "0.72rem", fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>
              {f}
            </button>
          ))}
        </div>
        <div style={{ width: 1, height: 24, background: "rgba(0,0,0,0.12)" }} />
        {/* Tag pills */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {TAGS.map(tag => (
            <button key={tag} onClick={() => toggleTag(tag)}
              style={{ padding: "6px 12px", borderRadius: 20, border: "1px solid", borderColor: activeTags.includes(tag) ? "#030213" : "rgba(0,0,0,0.15)", background: activeTags.includes(tag) ? "#030213" : "transparent", color: activeTags.includes(tag) ? "#fff" : "#4a4a5a", fontSize: "0.7rem", fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Results header */}
      <div style={{ padding: "20px 5vw 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: "1.3rem", letterSpacing: "-0.01em" }}>
          {activeTags.length === 0 ? "All Events" : activeTags.join(" & ")}
        </h2>
        <span style={{ fontSize: "0.75rem", color: "#717182" }}>{filtered.length} events</span>
      </div>

      {/* Card Grid */}
      <div style={{ padding: "0 5vw 32px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {pageEvents.map(event => (
          <div key={event.id}
            style={{ background: "#fff", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(0,0,0,0.07)", cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = ""; }}>
            {/* Image */}
            <div style={{ position: "relative", height: 160, overflow: "hidden", background: "#e9ebef" }}>
              <img src={event.image} alt={event.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              {event.exclusive && (
                <div style={{ position: "absolute", top: 10, right: 10, background: "#030213", color: "#fff", fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", padding: "3px 8px", borderRadius: 3 }}>
                  Members
                </div>
              )}
              <div style={{ position: "absolute", top: 10, left: 10, background: TAG_COLORS[event.category] || "#fff", color: event.category === "Nightlife" ? "#fff" : "#030213", fontSize: "0.6rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "3px 8px", borderRadius: 3 }}>
                {event.category}
              </div>
            </div>
            {/* Content */}
            <div style={{ padding: "14px 16px 16px" }}>
              <div style={{ fontSize: "0.65rem", color: "#717182", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6, display: "flex", gap: 12 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={10} />{event.date}</span>
                <span>{event.time}</span>
              </div>
              <h3 style={{ fontSize: "0.9rem", fontWeight: 700, lineHeight: 1.35, marginBottom: 8, color: "#030213" }}>{event.title}</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.7rem", color: "#717182" }}>
                <MapPin size={10} />{event.venue} · {event.district}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "8px 5vw 40px", borderTop: "1px solid rgba(0,0,0,0.08)" }}>
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "10px 18px", border: "1px solid rgba(0,0,0,0.15)", borderRadius: 6, background: "transparent", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: currentPage === 1 ? "#ccc" : "#030213", cursor: currentPage === 1 ? "default" : "pointer" }}>
            <ChevronLeft size={14} /> Prev
          </button>
          <div style={{ display: "flex", gap: 4 }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button key={n} onClick={() => setCurrentPage(n)}
                style={{ width: 36, height: 36, borderRadius: 6, border: "1px solid", borderColor: n === currentPage ? "#030213" : "rgba(0,0,0,0.15)", background: n === currentPage ? "#030213" : "#fff", color: n === currentPage ? "#fff" : "#4a4a5a", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}>
                {n}
              </button>
            ))}
          </div>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "10px 18px", border: "1px solid rgba(0,0,0,0.15)", borderRadius: 6, background: "transparent", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: currentPage === totalPages ? "#ccc" : "#030213", cursor: currentPage === totalPages ? "default" : "pointer" }}>
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
