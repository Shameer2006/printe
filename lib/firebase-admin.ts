/**
 * Firebase Admin SDK — for server-side Firestore operations
 *
 * The Admin SDK bypasses Firestore security rules, ensuring writes
 * always succeed from API routes (callback, webhook).
 *
 * Credentials are resolved in this order:
 *   1. FIREBASE_SERVICE_ACCOUNT_JSON  — the whole service-account JSON (raw or base64)
 *   2. FIREBASE_ADMIN_CLIENT_EMAIL + FIREBASE_ADMIN_PRIVATE_KEY (+ FIREBASE_ADMIN_PROJECT_ID)
 *   3. Application Default Credentials — ONLY on a real Google runtime (Cloud Run, GAE,
 *      Cloud Functions) or when GOOGLE_APPLICATION_CREDENTIALS is set.
 *
 * If none are available this throws instead of returning a credential-less app.
 * A credential-less app on a non-Google host (Vercel, Netlify, a VPS) *looks* fine at
 * init time and then fails on every read and write — which is exactly how an order
 * silently stays PENDING after a successful payment. Fail loudly here instead.
 */

import { initializeApp, cert, getApps, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

const ADMIN_APP_NAME = "printeg-admin";

/**
 * Env vars carrying a PEM key get mangled in a dozen ways between a service-account
 * file and a hosting dashboard. Handle the common ones: literal `\n` escapes, wrapping
 * quotes copied along with the value, and base64-encoded keys.
 */
function normalizePrivateKey(raw: string): string {
    let key = raw.trim();

    // Strip a wrapping pair of quotes ("...." or '....') pasted in from a .env file.
    if (
        (key.startsWith('"') && key.endsWith('"')) ||
        (key.startsWith("'") && key.endsWith("'"))
    ) {
        key = key.slice(1, -1);
    }

    // Turn literal backslash-n sequences into real newlines.
    key = key.replace(/\\n/g, "\n");

    // Some dashboards mangle newlines badly enough that people base64 the key instead.
    if (!key.includes("BEGIN")) {
        try {
            const decoded = Buffer.from(key, "base64").toString("utf8");
            if (decoded.includes("BEGIN")) key = decoded;
        } catch {
            // Not base64 — fall through and let cert() report the real problem.
        }
    }

    return key.trim();
}

function readServiceAccountJson(): { projectId: string; clientEmail: string; privateKey: string } | null {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
    if (!raw) return null;

    let text = raw;

    // Dashboards and .env parsers routinely store a value with its surrounding quotes.
    if (
        (text.startsWith('"') && text.endsWith('"')) ||
        (text.startsWith("'") && text.endsWith("'"))
    ) {
        text = text.slice(1, -1).trim();
    }

    if (!text.startsWith("{")) {
        // Buffer.from(..., "base64") never throws — it silently skips characters it does
        // not recognise and returns whatever it managed to decode. So a value that was
        // truncated by a bad copy-paste, or wrapped across lines by an editor, produces
        // plausible-looking garbage rather than an error, and the real cause only shows
        // up as an opaque "not JSON" further down. Strip whitespace, then verify the
        // decode round-trips before trusting it.
        const compact = text.replace(/\s+/g, "");
        const decoded = Buffer.from(compact, "base64").toString("utf8");

        if (!decoded.trimStart().startsWith("{")) {
            throw new Error(
                `FIREBASE_SERVICE_ACCOUNT_JSON is neither raw JSON nor valid base64 ` +
                `(${raw.length} chars, starts with "${raw.slice(0, 4)}"). ` +
                `A service-account key base64-encodes to roughly 3,000 characters and begins with "eyJ" — ` +
                `a much shorter value means the paste was truncated. Re-copy the whole value.`
            );
        }
        text = decoded;
    }

    let parsed: { project_id?: string; client_email?: string; private_key?: string };
    try {
        parsed = JSON.parse(text);
    } catch {
        throw new Error(
            `FIREBASE_SERVICE_ACCOUNT_JSON could not be parsed as JSON ` +
            `(env value ${raw.length} chars, decoded to ${text.length} chars). ` +
            `Most likely the value was truncated in transit — a complete key is ~2,300 characters of JSON.`
        );
    }

    if (!parsed.client_email || !parsed.private_key) {
        throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is missing client_email or private_key");
    }

    return {
        projectId:
            parsed.project_id ||
            process.env.FIREBASE_ADMIN_PROJECT_ID ||
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
            "",
        clientEmail: parsed.client_email,
        privateKey: normalizePrivateKey(parsed.private_key),
    };
}

/** True when the process is running somewhere that actually provides ADC. */
function hasAmbientGoogleCredentials(): boolean {
    return Boolean(
        process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        process.env.K_SERVICE ||        // Cloud Run
        process.env.FUNCTION_TARGET ||  // Cloud Functions
        process.env.GAE_ENV             // App Engine
    );
}

export type AdminCredentialSource = "service_account_json" | "split_env_vars" | "application_default";

function resolveCredentialSource(): AdminCredentialSource {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()) return "service_account_json";
    if (process.env.FIREBASE_ADMIN_CLIENT_EMAIL && process.env.FIREBASE_ADMIN_PRIVATE_KEY) return "split_env_vars";
    if (hasAmbientGoogleCredentials()) return "application_default";

    throw new Error(
        "Firebase Admin credentials are not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON " +
        "(the service-account JSON, raw or base64), or FIREBASE_ADMIN_CLIENT_EMAIL + " +
        "FIREBASE_ADMIN_PRIVATE_KEY, in the deployment environment. Without these, every " +
        "server-side Firestore write fails and paid orders stay PENDING."
    );
}

