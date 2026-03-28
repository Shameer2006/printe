/**
 * Zoho Payments OAuth Helper
 *
 * Uses the refresh_token to obtain a fresh access_token automatically.
 * Access tokens expire in ~60 minutes; this module caches the token
 * and refreshes it 5 minutes before expiry.
 */

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getZohoAccessToken(): Promise<string> {
    // Return cached token if it's still valid (with 5-minute buffer)
    if (cachedToken && Date.now() < cachedToken.expiresAt - 5 * 60 * 1000) {
        return cachedToken.token;
    }

    const clientId = process.env.ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;
    const refreshToken = process.env.ZOHO_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
        throw new Error("Zoho OAuth credentials not configured in .env (ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN)");
    }

    const response = await fetch("https://accounts.zoho.in/oauth/v2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "refresh_token",
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
        }),
    });

    const data = await response.json();

    if (data.error) {
        console.error("Zoho token refresh failed:", data);
        throw new Error(`Zoho token refresh failed: ${data.error}. Generate a new refresh token from Zoho API Console.`);
    }

    if (!data.access_token) {
        console.error("No access token in response:", data);
        throw new Error("Failed to obtain access token from Zoho");
    }

    cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000,
    };

    return cachedToken.token;
}
