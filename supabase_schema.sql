-- CULTIVE Database Schema for Supabase

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  venue TEXT NOT NULL,
  district TEXT,
  image TEXT,
  category TEXT NOT NULL,
  price TEXT NOT NULL,
  description TEXT NOT NULL,
  is_exclusive BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create index on category for faster filtering
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);

-- Create index on date for sorting
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);

-- Create index on is_exclusive for filtering
CREATE INDEX IF NOT EXISTS idx_events_is_exclusive ON events(is_exclusive);

-- Insert sample events
INSERT INTO events (title, date, time, venue, district, image, category, price, description, is_exclusive) VALUES
  ('Jazz Night at The Peninsula', 'Today, May 20', '7:00 PM', 'The Peninsula Hotel, TST', 'TST', 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800&q=80', 'Music', 'Free', 'An intimate evening of jazz classics featuring local Hong Kong musicians. Perfect for unwinding after work with live music and great cocktails.', false),
  
  ('Street Art Workshop: Wan Chai Walls', 'Tomorrow, May 21', '2:00 PM', 'Wan Chai Visual Arts Centre', 'Wan Chai', 'https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=800&q=80', 'Arts', '$180', 'Learn spray paint techniques and create your own street art piece with local graffiti artists. All materials provided.', true),
  
  ('Sunset Rooftop Yoga', 'Thu, May 22', '6:30 PM', 'Central Rooftop Garden', 'Central', 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80', 'Wellness', '$120', 'Flow through sunset yoga with panoramic harbor views. Suitable for all levels. Mats and refreshments included.', false),
  
  ('Hidden Speakeasy Tour', 'Fri, May 23', '8:00 PM', 'Secret Locations, Central', 'Central', 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=80', 'Nightlife', '$400', 'Discover Hong Kong''s best hidden bars with exclusive access. Includes 4 cocktails and bar snacks at each stop.', true),
  
  ('Neon Sign Photography Walk', 'Sat, May 24', '7:00 PM', 'Mong Kok Streets', 'Mong Kok', 'https://images.unsplash.com/photo-1536599018102-9f803c140fc1?w=800&q=80', 'Arts', 'Free', 'Capture the iconic neon lights of Mong Kok with professional photographer guidance. Learn night photography techniques.', false),
  
  ('Craft Beer Tasting: Local Brews', 'Sat, May 24', '4:00 PM', 'Young Master Brewery, Wong Chuk Hang', 'Wong Chuk Hang', 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=800&q=80', 'Food', '$280', 'Taste 6 locally brewed craft beers with brewery tour and pairing snacks. Meet the brewers behind Hong Kong''s beer scene.', true),
  
  ('Indie Film Screening: Hong Kong Stories', 'Sun, May 25', '3:00 PM', 'Broadway Cinematheque, Yau Ma Tei', 'Yau Ma Tei', 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80', 'Arts', '$100', 'A curated selection of short films by local independent filmmakers. Q&A with directors after the screening.', false),
  
  ('Victoria Peak Night Hike', 'Sun, May 25', '7:30 PM', 'Victoria Peak Trail', 'The Peak', 'https://images.unsplash.com/photo-1536599018102-9f803c140fc1?w=800&q=80', 'Wellness', 'Free', 'Guided night hike to Victoria Peak with the best city views. Experience Hong Kong''s skyline like never before.', true);

-- Enable Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read events
CREATE POLICY "Allow public read access" ON events
  FOR SELECT USING (true);

-- Create policy to allow authenticated users to insert events
CREATE POLICY "Allow authenticated insert" ON events
  FOR INSERT TO authenticated WITH CHECK (true);

-- Create submissions table for freelancer submissions
CREATE TABLE IF NOT EXISTS submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  venue TEXT NOT NULL,
  category TEXT NOT NULL,
  price TEXT NOT NULL,
  description TEXT NOT NULL,
  submitter_name TEXT NOT NULL,
  submitter_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable RLS on submissions
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to submit
CREATE POLICY "Allow public submissions" ON submissions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Allow authenticated to view their own submissions
CREATE POLICY "Allow users to view own submissions" ON submissions
  FOR SELECT TO authenticated USING (submitter_email = auth.jwt() ->> 'email');

-- Create tickets table for user RSVPs
CREATE TABLE IF NOT EXISTS tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  event_id UUID REFERENCES events(id),
  ticket_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active', -- active, used, cancelled
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable RLS on tickets
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tickets
CREATE POLICY "Allow users to view own tickets" ON tickets
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Users can create their own tickets
CREATE POLICY "Allow users to create tickets" ON tickets
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
