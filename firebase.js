/* =====================================================================
   firebase.js  —  Semua urusan Firebase untuk Catatan Keuangan
   (konfigurasi, login/daftar, Google, dan penyimpanan data Firestore)

   CARA SETUP (sekali saja)
   1. Buka https://console.firebase.google.com  →  Add project.
   2. Project settings (ikon roda gigi) → Your apps → ikon Web  </>  →
      daftarkan app, lalu salin objek firebaseConfig ke bawah ini.
   3. Build → Authentication → Get started → Sign-in method:
        - aktifkan "Email/Password"
        - aktifkan "Google" (isi email dukungan proyek)
   4. Build → Firestore Database → Create database (pilih lokasi, mis.
      asia-southeast2 Jakarta). Lalu buka tab Rules dan tempel:

        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            match /users/{uid} {
              allow read, write: if request.auth != null
                                 && request.auth.uid == uid;
            }
          }
        }

      Aturan ini membuat setiap orang hanya bisa membaca dan menulis
      datanya sendiri.
   5. Authentication → Settings → Authorized domains: pastikan domain
      tempat web ini dibuka ada di daftar ("localhost" sudah ada).
   6. Jalankan lewat server (BUKAN klik dua kali file .html), misalnya:
        npx serve .          atau ekstensi "Live Server" di VS Code,
      atau deploy ke Firebase Hosting.
   ===================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

/* ---------- 1. GANTI dengan konfigurasi proyekmu ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyAq5JpLfWFkX75p6-2cziTPKSdh0SpUNVY",
  authDomain: "keuangan-10d29.firebaseapp.com",
  projectId: "keuangan-10d29",
  storageBucket: "keuangan-10d29.firebasestorage.app",
  messagingSenderId: "690491575043",
  appId: "1:690491575043:web:6219100db768da74c93736",
};

export const isConfigured = !String(firebaseConfig.apiKey).startsWith("ISI_");

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.languageCode = "id"; // email reset kata sandi berbahasa Indonesia
const db = getFirestore(app);

/* ---------- 2. Autentikasi ---------- */

// Dipanggil setiap kali status login berubah (termasuk saat halaman dibuka).
export const onAuthChange = (cb) => onAuthStateChanged(auth, cb);

export async function register(email, password, name) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (name) {
    try { await updateProfile(cred.user, { displayName: name }); } catch (e) {}
  }
  return cred.user;
}

export const login = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

export async function loginGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    return await signInWithPopup(auth, provider);
  } catch (e) {
    // Beberapa browser HP memblokir popup → pindah ke mode redirect.
    if (
      e.code === "auth/popup-blocked" ||
      e.code === "auth/operation-not-supported-in-this-environment"
    ) {
      return signInWithRedirect(auth, provider);
    }
    throw e;
  }
}

export const resetPassword = (email) => sendPasswordResetEmail(auth, email);
export const logout = () => signOut(auth);

/* ---------- 3. Data (Firestore: users/{uid}) ---------- */

const userDoc = (uid) => doc(db, "users", uid);

// Mendengarkan perubahan data secara realtime (sinkron antar perangkat).
// cb(data | null, metadata)  —  data = null jika dokumen belum ada.
export function subscribeData(uid, cb, onError) {
  return onSnapshot(
    userDoc(uid),
    (snap) => cb(snap.exists() ? snap.data() : null, snap.metadata),
    onError
  );
}

// Menyimpan seluruh data pengguna: { salary, items, log }.
export function saveData(uid, data) {
  const clean = JSON.parse(JSON.stringify(data)); // buang nilai undefined
  return setDoc(userDoc(uid), { ...clean, updatedAt: serverTimestamp() });
}
