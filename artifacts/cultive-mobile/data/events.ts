export type Event = {
  id: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  image: string;
  category: string;
  price: string;
  description: string;
  isExclusive?: boolean;
  is_exclusive?: boolean;
  district?: string;
};

export const mockEvents: Event[] = [
  {
    id: "event-001",
    title: "Mihn x Heza: A Weekend of Techno",
    date: "Today, May 20",
    time: "11:00 PM",
    venue: "Mihn Club, Wan Chai",
    image:
      "https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=800&q=80",
    category: "Music",
    price: "$200",
    description:
      "Join us for a weekend of cutting-edge techno featuring international DJs. Two rooms of non-stop beats in the heart of Wan Chai.",
    isExclusive: true,
    is_exclusive: true,
    district: "Wan Chai",
  },
  {
    id: "event-002",
    title: "宀 Club Presents: L'affaire Musicale",
    date: "Today, May 20",
    time: "11:00 PM",
    venue: "宀 Club, Central",
    image:
      "https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=800&q=80",
    category: "Music",
    price: "$250",
    description:
      "An intimate underground club experience featuring French house and disco. Limited capacity - members get priority entry.",
    isExclusive: true,
    is_exclusive: true,
    district: "Central",
  },
  {
    id: "event-003",
    title: "Social Room: Wednesday Jazz Sessions",
    date: "Tomorrow, May 21",
    time: "8:00 PM",
    venue: "Social Room, Central",
    image:
      "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800&q=80",
    category: "Music",
    price: "Free",
    description:
      "Weekly jazz sessions featuring local Hong Kong musicians. Craft cocktails and intimate setting perfect for mid-week unwinding.",
    isExclusive: false,
    is_exclusive: false,
    district: "Central",
  },
  {
    id: "event-004",
    title: "Terrible Baby: Live Electronic Showcase",
    date: "Thu, May 22",
    time: "9:00 PM",
    venue: "Terrible Baby, Tai Hang",
    image:
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80",
    category: "Music",
    price: "$150",
    description:
      "Live electronic music showcase featuring modular synthesizers and ambient soundscapes. Rooftop vibes with harbor views.",
    isExclusive: false,
    is_exclusive: false,
    district: "Tai Hang",
  },
  {
    id: "event-005",
    title: "OMA: Deep House Thursdays",
    date: "Thu, May 22",
    time: "10:00 PM",
    venue: "OMA, Central",
    image:
      "https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=800&q=80",
    category: "Nightlife",
    price: "$180",
    description:
      "Underground deep house vibes in one of Hong Kong's most intimate venues. Resident DJs and surprise guests weekly.",
    isExclusive: true,
    is_exclusive: true,
    district: "Central",
  },
  {
    id: "event-006",
    title: "SHFT: Friday Night Techno",
    date: "Fri, May 23",
    time: "11:00 PM",
    venue: "SHFT, Causeway Bay",
    image:
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80",
    category: "Nightlife",
    price: "$220",
    description:
      "High-energy techno night featuring international and local DJs. State-of-the-art sound system and immersive lighting.",
    isExclusive: true,
    is_exclusive: true,
    district: "Causeway Bay",
  },
  {
    id: "event-007",
    title: "MOM Livehouse: Indie Band Night",
    date: "Sat, May 24",
    time: "8:00 PM",
    venue: "MOM Livehouse, Mong Kok",
    image:
      "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800&q=80",
    category: "Music",
    price: "$180",
    description:
      "Support local indie bands at Mong Kok's premier live music venue. Three bands, one unforgettable night.",
    isExclusive: false,
    is_exclusive: false,
    district: "Mong Kok",
  },
  {
    id: "event-008",
    title: "Casa Dao: Latin Dance Night",
    date: "Sat, May 24",
    time: "10:00 PM",
    venue: "Casa Dao, Central",
    image:
      "https://images.unsplash.com/photo-1545128485-c400e7702796?w=800&q=80",
    category: "Nightlife",
    price: "$150",
    description:
      "Salsa, bachata, and reggaeton all night long. Beginner-friendly with complimentary dance lesson at 9pm.",
    isExclusive: false,
    is_exclusive: false,
    district: "Central",
  },
  {
    id: "event-009",
    title: "Popinjays: Sunset Sessions",
    date: "Sun, May 25",
    time: "5:00 PM",
    venue: "Popinjays, Central",
    image:
      "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=80",
    category: "Food",
    price: "Free entry",
    description:
      "Rooftop cocktails and live acoustic music as the sun sets over Victoria Harbour. Happy hour until 7pm.",
    isExclusive: false,
    is_exclusive: false,
    district: "Central",
  },
  {
    id: "event-010",
    title: "Bamboo: Hidden Speakeasy Experience",
    date: "Sun, May 25",
    time: "8:00 PM",
    venue: "Bamboo, Central",
    image:
      "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=80",
    category: "Nightlife",
    price: "$300",
    description:
      "Members-only access to Hong Kong's most exclusive speakeasy. Craft cocktails and intimate jazz performances.",
    isExclusive: true,
    is_exclusive: true,
    district: "Central",
  },
  {
    id: "event-011",
    title: "Street Art Workshop: Sheung Wan",
    date: "Sat, May 24",
    time: "2:00 PM",
    venue: "XXX Gallery, Sheung Wan",
    image:
      "https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=800&q=80",
    category: "Arts",
    price: "$200",
    description:
      "Learn spray paint techniques from local graffiti artists. Create your own piece on our legal wall. All materials provided.",
    isExclusive: false,
    is_exclusive: false,
    district: "Sheung Wan",
  },
  {
    id: "event-012",
    title: "Victoria Harbour Yoga Flow",
    date: "Sun, May 25",
    time: "7:00 AM",
    venue: "Central Harbourfront",
    image:
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80",
    category: "Wellness",
    price: "$100",
    description:
      "Morning yoga with panoramic harbour views. Suitable for all levels. Mats and refreshments included.",
    isExclusive: false,
    is_exclusive: false,
    district: "Central",
  },
  {
    id: "event-013",
    title: "The Council: Business Networking Drinks",
    date: "Thu, May 22",
    time: "6:30 PM",
    venue: "The Council, Admiralty",
    image:
      "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=80",
    category: "Nightlife",
    price: "$50",
    description:
      "Connect with Hong Kong's creative professionals over curated cocktails. Members get first drink complimentary.",
    isExclusive: true,
    is_exclusive: true,
    district: "Admiralty",
  },
  {
    id: "event-014",
    title: "Boomerang: Comedy Night",
    date: "Wed, May 21",
    time: "8:00 PM",
    venue: "Boomerang, Sheung Wan",
    image:
      "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800&q=80",
    category: "Arts",
    price: "$120",
    description:
      "Stand-up comedy featuring Hong Kong's funniest English-speaking comedians. Two drink minimum.",
    isExclusive: false,
    is_exclusive: false,
    district: "Sheung Wan",
  },
];

export const categories = [
  "All",
  "Music",
  "Nightlife",
  "Arts",
  "Food",
  "Wellness",
  "Market",
  "Workshops",
  "Exclusive",
];
