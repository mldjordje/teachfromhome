param(
  [string]$ProjectRef = "ihgxpkbnhqiezhdwbgjr",
  [string]$DbPassword = ""
)

$ErrorActionPreference = "Stop"
$env:Path = "C:\Program Files\nodejs;$env:Path"

if ([string]::IsNullOrWhiteSpace($DbPassword)) {
  throw "Missing -DbPassword. Example: .\supabase\deploy-all.ps1 -DbPassword 'YOUR_DB_PASSWORD'"
}

Write-Host "Linking project $ProjectRef..."
& "C:\Program Files\nodejs\npx.cmd" supabase link --project-ref $ProjectRef --password $DbPassword

Write-Host "Applying migrations..."
& "C:\Program Files\nodejs\npx.cmd" supabase db push

$functions = @(
  "teacher_submit_phase1",
  "teacher_create_phase2_submission",
  "teacher_apply_referral_code",
  "admin_move_to_phase2",
  "admin_reject_phase1",
  "admin_review_phase2",
  "create_analytics_event",
  "admin_mark_referral_eligible",
  "admin_approve_referral_reward"
)

foreach ($fn in $functions) {
  Write-Host "Deploying function: $fn"
  & "C:\Program Files\nodejs\npx.cmd" supabase functions deploy $fn --no-verify-jwt
}

Write-Host "Done."
