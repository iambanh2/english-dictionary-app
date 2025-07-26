# 🔥 Firebase Setup Guide

> **No Installation Required!** This guide uses Firebase JavaScript SDK via CDN. You only need to create a Firebase project and update the config file.

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Enter project name: `english-dictionary-app`
4. Continue through setup steps
5. Create project

## Step 2: Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click **"Get started"**
3. Go to **"Sign-in method"** tab
4. Enable **"Anonymous"** provider
5. Save

## Step 3: Create Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in test mode"** (for development)
4. Select location (closest to your users)
5. Done

## Step 4: Get Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to **"Your apps"** section
3. Click **"Add app"** > **Web** icon `</>`
4. Register app name: `english-dictionary-app`
5. **DO NOT** check "Also set up Firebase Hosting" (we use different hosting)
6. Copy the `firebaseConfig` object from the code snippet
7. Paste it into `firebase-config.js` file in your project

**Example firebaseConfig:**
```javascript
// Replace the values in firebase-config.js with your actual config
export const firebaseConfig = {
    apiKey: "AIzaSyC...",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id", 
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};
```

**Note**: We use Firebase SDK via CDN (already included in HTML), no need to install Firebase CLI or npm packages for this setup.

## Step 5: Update Security Rules (Optional)

For production, update Firestore rules in Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Step 6: Deploy

Use any deployment method from the deployment guide:
- Firebase Hosting
- Auto deploy script

## Firebase Features Used

- **Authentication**: Anonymous sign-in for user identification
- **Firestore**: NoSQL database for saving user's words  
- **SDK via CDN**: No installation needed, loads directly from Google CDN

**Important**: This setup uses Firebase JavaScript SDK v12.0.0 via CDN links. No Firebase CLI installation required for basic Firestore functionality.

## Data Structure

```javascript
// Firestore Document: /users/{userId}
{
  savedWords: {
    "word1": {
      word: "hello",
      phoneticUK: "/həˈləʊ/",
      phoneticUS: "/həˈloʊ/", 
      audioUK: "https://...",
      audioUS: "https://...",
      vietnameseTranslation: "xin chào",
      englishMeanings: [...],
      savedAt: "2024-01-01T00:00:00.000Z"
    }
  },
  lastUpdated: "2024-01-01T00:00:00.000Z"
}
```

## Benefits of Firebase

✅ **Realtime sync** across devices  
✅ **Offline support** with caching  
✅ **Scalable** cloud infrastructure  
✅ **Free tier** generous limits  
✅ **Anonymous auth** no registration needed  
✅ **Automatic backups**  

## Firestore Limits (Free Tier)

- **Reads**: 50K/day
- **Writes**: 20K/day  
- **Storage**: 1GB
- **Bandwidth**: 10GB/month

Perfect for personal dictionary app usage! 🚀
