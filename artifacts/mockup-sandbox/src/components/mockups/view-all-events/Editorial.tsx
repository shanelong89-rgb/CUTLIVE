import { useState } from "react";
import { ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";

const TAGS = ["Art", "Music", "Food", "Film", "Theatre", "Sports", "Kids", "Nightlife", "Talk", "Exhibition"];
const DATE_FILTERS = ["All Dates", "Today", "Tomorrow", "Weekend", "This Week"];

const MOCK_EVENTS = [
  { id: 1, date: "Sat, May 23", time: "7:30 PM", title: "West Kowloon Jazz Night", category: "Music", venue: "Freespace, West Kowloon", district: "West Kowloon", tags: ["Music"], image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=120&h=80&fit=crop" },
  { id: 2, date: "Sat, May 23", time: "2:00 PM", title: "Contemporary Chinese Art Exhibition", category: "Art", venue: "M+, West Kowloon", district: "West Kowloon", tags: ["Art", "Exhibition"], image: "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=120&h=80&fit=crop" },
  { id: 3, date: "Sat, May 23", time: "6:00 PM", title: "Lamma Island Food Walk", category: "Food", venue: "Lamma Island Ferry Pier", district: "Lamma Island", tags: ["Food"], image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=120&h=80&fit=crop" },
  { id: 4, date: "Sun, May 24", time: "3:00 PM", title: "Hong Kong Documentary Film Festival", category: "Film", venue: "Broadway Cinematheque, Yau Ma Tei", district: "Yau Ma Tei", tags: ["Film"], image: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=120&h=80&fit=crop" },
  { id: 5, date: "Sun, May 24", time: "8:00 PM", title: "Electronic Music Night at Garage Society", category: "Nightlife", venue: "Garage Society, Wan Chai", district: "Wan Chai", tags: ["Music", "Nightlife"], image: "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=120&h=80&fit=crop" },
  { id: 6, date: "Mon, May 25", time: "7:00 PM", title: "Cantonese Opera: Dream of the Red Chamber", category: "Theatre", venue: "Xiqu Centre, West Kowloon", district: "West Kowloon", tags: ["Theatre"], image: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=120&h=80&fit=crop" },
  { id: 7, date: "Tue, May 26", time: "12:00 PM", title: "Dim Sum Masterclass", category: "Food", venue: "Hong Kong Culinary Academy, Central", district: "Central", tags: ["Food"], image: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=120&h=80&fit=crop" },
  { id: 8, date: "Wed, May 27", time: "6:30 PM", title: "Hong Kong Philharmonic: Beethoven's 9th", category: "Music", venue: "Hong Kong Cultural Centre, Tsim Sha Tsui", district: "Tsim Sha Tsui", tags: ["Music"], image: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=120&h=80&fit=crop" },
  { id: 9, date: "Thu, May 28", time: "7:00 PM", title: "Startup Founders Talk: Building in Asia", category: "Talk", venue: "HKSTP, Sha Tin", district: "Sha Tin", tags: ["Talk"], image: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=120&h=80&fit=crop" },
  { id: 10, date: "Fri, May 29", time: "9:00 PM", title: "Rooftop Cinema: Blade Runner 2049", category: "Film", venue: "PMQ, Central", district: "Central", tags: ["Film"], image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=120&h=80&fit=crop" },
  { id: 11, date: "Sat, May 30", time: "11:00 AM", title: "Pottery Workshop at PMQ", category: "Art", venue: "PMQ Studio, Central", district: "Central", tags: ["Art"], image: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=120&h=80&fit=crop" },
  { id: 12, date: "Sat, May 30", time: "5:00 PM", title: "Stanley International Dragon Boat", category: "Sports", venue: "Stanley Beach", district: "Stanley", tags: ["Sports"], image: "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=120&h=80&fit=crop" },
];

const PAGE_SIZE = 10;

export function Editorial() {
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [activeDateFilter, setActiveDateFilter] = useState("All Dates");
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
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#fff", color: "#030213", minHeight: "100vh" }}>
      {/* Nav */}
      <nav style={{ borderBottom: "1px solid rgba(0,0,0,0.1)", padding: "0 5vw", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", zIndex: 10 }}>
        <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: "1.1rem", letterSpacing: "0.08em" }}>CULTIVE</span>
        <div style={{ display: "flex", gap: 24, fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4a4a5a" }}>
          <span style={{ color: "#030213", borderBottom: "1px solid #030213", paddingBottom: 2 }}>Discover</span>
          <span>Saved</span>
          <span>Account</span>
        </div>
      </nav>

      {/* Header */}
      <header style={{ padding: "40px 5vw 24px", borderBottom: "2px solid #030213" }}>
        <div style={{ fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#717182", marginBottom: 12 }}>
          Sat, May 23, 2026 · Issue No. 47
        </div>
        <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: "clamp(2.2rem, 5vw, 3.5rem)", lineHeight: 1, marginBottom: 12, letterSpacing: "-0.01em" }}>
          What's On
        </h1>
        <p style={{ color: "#4a4a5a", fontSize: "0.9rem" }}>
          Hong Kong's curated events. What's worth leaving the house for.
        </p>
      </header>

      {/* Date Filter Strip */}
      <div style={{ padding: "12px 5vw 0", borderBottom: "1px solid rgba(0,0,0,0.08)", display: "flex", gap: 4, overflowX: "auto" }}>
        {DATE_FILTERS.map(f => (
          <button key={f} onClick={() => { setActiveDateFilter(f); setCurrentPage(1); }}
            style={{ padding: "7px 14px", borderRadius: 20, border: "1px solid", borderColor: activeDateFilter === f ? "#030213" : "rgba(0,0,0,0.15)", background: activeDateFilter === f ? "#030213" : "transparent", color: activeDateFilter === f ? "#fff" : "#4a4a5a", fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.06em", whiteSpace: "nowrap", cursor: "pointer", marginBottom: 12 }}>
            {f}
          </button>
        ))}
      </div>

      {/* Tag Filter Strip */}
      <div style={{ padding: "12px 5vw 0", borderBottom: "1px solid rgba(0,0,0,0.08)", display: "flex", gap: 4, overflowX: "auto" }}>
        <button onClick={() => { setActiveTags([]); setCurrentPage(1); }}
          style={{ padding: "7px 14px", borderRadius: 20, border: "1px solid", borderColor: activeTags.length === 0 ? "#030213" : "rgba(0,0,0,0.15)", background: activeTags.length === 0 ? "#030213" : "transparent", color: activeTags.length === 0 ? "#fff" : "#4a4a5a", fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.06em", whiteSpace: "nowrap", cursor: "pointer", marginBottom: 12 }}>
          All
        </button>
        {TAGS.map(tag => (
          <button key={tag} onClick={() => toggleTag(tag)}
            style={{ padding: "7px 14px", borderRadius: 20, border: "1px solid", borderColor: activeTags.includes(tag) ? "#030213" : "rgba(0,0,0,0.15)", background: activeTags.includes(tag) ? "#030213" : "transparent", color: activeTags.includes(tag) ? "#fff" : "#4a4a5a", fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.06em", whiteSpace: "nowrap", cursor: "pointer", marginBottom: 12 }}>
            {tag}
          </button>
        ))}
      </div>

      {/* Section Header */}
      <div style={{ padding: "16px 5vw", borderBottom: "1px solid rgba(0,0,0,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.6rem", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "#030213" }}>
          {activeTags.length === 0 ? "All Events" : activeTags.join(" · ")}
        </span>
        <span style={{ fontSize: "0.6rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#717182" }}>
          {filtered.length} events · Page {currentPage} of {totalPages}
        </span>
      </div>

      {/* Event List */}
      <div>
        {pageEvents.map((event, i) => (
          <div key={event.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 5vw", cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f8f8f8")}
              onMouseLeave={e => (e.currentTarget.style.background = "")}>
              <div style={{ width: 70, flexShrink: 0 }}>
                <div style={{ fontSize: "0.65rem", fontWeight: 600, color: "#030213", lineHeight: 1.3 }}>{event.date}</div>
                <div style={{ fontSize: "0.65rem", color: "#717182", marginTop: 2 }}>{event.time}</div>
              </div>
              <div style={{ width: 72, height: 52, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "#f0f0f0" }}>
                <img src={event.image} alt={event.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#030213", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{event.title}</div>
                <div style={{ fontSize: "0.72rem", color: "#717182", marginTop: 3 }}>{event.category} · {event.district}</div>
                <div style={{ fontSize: "0.65rem", color: "#717182", marginTop: 2 }}>{event.venue}</div>
              </div>
              <ArrowUpRight size={14} color="#717182" style={{ flexShrink: 0 }} />
            </div>
            {i < pageEvents.length - 1 && <div style={{ height: 1, background: "rgba(0,0,0,0.07)", margin: "0 5vw" }} />}
          </div>
        ))}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 5vw", borderTop: "1px solid rgba(0,0,0,0.1)", marginTop: 8 }}>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", border: "1px solid rgba(0,0,0,0.15)", borderRadius: 4, background: "transparent", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: currentPage === 1 ? "#ccc" : "#030213", cursor: currentPage === 1 ? "default" : "pointer" }}>
            <ChevronLeft size={14} /> Prev
          </button>
          <div style={{ display: "flex", gap: 6 }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button key={n} onClick={() => setCurrentPage(n)}
                style={{ width: 32, height: 32, borderRadius: 4, border: "1px solid", borderColor: n === currentPage ? "#030213" : "rgba(0,0,0,0.15)", background: n === currentPage ? "#030213" : "transparent", color: n === currentPage ? "#fff" : "#4a4a5a", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}>
                {n}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", border: "1px solid rgba(0,0,0,0.15)", borderRadius: 4, background: "transparent", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: currentPage === totalPages ? "#ccc" : "#030213", cursor: currentPage === totalPages ? "default" : "pointer" }}>
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
