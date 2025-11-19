import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC9yXwdYg5jNnpBkPz3SjolmN2OJjekbo0",
  authDomain: "debttracker-14b48.firebaseapp.com",
  projectId: "debttracker-14b48",
  storageBucket: "debttracker-14b48.firebasestorage.app",
  messagingSenderId: "378381072578",
  appId: "1:378381072578:web:5d1f42eb7c3d7ca1e8235b",
  measurementId: "G-SM3RCMG8DX"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Services
export const db = getFirestore(app);
export const auth = getAuth(app);