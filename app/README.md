# Vehicle Maintenance Tracker - Application

A React-based web application for tracking vehicle maintenance intervals across teams.

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Firebase Environment

This project supports multiple Firebase environments (development and production). Follow this checklist to set up a new environment:

#### Firebase Project Setup Checklist

- [ ] **Create Firebase Project**
  - Go to [Firebase Console](https://console.firebase.google.com)
  - Click "Add project"
  - Enter project name (e.g., `maintainer-dev` or `maintainer-prod`)
  - Complete project creation wizard

- [ ] **Enable Firebase Authentication**
  - Navigate to: `Authentication` → `Get started`
  - Click on `Sign-in method` tab
  - Enable `Google` provider:
    - Toggle "Enable" to ON
    - Enter support email (your email address)
    - Click "Save"
  - Go to `Settings` tab → `Authorized domains`
  - Verify these domains are listed:
    - `localhost` (for local development)
    - `your-project-id.web.app` (Firebase hosting domain)
    - `your-project-id.firebaseapp.com` (Firebase app domain)

- [ ] **Create Firestore Database**
  - Navigate to: `Firestore Database` → `Create database`
  - Select location: `me-central1` (Middle East) or your preferred region
  - Start in `production mode` (rules will be deployed separately)
  - Click "Enable"

- [ ] **Create Web App**
  - Go to Project Settings (gear icon) → `General` tab
  - Scroll to "Your apps" section
  - Click "Add app" → Select web (`</>` icon)
  - Enter app nickname (e.g., "Vehicle Maintenance Tracker")
  - Register app
  - Copy the Firebase configuration values

- [ ] **Configure Environment File**
  - Copy the appropriate template:
    - For development: `cp .env.development.example .env.development`
    - For production: `cp .env.production.example .env.production`
  - Fill in Firebase credentials from the web app configuration:
    ```env
    VITE_FIREBASE_API_KEY=your_api_key
    VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
    VITE_FIREBASE_PROJECT_ID=your-project-id
    VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
    VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    VITE_FIREBASE_APP_ID=your_app_id
    ```

- [ ] **Update Firebase Project Aliases** (for deployment)
  - Edit `.firebaserc` to add your project:
    ```json
    {
      "projects": {
        "default": "maintainer-dev",
        "dev": "maintainer-dev",
        "prod": "your-prod-project-id"
      }
    }
    ```

- [ ] **Deploy Firestore Security Rules**
  - For development: `npm run deploy:dev:rules`
  - For production: `npm run deploy:prod:rules`

- [ ] **Test the Setup**
  - Run development server: `npm run dev`
  - Open browser to `http://localhost:5173`
  - Try signing in with Google
  - Verify no authentication errors

#### Current Configured Environments

- **Development**: `maintainer-dev`
  - URL: https://maintainer-dev.web.app
  - Project alias: `dev`, `default`

- **Production**: `maintainer-85295`
  - URL: https://maintainer-85295.web.app
  - Project alias: `prod`

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
