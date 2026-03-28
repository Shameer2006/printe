/**
 * Zoho Payments Auth Helper
 * 
 * Uses the Zoho Payments API Key for authentication.
 * The API key is obtained from: Zoho Payments → Settings → Developer Space → API Keys
 * 
 * If you need OAuth-based auth in the future, uncomment the OAuth section below.
 */

export function getZohoApiKey(): string {
    const apiKey = process.env.NEXT_PUBLIC_ZOHO_API_KEY;

    if (!apiKey) {
        throw new Error("NEXT_PUBLIC_ZOHO_API_KEY not configured in .env");
    }

    return apiKey;
}

// --- OAuth Token Helper (kept for reference if needed) ---
// let cachedToken: { token: string; expiresAt: number } | null = null;
//
// export async function getZohoAccessToken(): Promise<string> {
//     if (cachedToken && Date.now() < cachedToken.expiresAt - 5 * 60 * 1000) {
//         return cachedToken.token;
//     }
//
//     const clientId = process.env.ZOHO_CLIENT_ID;
//     const clientSecret = process.env.ZOHO_CLIENT_SECRET;
//     const refreshToken = process.env.ZOHO_REFRESH_TOKEN;
//
//     if (!clientId || !clientSecret || !refreshToken) {
//         throw new Error("Zoho OAuth credentials not configured");
//     }
//
//     const response = await fetch("https://accounts.zoho.in/oauth/v2/token", {
//         method: "POST",
//         headers: { "Content-Type": "application/x-www-form-urlencoded" },
//         body: new URLSearchParams({
//             grant_type: "refresh_token",
//             client_id: clientId,
//             client_secret: clientSecret,
//             refresh_token: refreshToken,
//         }),
//     });
//
//     const data = await response.json();
//
//     if (data.error) {
//         throw new Error(`Zoho token refresh failed: ${data.error}`);
//     }
//
//     cachedToken = {
//         token: data.access_token,
//         expiresAt: Date.now() + data.expires_in * 1000,
//     };
//
//     return cachedToken.token;
// }
