import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
// Fix: Import auth module to support authentication
import "firebase/compat/auth";

// Configuration provided by user
const firebaseConfig = {
  apiKey: "AIzaSyC8lj8N6YdOW7-wXYSOJ2TRvAAnFQrXNl8",
  authDomain: "task-scheduler-945b4.firebaseapp.com",
  projectId: "task-scheduler-945b4",
  storageBucket: "task-scheduler-945b4.firebasestorage.app",
  messagingSenderId: "47427836514",
  appId: "1:47427836514:web:ced621a9bbaa4b3523cf3b",
  measurementId: "G-PSYN3QR8YF"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);

export const db = app.firestore();
// Fix: Export auth and googleProvider to resolve errors in LoginPage.tsx
export const auth = app.auth();
export const googleProvider = new firebase.auth.GoogleAuthProvider();

// Export legacy functions as no-ops to maintain compatibility with unused components (ConfigScreen, ErrorBoundary)
export const saveConfig = (config: any) => { console.log('Config is hardcoded'); };
export const resetConfig = () => { console.log('Config is hardcoded'); };
export const isConfigured = true;