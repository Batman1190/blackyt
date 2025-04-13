// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC4e7yS7tHZMD-em10ZLV-dDOKhrs92wE4",
    authDomain: "ramdor-7c0d5.firebaseapp.com",
    projectId: "ramdor-7c0d5",
    storageBucket: "ramdor-7c0d5.firebasestorage.app",
    messagingSenderId: "397343842087",
    appId: "1:397343842087:web:6d07ef1764740676445302",
    measurementId: "G-7X6VDGRGFZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Configure Auth for localhost
if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    auth.useDeviceLanguage();
    auth._config.authDomain = window.location.host;
}

// Configure Google Auth Provider
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/youtube.readonly');
provider.setCustomParameters({
    prompt: 'select_account'
});

export { auth, provider, signInWithPopup, onAuthStateChanged, signOut };
