/**
 * Firebase web app configuration (Firebase console > Project settings > Your apps).
 * These values are public by design: every Firebase website ships them to the browser.
 * The data is protected by the security rules in firestore.rules, not by hiding these.
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyCAYgLjNJqU5b3eRZ3E2UkD5GnOr2f__-A',
  authDomain: 'roboticsclass-b0eaf.firebaseapp.com',
  projectId: 'roboticsclass-b0eaf',
  storageBucket: 'roboticsclass-b0eaf.firebasestorage.app',
  messagingSenderId: '625829099365',
  appId: '1:625829099365:web:d7e4db266ceace40be138c',
};

/** Learner logins use a made-up email built from name and class. This domain is never emailed. */
export const LEARNER_EMAIL_DOMAIN = 'learners.wassce-prep.app';
