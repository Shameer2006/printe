# Fills FIREBASE_SERVICE_ACCOUNT_JSON and CRON_SECRET into an existing .env.local.
#
# Everything else in the file is preserved verbatim — this edits two lines, it does not
# regenerate the file. Re-run it after rotating the Firebase key; it always picks up the
# newest key in Downloads.
#
#   powershell -ExecutionPolicy Bypass -File scripts\make-env.ps1

$ErrorActionPreference = "Stop"

$envPath = Join-Path (Split-Path $PSScriptRoot -Parent) ".env.local"
if (-not (Test-Path $envPath)) {
    Write-Host "No .env.local found at $envPath" -ForegroundColor Red
    exit 1
}

$key = Get-ChildItem "$env:USERPROFILE\Downloads\print-eg-be986-firebase-adminsdk-fbsvc-*.json" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1

if (-not $key) {
    Write-Host "No firebase-adminsdk key found in Downloads." -ForegroundColor Red
    Write-Host "Get one: console.cloud.google.com/iam-admin/serviceaccounts?project=print-eg-be986"
    Write-Host "  -> firebase-adminsdk-fbsvc@... -> Keys -> Add Key -> Create new key -> JSON"
    exit 1
}

$json = Get-Content $key.FullName -Raw | ConvertFrom-Json

# printeg-kiosk and friends have no Firestore role by default: the Admin SDK would
# initialise cleanly and then fail every read with PERMISSION_DENIED, which looks
# identical to having no credentials at all.
if ($json.client_email -notlike "firebase-adminsdk-fbsvc@*") {
    Write-Host "Wrong service account: $($json.client_email)" -ForegroundColor Red
    Write-Host "Only firebase-adminsdk-fbsvc carries Firestore access by default."
    exit 1
}

# Base64 so the PEM newlines in private_key survive a hosting dashboard.
$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($key.FullName))

$lines = [IO.File]::ReadAllLines($envPath)
$sawFirebase = $false
$cronKept = $false

$updated = foreach ($line in $lines) {
    if ($line -like "FIREBASE_SERVICE_ACCOUNT_JSON=*") {
        $sawFirebase = $true
        "FIREBASE_SERVICE_ACCOUNT_JSON=$b64"
    }
    elseif ($line -like "CRON_SECRET=*") {
        $existing = $line.Substring("CRON_SECRET=".Length).Trim()
        if ($existing) {
            # Already deployed to Vercel — regenerating would silently break the sweep.
            $cronKept = $true
            $line
        }
        else {
            "CRON_SECRET=" + (-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 40 | ForEach-Object { [char]$_ }))
        }
    }
    else { $line }
}

if (-not $sawFirebase) { $updated += "FIREBASE_SERVICE_ACCOUNT_JSON=$b64" }

# BOM-less: Set-Content would prepend a BOM that corrupts the first variable name.
[IO.File]::WriteAllText($envPath, ($updated -join "`n") + "`n", (New-Object Text.UTF8Encoding $false))

Write-Host "Updated .env.local" -ForegroundColor Green
Write-Host "  key file  : $($key.Name)"
Write-Host "  key id    : $($json.private_key_id.Substring(0,8))..."
Write-Host "  base64    : $($b64.Length) chars"
if ($cronKept) { Write-Host "  cron      : kept existing value" }
if ($json.private_key_id -like "f7478db2*") {
    Write-Host "  WARNING   : this is the key that leaked. Rotate, then re-run." -ForegroundColor Yellow
}
