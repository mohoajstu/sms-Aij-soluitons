import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getApps } from "firebase/app";

// Configuration for Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDs0-gR5PrwDPRpyE6ZE0ua9sALYICwvcI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "tarbiyah-sms.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "tarbiyah-sms",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "tarbiyah-sms.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "329966751488",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:329966751488:web:e4d4fd53397e7c21ccede5",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-Y12T1TPW92"
};

// Initialize Firebase only if it hasn't been initialized already
let app;
let analytics;
let auth;
let firestore;
let functions;

// Check if Firebase app is already initialized
if (!getApps().length) {
  console.log("Initializing Firebase app...");
  app = initializeApp(firebaseConfig);
  analytics = getAnalytics(app);
  auth = getAuth(app);
  firestore = getFirestore(app);
  functions = getFunctions(app);
} else {
  console.log("Firebase app already initialized, reusing existing app");
  app = getApps()[0];
  analytics = getAnalytics(app);
  auth = getAuth(app);
  firestore = getFirestore(app);
  functions = getFunctions(app);
}

export { app, analytics, auth, firestore, functions };
