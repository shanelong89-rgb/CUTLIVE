import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = 'https://qmjdqldmpmeguuyepbsw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtamRxbGRtcG1lZ3V1eWVwYnN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3MzA0MjYsImV4cCI6MjA1NzMwNjQyNn0.ZiIC-9L3i2K5o2d8GqEzfzj8_FfXuKtH49kIKBC2_rc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchEvents() {
  console.log('🔍 Fetching events from CULTIVE database...\n');
  
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);
  
  if (error) {
    console.error('❌ Error fetching events:', error);
    process.exit(1);
  }
  
  if (!events || events.length === 0) {
    console.log('⚠️ No events found in database');
    process.exit(0);
  }
  
  console.log(`✅ Found ${events.length} events\n`);
  
  // Log preview
  events.forEach((e, i) => {
    console.log(`${i + 1}. ${e.title}`);
    console.log(`   📅 ${e.date} | 🕐 ${e.time || 'TBA'}`);
    console.log(`   📍 ${e.venue}`);
    console.log(`   🎫 ${e.category} | 💰 ${e.price || 'Free'}`);
    console.log(`   ${e.is_exclusive ? '⭐ Exclusive' : 'Public'}\n`);
  });
  
  // Generate events.ts content
  const eventsArray = events.map((e, idx) => {
    const id = e.id || `event-${idx}`;
    const image = e.image || getCategoryImage(e.category);
    const district = e.district || e.venue?.split(',')[0] || 'Hong Kong';
    
    return `  {
    id: '${id}',
    title: '${escapeString(e.title)}',
    date: '${formatDate(e.date)}',
    time: '${e.time || ''}',
    venue: '${escapeString(e.venue)}',
    image: '${image}',
    category: '${e.category || 'Other'}',
    price: '${e.price || 'Free'}',
    description: '${escapeString(e.description || '')}',
    isExclusive: ${e.is_exclusive || false},
    is_exclusive: ${e.is_exclusive || false},
    district: '${escapeString(district)}',
  }`;
  }).join(',\n');
  
  // Get unique categories
  const uniqueCategories = [...new Set(events.map(e => e.category).filter(Boolean))];
  const categoriesArray = ['All', ...uniqueCategories, 'Exclusive'];
  
  const fileContent = `export type Event = {
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
  submittedBy?: string;
  district?: string;
};

// Real events from CULTIVE database (fetched: ${new Date().toISOString().split('T')[0]})
export const mockEvents: Event[] = [
${eventsArray}
];

export const categories = [${categoriesArray.map(c => `'${c}'`).join(', ')}];
`;
  
  const outputPath = path.join(__dirname, '../src/data/events.ts');
  fs.writeFileSync(outputPath, fileContent);
  
  console.log(`📝 Updated events.ts with ${events.length} real events`);
  console.log(`📁 Saved to: ${outputPath}`);
}

function escapeString(str: string): string {
  if (!str) return '';
  return str.replace(/'/g, "\\'").replace(/\n/g, ' ').trim();
}

function formatDate(dateStr: string): string {
  if (!dateStr) return 'TBD';
  // If it's already a formatted date string, return as-is
  if (dateStr.includes('Today') || dateStr.includes('Tomorrow') || dateStr.includes(',')) {
    return dateStr;
  }
  // Try to format ISO date
  try {
    const date = new Date(dateStr);
    const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${m[date.getMonth()]} ${date.getDate()}`;
  } catch {
    return dateStr;
  }
}

function getCategoryImage(category: string): string {
  const images: Record<string, string> = {
    'Music': 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800&q=80',
    'Arts': 'https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=800&q=80',
    'Nightlife': 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=80',
    'Food': 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=800&q=80',
    'Wellness': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80',
    'Film': 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80',
    'Theatre': 'https://images.unsplash.com/photo-1503095392213-2e6d338dbbf0?w=800&q=80',
  };
  return images[category] || images['Arts'];
}

fetchEvents().catch(console.error);
