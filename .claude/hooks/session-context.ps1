$ErrorActionPreference = "SilentlyContinue"

$projectRoot = $env:CLAUDE_PROJECT_DIR
if ([string]::IsNullOrWhiteSpace($projectRoot)) {
  $projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}

Write-Output "DUKENIM SHARED CONTEXT - injected automatically for Claude Code."
Write-Output "Repository files and Git are the continuity layer shared with Codex; chat transcripts are not shared."

$contextFiles = @(
  "PROJECT_STATE.md",
  "DECISIONS.md",
  "AI_HANDOFF.md",
  "marketing/CONTEXT.md"
)

foreach ($relativePath in $contextFiles) {
  $path = Join-Path $projectRoot $relativePath
  if (Test-Path -LiteralPath $path) {
    Write-Output "`n===== $relativePath ====="
    Get-Content -LiteralPath $path -Encoding UTF8
  }
}

Write-Output "`n===== CURRENT GIT STATUS ====="
git -C $projectRoot status --short

Write-Output "`n===== RECENT COMMITS ====="
git -C $projectRoot log -5 --oneline

Write-Output "`nBefore material work, verify repository evidence. After material work, update AI_HANDOFF.md. Never write secrets or personal data into shared context."
