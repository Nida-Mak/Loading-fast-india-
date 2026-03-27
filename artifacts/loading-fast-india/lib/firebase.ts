import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";

const rawDatabaseURL = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL ?? "";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  databaseURL: rawDatabaseURL.replace(/\/+$/, ""),
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "",
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.databaseURL &&
    firebaseConfig.projectId
);

let cachedApp: FirebaseApp | null = null;
let cachedDB: Database | null = null;

export function getFirebaseDB(): Database | null {
  if (!isFirebaseConfigured) return null;
  try {
    if (!cachedApp) {
      cachedApp = getApps().length === 0
        ? initializeApp(firebaseConfig)
        : getApp();
    }
    if (!cachedDB) {
      cachedDB = getDatabase(cachedApp);
    }
    return cachedDB;
  } catch (e) {
    console.warn("[Firebase] Init failed:", e);
    return null;
  }
}
