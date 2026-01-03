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
- **Vitest 4** - Unit testing framework
- **React Testing Library** - Component testing

## Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Testing
- `npm test` - Run tests in watch mode
- `npm test -- --run` - Run tests once
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Generate test coverage report

### Firebase Deployment
- `npm run deploy` - Build and deploy everything to Firebase
- `npm run deploy:hosting` - Deploy only hosting
- `npm run deploy:rules` - Deploy only Firestore security rules
- `npm run emulators` - Start Firebase emulators for local testing
- `npm run firebase -- <command>` - Run any Firebase CLI command

## Deployment

### First Time Setup
1. Install Firebase CLI globally (optional):
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in the project:
   ```bash
   npm run firebase init
   ```
   Select: Hosting, Firestore
   - Hosting: Use `dist` as public directory
   - Configure as single-page app: Yes
   - Set up automatic builds: No

4. Deploy:
   ```bash
   npm run deploy
   ```

### Subsequent Deployments
```bash
npm run deploy
```

## Documentation
See `/tasks/prd-vehicle-maintenance-tracker.md` for full product requirements.
See `/claude.md` for project context and development guidelines.
See `FIREBASE_SETUP.md` for Firebase configuration instructions.
See `TESTING.md` for testing guidelines.