function getAdminApp(): App {
    const existing = getApps().find((a) => a.name === ADMIN_APP_NAME);
    if (existing) return existing;

    const projectId =
        process.env.FIREBASE_ADMIN_PROJECT_ID ||
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    const source = resolveCredentialSource();

    if (source === "service_account_json") {
        const sa = readServiceAccountJson()!;
        return initializeApp(
            {
                credential: cert({
                    projectId: sa.projectId || projectId,
                    clientEmail: sa.clientEmail,
                    privateKey: sa.privateKey,
                }),
                projectId: sa.projectId || projectId,
            },
            ADMIN_APP_NAME
        );
    }

    if (source === "split_env_vars") {
        const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL!;
        const privateKey = normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY!);

        if (!privateKey.includes("BEGIN")) {
            throw new Error(
                "FIREBASE_ADMIN_PRIVATE_KEY does not look like a PEM key (no BEGIN marker). " +
                "Paste the full private_key value including the BEGIN/END lines."
            );
        }
        if (!projectId) {
            throw new Error("FIREBASE_ADMIN_PROJECT_ID (or NEXT_PUBLIC_FIREBASE_PROJECT_ID) is not set");
        }

        return initializeApp(
            { credential: cert({ projectId, clientEmail, privateKey }), projectId },
            ADMIN_APP_NAME
        );
    }

    // Real Google runtime — ADC works here.
    return initializeApp({ projectId }, ADMIN_APP_NAME);
}

export function getAdminDb(): Firestore {
    return getFirestore(getAdminApp());
}

/**
 * Non-throwing health probe used by /api/health. Performs a real Firestore round-trip,
 * because initialization succeeding proves nothing about whether the credentials are
 * actually accepted by Google.
 */
export async function checkAdminConnection(): Promise<
    | { ok: true; source: AdminCredentialSource; projectId: string | undefined }
    | { ok: false; error: string; source: AdminCredentialSource | null }
> {
    let source: AdminCredentialSource | null = null;
    try {
        source = resolveCredentialSource();
        const db = getAdminDb();
        // Cheapest possible authenticated read.
        await db.collection("_health").doc("probe").get();
        return {
            ok: true,
            source,
            projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { ok: false, error: message, source };
    }
}
