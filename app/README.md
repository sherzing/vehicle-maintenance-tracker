# Vehicle Maintenance Tracker - Application

A React-based web application for tracking vehicle maintenance intervals across teams.

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Firebase
1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Authentication (Google Sign-In provider)
3. Create a Firestore database
4. Copy `.env.example` to `.env`
5. Fill in your Firebase credentials in `.env`

### 3. Run Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Project Structure
```
src/
├── components/
│   ├── auth/          # Authentication components
│   ├── dashboard/     # Dashboard and overview
│   ├── maintenance/   # Maintenance item components
│   └── vehicles/      # Vehicle management components
├── services/
│   └── firebase/      # Firebase configuration and services
└── utils/             # Utility functions and calculations
```

## Tech Stack
- **React 19** - UI library
- **Vite 7** - Build tool
- **Firebase 12** - Backend (Auth + Firestore)
- **React Bootstrap 2** - UI components
- **React Router DOM 7** - Routing

## Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Documentation
See `/tasks/prd-vehicle-maintenance-tracker.md` for full product requirements.
See `/claude.md` for project context and development guidelines.
