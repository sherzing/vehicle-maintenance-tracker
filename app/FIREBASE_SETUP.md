# Firebase Setup Guide

This guide will walk you through setting up Firebase for the Vehicle Maintenance Tracker application.

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project" or "Create a project"
3. Enter project name: `vehicle-maintenance-tracker` (or your preferred name)
4. (Optional) Enable Google Analytics if desired
5. Click "Create project"

## Step 2: Register Web App

1. In your Firebase project, click the **Web** icon (`</>`) to add a web app
2. Register app nickname: `Vehicle Maintenance Tracker Web`
3. **Check** "Also set up Firebase Hosting" (we'll use this for deployment)
4. Click "Register app"
5. **Copy the Firebase configuration object** - you'll need this for the `.env` file

## Step 3: Enable Authentication

1. In the Firebase Console, go to **Build > Authentication**
2. Click "Get started"
3. Click on the **Sign-in method** tab
4. Enable **Google** provider:
   - Click on "Google"
   - Toggle "Enable" switch
   - Set project support email (required)
   - Click "Save"

## Step 4: Create Firestore Database

1. In the Firebase Console, go to **Build > Firestore Database**
2. Click "Create database"
3. Choose **Start in production mode** (we'll add security rules later)
4. Select your Firestore location (choose closest to your users)
5. Click "Enable"

## Step 5: Configure Environment Variables

1. In the `app/` directory, copy `.env.example` to `.env`:
   ```bash
   cd app
   cp .env.example .env
   ```

2. Open `.env` and fill in the values from Step 2:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key_from_firebase_config
   VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

## Step 6: Verify Setup

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open http://localhost:5173 in your browser
3. Open browser console (F12) - you should see no Firebase errors

## Next Steps

Once Firebase is configured, you can proceed with:
- [ ] Implementing Google Authentication (Milestone 2)
- [ ] Building team and vehicle management features
- [ ] Deploying to Firebase Hosting

## Security Rules (To Be Added Later)

Firestore security rules will be configured in Milestone 8 to enforce:
- Users can only access teams they belong to
- Team-based access control for vehicles
- Validation of data types and required fields

## Troubleshooting

### Common Issues

**"Firebase: Error (auth/configuration-not-found)"**
- Make sure you've copied the correct API key and project ID to `.env`
- Restart the dev server after updating `.env`

**"Missing or insufficient permissions"**
- This is expected until we implement authentication
- Firestore is in production mode and will deny all requests until auth is set up

**"Module not found: Can't resolve firebase/app"**
- Make sure you ran `npm install` in the app directory
- Check that Firebase is listed in `package.json` dependencies
