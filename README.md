
# Employer Listings Portal — Starter (Firebase + GitHub Pages)

This is a starter static site that uses Firebase Authentication and Firestore to provide:
- User signup/login (email + password)
- Employer dashboard: add, edit, delete your own listings
- Leadership dashboard: view all listings (leadership accounts only)

## Files included
- index.html — Login / Signup
- dashboard.html — Employer dashboard (add/edit/delete own listings)
- leadership.html — Leadership dashboard (view all listings)
- styles.css — Styling
- script.js — Firebase logic (replace firebaseConfig with your project config)
- assets/logo.png — Your logo (replace if needed)
- README.md — This file

## Quick setup (Firebase)
1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Authentication -> Sign-in method -> Email/Password.
3. Create a Firestore database (production mode recommended).
4. Add a web app in Project Overview and copy the firebaseConfig. Paste it into `script.js` at the top where indicated.
5. (Leadership) To mark a user as leadership, do one of the following:
   - Use Firebase Admin SDK to set a custom claim `isLeadership: true` for the user's UID (recommended). Example using Node Admin SDK:
     ```js
     // initialize admin SDK
     admin.auth().setCustomUserClaims(uid, { isLeadership: true });
     ```
   - OR create a document in Firestore at `leadership/{UID}` with `{ isLeadership: true }`. The client checks this doc as a fallback.
6. Firestore rules (example) — go to Firestore -> Rules and replace with the snippet below.

### Example Firestore rules (starter)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // users collection: allow users to read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // leadership docs: only authenticated users may read (the client uses this as a fallback)
    match /leadership/{userId} {
      allow read: if request.auth != null;
      allow write: if false; // write via server/admin only
    }
    // listings: owners can create; owners can read/write their own listings;
    // leadership users can read all and delete
    match /listings/{listingId} {
      allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
      allow read: if request.auth != null && (request.auth.uid == resource.data.uid || get(/databases/$(database)/documents/leadership/$(request.auth.uid)).data.isLeadership == true || request.auth.token.isLeadership == true);
      allow update, delete: if request.auth != null && (request.auth.uid == resource.data.uid || get(/databases/$(database)/documents/leadership/$(request.auth.uid)).data.isLeadership == true || request.auth.token.isLeadership == true);
    }
  }
}
```

## Deploying
- Push these files to a GitHub repository and enable GitHub Pages in repo settings (use `main` branch root). OR host using Firebase Hosting.
- Ensure `script.js` has your Firebase config and the files are publicly accessible (no server required).

## Notes & Security
- The client checks leadership by custom claims (recommended) and by reading the `leadership/{UID}` doc as a fallback.
- For production, prefer setting leadership using the Firebase Admin SDK (server-side) to avoid giving write access to `leadership` docs.
- Do not embed service account keys or admin credentials in client files.
