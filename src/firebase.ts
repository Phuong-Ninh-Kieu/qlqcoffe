import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDul0MkkTSn15F-g48DUxr1YJk8xew51p0",
  authDomain: "qlcoffee-97289.firebaseapp.com",
  databaseURL: "https://qlcoffee-97289-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "qlcoffee-97289",
  storageBucket: "qlcoffee-97289.firebasestorage.app",
  messagingSenderId: "679380881408",
  appId: "1:679380881408:web:f23223b4108bd2c17d88e5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const rtdb = getDatabase(app);
