import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBNk67X1YFmbTzYuz3bP-7QVKw1S9WQ4gA",
  authDomain: "go-cart-timer-98649.firebaseapp.com",
  projectId: "go-cart-timer-98649",
  storageBucket: "go-cart-timer-98649.firebasestorage.app",
  messagingSenderId: "442304254804",
  appId: "1:442304254804:web:65071d22f21155bda8eec1"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
