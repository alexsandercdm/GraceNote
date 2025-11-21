import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBFtQLeZPOUzpcXvB_xu1FGqhrCMViF0xM",
    authDomain: "devotional-day.firebaseapp.com",
    projectId: "devotional-day",
    storageBucket: "devotional-day.firebasestorage.app",
    messagingSenderId: "820772851647",
    appId: "1:820772851647:web:c33a41dc7240973ae7db0a"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
