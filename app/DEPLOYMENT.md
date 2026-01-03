# Deployment Guide

This project uses Firebase Hosting with separate environments for development and production.

## Environment Setup

### Projects
- **Development:** maintainer-dev (Firebase project)
- **Production:** TBD (separate Firebase project)

### Firebase Project Aliases

After running `firebase init`, the `.firebaserc` file contains:
```json
{
  "projects": {
    "dev": "maintainer-dev",
    "prod": "your-production-project-id"
  }
}
```

## Environment Variables

### Development Environment
1. Copy the template:
   ```bash
   cp .env.development.example .env.development
   ```

2. Fill in your Firebase credentials from:
   - Firebase Console → Project Settings → Your apps → SDK setup

### Production Environment
1. Copy the template:
   ```bash
   cp .env.production.example .env.production
   ```

2. Fill in production Firebase credentials

## Deployment Commands

### Development Deployment
```bash
# Deploy hosting only (recommended for quick iterations)
npm run deploy:dev

# Deploy everything (hosting + Firestore rules)
npm run deploy:dev:all

# Deploy only Firestore security rules
npm run deploy:dev:rules
```

### Production Deployment
```bash
# Deploy hosting only
npm run deploy:prod

# Deploy everything (hosting + Firestore rules)
npm run deploy:prod:all

# Deploy only Firestore security rules
npm run deploy:prod:rules
```

### Default Deployment
```bash
# Defaults to development
npm run deploy
```

## Build Modes

Vite automatically loads the correct `.env` file based on the mode:

- `npm run build:dev` → Uses `.env.development`
- `npm run build:prod` → Uses `.env.production`

## Local Testing

### Firebase Emulators
```bash
npm run emulators
```

Starts local emulators for:
- Hosting (localhost:5000)
- Firestore (localhost:8080)
- Auth (localhost:9099)

### Preview Production Build
```bash
npm run build:prod
npm run preview
```

## First-Time Setup

### 1. Initialize Firebase
```bash
cd app
firebase init
```

Select:
- ✅ Firestore
- ✅ Hosting

Configuration:
- Project: maintainer-dev (select existing)
- Public directory: `dist`
- Single-page app: Yes
- Automatic builds: No

### 2. Set Up Project Aliases

Edit `.firebaserc` to add aliases:
```json
{
  "projects": {
    "dev": "maintainer-dev",
    "prod": "your-production-project-id"
  }
}
```

Or use Firebase CLI:
```bash
firebase use --add
# Select maintainer-dev, alias: dev

firebase use --add
# Select production project, alias: prod
```

### 3. Configure Environment Files
```bash
cp .env.development.example .env.development
cp .env.production.example .env.production
```

Fill in the Firebase credentials for each environment.

### 4. Test Deployment
```bash
npm run deploy:dev
```

## Firestore Security Rules

Rules are stored in `firestore.rules` and deployed with:
```bash
npm run deploy:dev:rules    # Development
npm run deploy:prod:rules   # Production
```

**Important:** Test rules in development before deploying to production!

## CI/CD Considerations

For automated deployments:

1. Store Firebase credentials as CI secrets
2. Use Firebase service accounts
3. Deploy dev on every merge to `main`
4. Deploy prod on tagged releases

Example GitHub Actions:
```yaml
- name: Deploy to Development
  run: npm run deploy:dev
  env:
    FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

## Troubleshooting

### Wrong Project Selected
```bash
firebase use dev    # Switch to development
firebase use prod   # Switch to production
```

### Check Current Project
```bash
firebase projects:list
firebase use
```

### Clear Build Cache
```bash
rm -rf dist
npm run build:dev
```

### View Deployment History
```bash
firebase hosting:channel:list
```

## Best Practices

1. **Always test in development first**
   - Deploy to dev → Test → Deploy to prod

2. **Use different Firebase projects**
   - Prevents accidental data corruption
   - Separate analytics and usage tracking

3. **Keep environments in sync**
   - Same Firestore rules
   - Same security configuration
   - Only data differs

4. **Review before production deploy**
   - Run tests: `npm test -- --run`
   - Check build: `npm run build:prod`
   - Preview locally: `npm run preview`

5. **Monitor deployments**
   - Check Firebase Console after deploy
   - Verify new version is live
   - Test critical user flows
