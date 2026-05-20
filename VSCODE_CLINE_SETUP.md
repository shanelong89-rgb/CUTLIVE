# CULTIVE Mobile - VS Code + Cline Setup

## Quick Start

### 1. Open in VS Code
```bash
# Extract the zip
cd ~/Downloads
unzip cultive-mobile-source.zip

# Open in VS Code
cd cultive-mobile
code .
```

### 2. Install Dependencies (in VS Code terminal)
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```

The app will open at: **http://localhost:5173**

---

## Using with Cline

### Option A: Cline Sidebar
1. Open VS Code Command Palette (`Cmd+Shift+P` or `Ctrl+Shift+P`)
2. Type "Cline: Open Sidebar"
3. Ask Cline to help you with tasks like:
   - "Add a search bar to the Discover page"
   - "Connect this to Supabase for real events"
   - "Add a payment integration with Stripe"
   - "Convert this to a React Native app"

### Option B: Cline in New Tab
1. Click the Cline icon in the sidebar
2. Click "Open in New Tab" for more space
3. Work side-by-side with your code

---

## Project Structure

```
cultive-mobile/
├── src/
│   ├── components/     # Reusable UI components
│   │   ├── TabBar.tsx    # Bottom navigation
│   │   └── AuthModal.tsx # Login/signup modal
│   ├── pages/            # Main app screens
│   │   ├── Discover.tsx  # Event feed (home)
│   │   ├── EventDetail.tsx # Single event view
│   │   ├── Submit.tsx    # Event submission form
│   │   ├── Tickets.tsx   # User's tickets
│   │   ├── Inbox.tsx     # Notifications
│   │   └── Account.tsx   # Profile & settings
│   ├── data/
│   │   └── events.ts     # Mock event data
│   ├── App.tsx         # Main app component
│   └── index.css       # All styling
├── package.json      # Dependencies
└── vite.config.ts    # Build config
```

---

## Common Cline Tasks

### Add Backend Integration
Ask Cline:
> "Connect this to Supabase. I need:
> - A database table for events
> - Real-time event fetching
> - User authentication
> - File uploads for event flyers"

### Add Payments
Ask Cline:
> "Integrate Stripe for:
> - Monthly membership subscriptions ($99 HKD/month)
> - One-time event tickets
> - Freelancer payouts for approved events"

### Add Native Features
Ask Cline:
> "Convert this to React Native with:
> - Push notifications for new events
> - Calendar integration
> - Share to Instagram Stories
> - Apple Wallet tickets"

### Add Admin Dashboard
Ask Cline:
> "Create an admin page at /admin for:
> - Reviewing submitted events
> - Approving/rejecting with one click
> - Paying freelancers
> - Analytics dashboard"

---

## Environment Variables (create .env file)

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# Stripe
VITE_STRIPE_PUBLIC_KEY=pk_test_...

# Optional: Image CDN
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
```

---

## Build for Production

```bash
npm run build
```

Output goes to `dist/` folder - ready for Vercel, Netlify, or any static host.

---

## Tech Stack

- **React 18** + TypeScript
- **Vite** (fast dev server & builds)
- **React Router** (navigation)
- **Framer Motion** (smooth animations)
- **Lucide React** (icons)
- **CSS** (no framework - easy to customize)

---

## Cline Tips

1. **Be specific**: "Add a date picker to the Submit form" works better than "Improve the form"

2. **Give context**: "I'm building for Hong Kong users" helps with localization

3. **Ask for explanations**: "Explain how the auth flow works" to learn as you build

4. **Use file references**: "In src/pages/Discover.tsx, add..." for precise edits

5. **Test incrementally**: Run `npm run dev` and check localhost:5173 after each change

---

## Next Steps

1. ✅ Get it running locally
2. 🔄 Customize the design/colors
3. 🔗 Add real backend (Supabase/Firebase)
4. 💳 Add payments (Stripe)
5. 📱 Build native apps (Capacitor/React Native)

Happy building with Cline! 🚀