import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    appId: "1:659273053220:web:ac9ebe4330ce3309b714b1",
    apiKey: "AIzaSyBhNJCLaIAPKNJsX6bc9irzofZwDUERP84",
    authDomain: "smtpmaster-67b0d.firebaseapp.com",
    projectId: "smtpmaster-67b0d",
    storageBucket: "smtpmaster-67b0d.appspot.com",
    messagingSenderId: "659273053220",
    measurementId: "G-CCJ2B0YHR3"
    };

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);