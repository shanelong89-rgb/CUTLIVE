import { useState } from "react";

const CATEGORIES: { id: string; label: string; subTags: { id: string; label: string; count: number }[] }[] = [
  {
    id: "music", label: "Music",
    subTags: [
      { id: "jazz", label: "Jazz", count: 14 },
      { id: "live-music", label: "Live Music", count: 22 },
      { id: "hip-hop", label: "Hip-Hop", count: 6 },
      { id: "vinyl", label: "Vinyl", count: 4 },
      { id: "indie", label: "Indie", count: 8 },
    ],
  },
  {
    id: "electronic", label: "Electronic",
    subTags: [
      { id: "techno", label: "Techno", count: 18 },
      { id: "house", label: "House", count: 12 },
      { id: "dj", label: "DJ Sets", count: 16 },
      { id: "club-night", label: "Club Night", count: 9 },
    ],
  },
  {
    id: "art", label: "Art",
    subTags: [
      { id: "exhibition", label: "Exhibition", count: 26 },
      { id: "contemporary", label: "Contemporary", count: 11 },
      { id: "performance", label: "Performance", count: 7 },
      { id: "sculpture", label: "Sculpture", count: 3 },
    ],
  },
  {
    id: "nightlife", label: "Nightlife",
    subTags: [
      { id: "party", label: "Party", count: 15 },
      { id: "underground", label: "Underground", count: 5 },
      { id: "rooftop", label: "Rooftop", count: 6 },
    ],
  },
  {
    id: "food-drink", label: "Food & Drink",
    subTags: [
      { id: "cocktails", label: "Cocktails", count: 10 },
      { id: "wine", label: "Wine", count: 7 },
      { id: "tasting", label: "Tasting", count: 5 },
    ],
  },
  {
    id: "market", label: "Market",
    subTags: [
      { id: "pop-up", label: "Pop-Up", count: 9 },
      { id: "vintage", label: "Vintage", count: 4 },
    ],
  },
  {
    id: "community", label: "Community",
    subTags: [
      { id: "festival", label: "Festival", count: 8 },
      { id: "free", label: "Free Entry", count: 13 },
      { id: "workshop", label: "Workshop", count: 11 },
    ],
  },
];

const EVENTS = [
  { title: "Blue Note Sessions: HK Jazz Collective", date: "Thu, Jul 23", district: "Central", tags: ["jazz"] },
  { title: "Warehouse Frequencies 004", date: "Fri, Jul 24", district: "Kwun Tong", tags: ["techno"] },
  { title: "Ink & Motion — New Media Exhibition", date: "Until Aug 30", district: "West Kowloon", tags: ["exhibition"] },
  { title: "Rooftop Vinyl Sundown", date: "Sat, Jul 25", district: "Sheung Wan", tags: ["vinyl", "dj"] },
  { title: "Natural Wine Fair", date: "Sat, Jul 25", district: "Wan Chai", tags: ["wine"] },
  { title: "Sham Shui Po Night Market Pop-Up", date: "Sun, Jul 26", district: "Sham Shui Po", tags: ["pop-up"] },
];

export function FilterDefault({
  initialCategory = null,
  initialTag = null,
}: {
  initialCategory?: string | null;
  initialTag?: string | null;
}) {
  const [openCategory, setOpenCategory] = useState<string | null>(initialCategory);
  const [activeTag, setActiveTag] = useState<string | null>(initialTag);

  const open = CATEGORIES.find(c => c.id === openCategory) ?? null;
  const activeCategoryOfTag = CATEGORIES.find(c => c.subTags.some(t => t.id === activeTag))?.id ?? null;

  const filtered = activeTag
    ? EVENTS.filter(e => e.tags.includes(activeTag))
    : open
      ? EVENTS.filter(e => e.tags.some(t => open.subTags.some(s => s.id === t)))
      : EVENTS;

  const pill = (active: boolean): string =>
    `shrink-0 rounded-full border px-4 py-2 text-[10px] font-medium uppercase tracking-[0.08em] transition-all duration-150 cursor-pointer ${
      active
        ? "bg-black text-white border-black"
        : "bg-transparent text-neutral-500 border-neutral-200 hover:border-black hover:text-black"
    }`;

  return (
    <div className="min-h-screen bg-white text-neutral-900" style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
      <div className="mx-auto max-w-[900px] px-8 pt-12">
        <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-400">Discover</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">This week in Hong Kong</h1>

        {/* Top row: ALL + categories */}
        <div className="mt-8 flex gap-2 overflow-x-auto border-b border-neutral-100 pb-5 [scrollbar-width:none]">
          <button
            className={pill(openCategory === null && activeTag === null)}
            onClick={() => { setOpenCategory(null); setActiveTag(null); }}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={pill(openCategory === cat.id || activeCategoryOfTag === cat.id)}
              onClick={() => {
                if (openCategory === cat.id) { setOpenCategory(null); setActiveTag(null); }
                else { setOpenCategory(cat.id); setActiveTag(null); }
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Expanded row: sub-tags with counts */}
        <div
          className="overflow-hidden transition-all duration-300 ease-out"
          style={{ maxHeight: open ? 72 : 0, opacity: open ? 1 : 0 }}
        >
          {open && (
            <div className="flex gap-2 overflow-x-auto border-b border-neutral-100 py-4 [scrollbar-width:none]">
              {open.subTags.map(tag => (
                <button
                  key={tag.id}
                  className={pill(activeTag === tag.id)}
                  onClick={() => setActiveTag(prev => (prev === tag.id ? null : tag.id))}
                >
                  {tag.label}
                  <span className={activeTag === tag.id ? "ml-1.5 opacity-50" : "ml-1.5 opacity-40"}>{tag.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Section header */}
        <div className="mt-8 flex items-center justify-between text-[11px] uppercase tracking-[0.15em] text-neutral-400">
          <span>
            {activeTag
              ? `${open?.label ?? ""} · ${open?.subTags.find(t => t.id === activeTag)?.label ?? activeTag}`
              : open ? open.label : "All Events"}
          </span>
          <span>{filtered.length} events</span>
        </div>

        {/* Event list */}
        <div className="mt-4 divide-y divide-neutral-100">
          {filtered.length === 0 && (
            <p className="py-10 text-sm text-neutral-400">No events match this tag yet — check back soon.</p>
          )}
          {filtered.map(e => (
            <div key={e.title} className="group flex items-baseline justify-between gap-6 py-5 cursor-pointer">
              <div>
                <p className="text-base font-medium transition-transform duration-300 group-hover:translate-x-1">{e.title}</p>
                <p className="mt-1 text-[12px] text-neutral-400">{e.date} · {e.district}</p>
              </div>
              <span className="text-[11px] uppercase tracking-[0.1em] text-neutral-300 transition-colors group-hover:text-black">View →</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
