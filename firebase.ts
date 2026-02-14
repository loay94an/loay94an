
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Safely access environment variables, fallback to empty object if undefined
const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "YOUR_FIREBASE_API_KEY",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_FIREBASE_AUTH_DOMAIN",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "YOUR_FIREBASE_PROJECT_ID",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_FIREBASE_MESSAGING_SENDER_ID",
  appId: env.VITE_FIREBASE_APP_ID || "YOUR_FIREBASE_APP_ID",
};

// Check if configuration is using placeholders
const isConfigured = firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY" && firebaseConfig.projectId !== "YOUR_FIREBASE_PROJECT_ID";

let app: any = null;
let db: any = null;
let storage: any = null;

if (isConfigured) {
  try {
    // Initialize Firebase only if configured correctly
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (error) {
    console.warn("Firebase initialization failed. Running in offline mode.", error);
  }
} else {
  console.log("Firebase config missing or using placeholders. App running in offline mode (localStorage only).");
}

export { db, storage };
export default app;
