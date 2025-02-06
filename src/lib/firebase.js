import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth'; // Import auth and anonymous sign-in

const firebaseConfig = {
  apiKey: "AIzaSyAd6Hl3f4bH5mlosrdQt6nP-PARj3dwukM",
  authDomain: "movie-guesser-d87e6.firebaseapp.com",
  projectId: "movie-guesser-d87e6",
  storageBucket: "movie-guesser-d87e6.firebasestorage.app",
  messagingSenderId: "233505942934",
  appId: "1:233505942934:web:262138ac6a955a189441b7"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app); // Export Firestore instance
export const auth = getAuth(app);     // Export Auth instance

// Function to sign in anonymously (you might call this when your app loads)
export const initializeAnonymousAuth = async () => {
    try {
        await signInAnonymously(auth);
    } catch (error) {
        console.error("Anonymous sign-in failed:", error);
    }
};