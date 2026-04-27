#Requires -Version 5.1
<#
.SYNOPSIS
    Auto-compute version tag and push it, triggering GitHub Actions Docker build.

.DESCRIPTION
    Version format: v{yearDiff}.{MMdd}.{seq}
    - yearDiff = current year - 2025
    - MMdd     = month + day
    - seq      = incremental counter for tags with same prefix (01-based)
    Example first push of the day: v1.0422.01
#>

$ErrorActionPreference = 'Stop'

$now       = Get-Date
$yearDiff  = $now.Year - 2025
$datePart  = $now.ToString('MMdd')
$tagPrefix = "v$yearDiff.$datePart."

Write-Host "Fetching tag list..." -ForegroundColor Cyan

git fetch --tags origin 2>$null

$allTags = git tag -l "$($tagPrefix)*" 2>$null
$allTags = @($allTags) | Where-Object { $_ -match "^$([regex]::Escape($tagPrefix))\d+$" }

$nextSeq = 1
if ($allTags) {
    $maxSeq = $allTags | ForEach-Object {
        $_.Substring($tagPrefix.Length) -as [int]
    } | Measure-Object -Maximum | Select-Object -ExpandProperty Maximum

    $nextSeq = $maxSeq + 1
}

$newTag = $tagPrefix + ([int]$nextSeq).ToString('00')

Write-Host ""
Write-Host "Tag to create and push: " -NoNewline
Write-Host $newTag -ForegroundColor Green
Write-Host ""

git tag $newTag
git push origin $newTag

$remoteUrl = git remote get-url origin 2>$null
$repoPath  = if ($remoteUrl -match '[:/]([^/]+/[^/]+?)(?:\.git)?$') { $Matches[1] } else { '<owner>/<repo>' }

$aliyunRegistry = "crpi-24eqfvp93x6tspe9.cn-shenzhen.personal.cr.aliyuncs.com"
$aliyunNs       = $env:ALIYUN_NAMESPACE
if (-not $aliyunNs) { $aliyunNs = "<namespace>" }

Write-Host "Tag pushed. GitHub Actions will start building." -ForegroundColor Green
Write-Host "Image addresses:"
Write-Host "  GHCR:" -ForegroundColor Gray
Write-Host "    ghcr.io/bingneo/sciblock-occult-api`:$newTag" -ForegroundColor Yellow
Write-Host "    ghcr.io/bingneo/sciblock-occult-web`:$newTag" -ForegroundColor Yellow
Write-Host "  Aliyun ACR:" -ForegroundColor Gray
Write-Host "    $aliyunRegistry/$aliyunNs/sciblock-occult-api`:$newTag" -ForegroundColor Yellow
Write-Host "    $aliyunRegistry/$aliyunNs/sciblock-occult-web`:$newTag" -ForegroundColor Yellow

$env:GHCR_TAG = $newTag
Write-Host ""
Write-Host "Env var GHCR_TAG = $newTag" -ForegroundColor Cyan
Write-Host "To persist, add to your PowerShell profile:"
Write-Host "  `$env:GHCR_TAG = '$newTag'" -ForegroundColor Gray
