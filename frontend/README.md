# Emergency Gas Connect Platform

A modern, user-friendly emergency gas assistance platform that connects gas seekers with helpers and verified providers. Built with React, TypeScript, Material UI, and Supabase.

## Features

### User Roles

1. **Seeker** - Users who need emergency gas assistance
2. **Helper** - Volunteers who can help with gas requests
3. **Provider** - Gas agencies and businesses

### Key Functionality

- **Emergency Requests** - Quick and easy request creation with auto-location detection
- **Real-time Chat** - Direct messaging between seekers and helpers
- **Provider Listings** - Browse and contact verified gas providers
- **Role-based Dashboards** - Customized views for different user types
- **Live Updates** - Real-time request updates using Supabase subscriptions
- **Map Integration** - Visual location display using OpenStreetMap
- **Dark Mode** - Toggle between light and dark themes
- **Responsive Design** - Mobile-first, works on all devices

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **UI Framework**: Material UI (MUI)
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime
- **Animations**: Framer Motion
- **Icons**: Lucide React, Material Icons
- **Notifications**: React Toastify
- **Build Tool**: Vite

## Project Structure

```
src/
├── components/         # Reusable UI components
│   ├── EmptyState.tsx
│   ├── FloatingActionButton.tsx
│   ├── Loader.tsx
│   ├── Map.tsx
│   ├── Navbar.tsx
│   ├── ProtectedRoute.tsx
│   ├── ProviderCard.tsx
│   └── RequestCard.tsx
├── context/           # React Context providers
│   ├── AuthContext.tsx
│   └── DarkModeContext.tsx
├── lib/               # External libraries setup
│   └── supabase.ts
├── pages/             # Page components
│   ├── Chat.tsx
│   ├── Dashboard.tsx
│   ├── Home.tsx
│   ├── Login.tsx
│   ├── Providers.tsx
│   ├── RequestHelp.tsx
│   └── Signup.tsx
├── types/             # TypeScript type definitions
│   └── index.ts
├── utils/             # Utility functions
│   ├── distance.ts
│   ├── location.ts
│   └── toast.ts
├── App.tsx           # Main app component with routing
├── main.tsx          # App entry point
└── index.css         # Global styles
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase account and project

### Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd emergency-gas-platform
```

2. **Install dependencies**

```bash
npm install
```

3. **Environment Setup**

The `.env` file should already contain your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Database Setup**

The database schema has already been applied via migrations. The following tables are created:
- `profiles` - User profiles
- `providers` - Gas provider businesses
- `requests` - Emergency gas requests
- `messages` - Chat messages

5. **Run the development server**

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

## Usage Guide

### For Seekers

1. **Sign Up** - Create an account as a "Gas Seeker"
2. **Request Help** - Click the floating red button to create an emergency request
3. **Auto-location** - Location is auto-detected (you can edit if needed)
4. **Track Status** - View request status in your dashboard
5. **Chat** - Communicate with helpers who accept your request

### For Helpers

1. **Sign Up** - Create an account as a "Helper"
2. **Browse Requests** - View nearby emergency requests on the home page
3. **Accept Requests** - Click to accept and help someone in need
4. **Chat** - Coordinate with the seeker via built-in chat
5. **Toggle Availability** - Turn availability on/off from your dashboard

### For Providers

1. **Sign Up** - Create an account as a "Gas Provider/Agency"
2. **Profile Setup** - Add business details and contact information
3. **Get Listed** - Appear in the provider directory for users to find you

## Key Features Explained

### Real-time Updates

The platform uses Supabase Realtime subscriptions to provide live updates:
- New requests appear instantly on the home page
- Chat messages are delivered in real-time
- Request status changes update immediately

### Location Services

- Auto-detects user location using browser geolocation API
- Reverse geocoding using OpenStreetMap Nominatim API
- Distance calculation between users and requests
- Map visualization using OpenStreetMap embeds

### Security

- Row Level Security (RLS) policies on all database tables
- Authenticated-only access to sensitive data
- Users can only modify their own data
- Secure password authentication via Supabase Auth

### Responsive Design

- Mobile-first approach
- Breakpoints for tablet and desktop
- Touch-friendly buttons and inputs
- Optimized for low-end devices

## Deployment

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` folder.

### Deploy to Vercel, Netlify, or other platforms

The app is a standard Vite React app and can be deployed to any static hosting service.

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome)

## Accessibility

- High contrast text for readability
- Large tap targets for mobile users
- Keyboard navigation support
- Screen reader friendly
- Simple, clear language

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

MIT License

## Support

For issues or questions, please open an issue on the repository.

---

Built with care for emergency situations. Stay safe!
