const path = require('path');
const config = require(path.resolve(__dirname, 'config.json'));

// Import the necessary functions from the Firebase SDKs
const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');

// Your web app's Firebase configuration
// PASTE YOUR COPIED CONFIGURATION FROM STEP 1 HERE
const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: "montagna-bot.firebaseapp.com",
  projectId: "montagna-bot",
  storageBucket: "montagna-bot.firebasestorage.app",
  messagingSenderId: "863666050481",
  appId: "1:863666050481:web:e3ffc27997740ea19e1990",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get a reference to the Firestore database
const db = getFirestore(app);

// Export the database reference to be used in other files
module.exports = { db };