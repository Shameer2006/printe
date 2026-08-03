# Builds .env.local with the three variables that must be set in Vercel.
#
# Deliberately does NOT emit the Zoho variables. They are already correct in Vercel, and
# writing blank placeholders here would wipe working credentials the moment this file is
# pasted into the Vercel dashboard.
#
# Re-run this after rotating the Firebase key — it always picks the newest key file.
#
#   powershell -ExecutionPolicy Bypass -File scripts\make-env.ps1

$ErrorActionPreference = "Stop"

$key = Get-ChildItem "$env:USERPROFILE\Downloads\print-eg-be986-firebase-adminsdk-fbsvc-*.json" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1

if (-not $key) {
    Write-Host "No firebase-adminsdk key found in Downloads." -ForegroundColor Red
    Write-Host "Get one: console.cloud.google.com/iam-admin/serviceaccounts?project=print-eg-be986"
    Write-Host "  -> firebase-adminsdk-fbsvc@... -> Keys -> Add Key -> Create new key -> JSON"
    exit 1
}

$json = Get-Content $key.FullName -Raw | ConvertFrom-Json

if ($json.client_email -notlike "firebase-adminsdk-fbsvc@*") {
    Write-Host "Wrong service account: $($json.client_email)" -ForegroundColor Red
    Write-Host "Only firebase-adminsdk-fbsvc has Firestore access by default."
    exit 1
}

# Base64 so the PEM newlines in private_key survive the trip through a hosting dashboard.
$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($key.FullName))

$cronSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 40 | ForEach-Object { [char]$_ })

$lines = @(
    "FIREBASE_SERVICE_ACCOUNT_JSON=$b64"
    "CRON_SECRET=$cronSecret"
    "NEXT_PUBLIC_BASE_URL=https://printeg.in"
)

$path = Join-Path $PSScriptRoot "..\.env.local" | Resolve-Path -ErrorAction SilentlyContinue
if (-not $path) { $path = Join-Path (Split-Path $PSScriptRoot -Parent) ".env.local" }

# WriteAllText with a BOM-less encoding: Set-Content would prepend a BOM that turns the
# first variable name into garbage when the file is parsed.
[IO.File]::WriteAllText($path, ($lines -join "`n") + "`n", (New-Object Text.UTF8Encoding $false))

Write-Host "Wrote .env.local" -ForegroundColor Green
Write-Host "  key file  : $($key.Name)"
Write-Host "  key id    : $($json.private_key_id.Substring(0,8))..."
if ($json.private_key_id -like "f7478db2*") {
    Write-Host "  WARNING   : this is the key that leaked. Rotate, then re-run." -ForegroundColor Yellow
}
Write-Host ""
Write-Host "Paste into Vercel -> Settings -> Environment Variables (bulk paste supported)."
