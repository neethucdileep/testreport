# Bloodlyf Results (Vite)

Mobile-only (9:16) web app with Firebase Phone OTP login and Firestore user profiles.

## Setup

### 1) Firebase Console

- **Authentication**: enable **Phone** provider
- **Firestore**: create a database (Native mode)
- **Authorized domains**: add `localhost` for dev, and later add `result.blooflyf.com`

### 2) Environment variables

- Copy `.env.example` → `.env` and fill:
  - `VITE_FIREBASE_*`

### 3) Firestore Security Rules (minimum)

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Run

```bash
npm run dev
```

## Routes

- `/login`: phone → OTP
- `/profile`: profile details + optional family members → saved to `users/{uid}`
