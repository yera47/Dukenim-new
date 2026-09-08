param([switch]$DisableAutoUpgrade)
$ErrorActionPreference = 'Stop'
$subscriptionId = '1c17bd82-2de0-4bf7-8c59-baf6ac91a018'
$tenantId = 'fc24c2a2-ee64-4c1e-a78b-71916ca9b4d7'
$cli = Get-Command az -ErrorAction SilentlyContinue
if (-not $cli) { throw 'Azure CLI is not installed or not on PATH.' }
$accountJson = & $cli.Source account show --output json --only-show-errors
if ($LASTEXITCODE -ne 0) { throw "Sign in using az login --tenant $tenantId before running this script." }
$account = $accountJson | ConvertFrom-Json
if ($account.id -ne $subscriptionId -or $account.tenantId -ne $tenantId) { throw 'Wrong Azure subscription or directory. No changes made.' }
$baseUrl = "https://management.azure.com/subscriptions/$subscriptionId/providers/Microsoft.CognitiveServices/quotaTiers"
$listUrl = "${baseUrl}?api-version=2025-10-01-preview"
$beforeJson = & $cli.Source rest --method get --url $listUrl --output json --only-show-errors
if ($LASTEXITCODE -ne 0) { throw 'Unable to read quota policy. No changes made.' }
$before = $beforeJson | ConvertFrom-Json
$current = @($before.value | Where-Object name -eq 'default')
if ($current.Count -ne 1) { throw 'Default quota policy was not found. No changes made.' }
$current[0].properties | Select-Object currentTierName,tierUpgradePolicy
if (-not $DisableAutoUpgrade) { return }
if ($current[0].properties.tierUpgradePolicy -ne 'NoAutoUpgrade') {
  # Keep JSON quoting portable across Windows PowerShell versions. Contains no secrets.
  $bodyPath = Join-Path $PSScriptRoot 'azure-quota-no-auto-upgrade.json'
  & $cli.Source rest --method patch --url "${baseUrl}/default?api-version=2025-10-01-preview" --body "@$bodyPath" --output none --only-show-errors
  if ($LASTEXITCODE -ne 0) { throw 'Azure did not confirm the policy update.' }
}
$afterJson = & $cli.Source rest --method get --url $listUrl --output json --only-show-errors
if ($LASTEXITCODE -ne 0) { throw 'Unable to verify the policy. Do not report success.' }
$verified = @((($afterJson | ConvertFrom-Json).value) | Where-Object name -eq 'default')
if ($verified.Count -ne 1 -or $verified[0].properties.tierUpgradePolicy -ne 'NoAutoUpgrade') { throw 'NoAutoUpgrade was not verified.' }
$verified[0].properties | Select-Object currentTierName,tierUpgradePolicy
Write-Output 'Verified: automatic quota upgrades disabled. This does not make inference free or cap billing.'
