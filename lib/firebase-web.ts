import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

export const firebaseWebConfig = {
  apiKey: "AIzaSyBhOIHX-4miq4ZnAWhL6A6yN8aC-VrSt_0",
  authDomain: "unlisted-shares-india.firebaseapp.com",
  projectId: "unlisted-shares-india",
  storageBucket: "unlisted-shares-india.firebasestorage.app",
  messagingSenderId: "516972867122",
  appId: "1:516972867122:web:c87076f06b7e9f5b10162b",
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps()[0] ?? initializeApp(firebaseWebConfig);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) auth = getAuth(getFirebaseApp());
  return auth;
}

export function getFirebaseDb(): Firestore {
  if (!db) db = getFirestore(getFirebaseApp());
  return db;
}
