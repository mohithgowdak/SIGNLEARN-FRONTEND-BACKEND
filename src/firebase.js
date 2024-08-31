import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import 'firebase/compat/firestore';
const firebaseConfig = {
  apiKey: "AIzaSyCgVX1PyL0HIgD2Y8SOc6i8u6cVb2Kk0G0",
  authDomain: "sign-language-learning-d0af4.firebaseapp.com",
  databaseURL: "https://sign-language-learning-d0af4-default-rtdb.firebaseio.com",
  projectId: "sign-language-learning-d0af4",
  storageBucket: "sign-language-learning-d0af4.appspot.com",
  messagingSenderId: "876531022026",
  appId: "1:876531022026:web:0b021defaf2ee10e2c5c33",
  measurementId: "G-V678780N2Y"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
export { firebase, auth, db};