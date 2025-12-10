import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCHCxkskHbrtxIexDVpVE4_ONulHQDzdUM",
  authDomain: "pokedex-react-69e35.firebaseapp.com",
  databaseURL: "https://pokedex-react-69e35-default-rtdb.firebaseio.com",
  projectId: "pokedex-react-69e35",
  storageBucket: "pokedex-react-69e35.firebasestorage.app",
  messagingSenderId: "945102378276",
  appId: "1:945102378276:web:8d946f8d95844e42e34fb1",
  measurementId: "G-J4N3WH01F8",
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
