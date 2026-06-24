/**
 * Firebase Admin SDK — for server-side Firestore operations
 *
 * The Admin SDK bypasses Firestore security rules, ensuring writes
 * always succeed from API routes (callback, webhook, verify-payment).
 *
 * Required env vars (from Firebase Console → Project Settings → Service Accounts):
 *   FIREBASE_ADMIN_PROJECT_ID
 *   FIREBASE_ADMIN_CLIENT_EMAIL
 *   FIREBASE_ADMIN_PRIVATE_KEY
 */

import { initializeApp, cert, getApps, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

let adminApp: App;

function getAdminApp(): App {
    if (!getApps().length) {
        const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

        if (clientEmail && privateKey) {
            adminApp = initializeApp({
                credential: cert({ projectId, clientEmail, privateKey }),
            });
            console.log("Firebase Admin SDK initialized with service account credentials");
        } else {
            console.warn(
                "⚠️ Firebase Admin SDK: FIREBASE_ADMIN_CLIENT_EMAIL and/or FIREBASE_ADMIN_PRIVATE_KEY are missing!",
                "\n  → Payment status updates (callback/webhook/verify) will FAIL on Vercel/local dev.",
                "\n  → Go to Firebase Console → Project Settings → Service Accounts → Generate new private key",
                "\n  → Add FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY to your .env.local"
            );
            // Fallback: initialize without credentials (ONLY works on Google Cloud environments like Cloud Run)
            adminApp = initializeApp({ projectId });
        }
    }
    return getApps()[0];
}

export function getAdminDb(): Firestore {
    return getFirestore(getAdminApp());
}
