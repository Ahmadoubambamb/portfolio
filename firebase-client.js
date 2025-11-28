// Firebase Configuration & Initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, deleteDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBJG4H1XaeY64MfPW8srddkYFGs0v_ias8",
  authDomain: "ahmadou-portfolio.firebaseapp.com",
  projectId: "ahmadou-portfolio",
  storageBucket: "ahmadou-portfolio.firebasestorage.app",
  messagingSenderId: "965044573808",
  appId: "1:965044573808:web:9138afa193cca6f2c746b5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Export Firestore functions for use in admin.js
export { db, collection, doc, setDoc, getDoc, getDocs, deleteDoc, onSnapshot, query, orderBy };
