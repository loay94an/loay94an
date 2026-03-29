
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Safely access environment variables
// Use optional chaining or fallback to empty object to prevent crashes in environments where import.meta.env is undefined
const meta = (import.meta as any) || {};
const env = meta.env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

// Debugging: Log config status (without revealing secrets)
console.log("Firebase Config Check:", {
  apiKeyPresent: !!firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY",
  projectId: firebaseConfig.projectId,
  mode: env.MODE // Safe access via the fallback object
});

// Check if configuration is using placeholders or undefined
const isConfigured = 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY" && 
  firebaseConfig.projectId && 
  firebaseConfig.projectId !== "YOUR_FIREBASE_PROJECT_ID";

let app: any = null;
let db: any = null;
let storage: any = null;

if (isConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);
    console.log("✅ Firebase initialized successfully.");
  } catch (error) {
    console.error("❌ Firebase initialization failed:", error);
  }
} else {
  console.warn("⚠️ Firebase keys missing. App running in OFFLINE mode.");
  console.warn("If on Netlify: Go to Site Settings > Environment Variables and add VITE_FIREBASE_API_KEY, etc.");
}

export { db, storage };
export default app;
