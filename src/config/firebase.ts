// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAev0OvGFgf48FoVjqai5gR1nccznlwKq8",
  authDomain: "ai-reminder-app-35f61.firebaseapp.com",
  projectId: "ai-reminder-app-35f61",
  storageBucket: "ai-reminder-app-35f61.firebasestorage.app",
  messagingSenderId: "131782214447",
  appId: "1:131782214447:web:248b6e88b96bdb809257da"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);