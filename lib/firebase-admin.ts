/**
 * Firebase Admin SDK — for server-side Firestore operations
 *
 * The Admin SDK bypasses Firestore security rules, ensuring writes
 * always succeed from API routes (callback, webhook).
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
        } else {
            // Fallback: initialize without credentials (works on Google Cloud environments)
            adminApp = initializeApp({ projectId });
        }
    }
    return getApps()[0];
}

export function getAdminDb(): Firestore {
    return getFirestore(getAdminApp());
}
