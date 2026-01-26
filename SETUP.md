# IELTS Writing Master Setup Guide

## Firebase Setup

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project" or use existing project
3. Follow the setup wizard

### 2. Enable Email/Password Authentication
1. In Firebase Console, click "Authentication" in left menu
2. Click "Get Started"
3. Go to "Sign-in method" tab
4. Click "Email/Password"
5. Enable it and click "Save"

### 3. Get Firebase Configuration
1. Click the gear icon (⚙️) → "Project Settings"
2. Scroll down to "Your apps" section
3. Click the Web icon (</>) to add a web app
4. Register your app with a nickname
5. Copy the `firebaseConfig` object values

### 4. Set Environment Variables in Vercel
Add these environment variables in your Vercel project settings:

**Gemini API:**
- `VITE_GEMINI_API_KEY` - Your Google Gemini API key

**Firebase Configuration:**
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

### 5. Deploy to Vercel
```bash
vercel --prod
```

## Local Development

1. Copy `.env.example` to `.env.local`
2. Fill in all the values
3. Run `npm install`
4. Run `npm run dev`

## Features

### User Management
- **Registration:** Users can sign up with email and password
- **Login:** Authenticate to access all features
- **Profile Management:** Update name, email, and password
- **Protected Routes:** All IELTS writing features require authentication

### IELTS Writing Practice
- Task 1: Academic Report Writing (charts, graphs)
- Task 2: Essay Writing
- Real-time grammar checking
- AI-powered feedback and scoring
- Writing history tracking
