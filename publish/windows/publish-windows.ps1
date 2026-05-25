param(
  [ValidateSet("amd64")]
  [string]$Arch = "amd64",
  [string]$Version = "",
  [switch]$SkipBuild,
  [switch]$SkipInstaller,
  [switch]$KeepStaging
)

$ErrorActionPreference = "Stop"

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$OutputDir = Join-Path $RootDir "publish\output"
$StagingRoot = Join-Path $RootDir "publish\staging\windows"
$Target = "windows-$Arch"
$StageRoot = Join-Path $StagingRoot $Target
$AppStage = Join-Path $StageRoot "AntBrowser"
$AppBin = Join-Path $RootDir "build\bin\ant-chrome.exe"
$XraySrc = Join-Path $RootDir "bin\xray.exe"
$SingBoxSrc = Join-Path $RootDir "bin\sing-box.exe"
$ConfigSrc = Join-Path $RootDir "publish\config.init.yaml"
$ChromeReadmeSrc = Join-Path $RootDir "chrome\README.md"

function Require-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "required command not found: $Name"
  }
}

if ([string]::IsNullOrWhiteSpace($Version)) {
  $wailsConfig = Get-Content (Join-Path $RootDir "wails.json") -Raw | ConvertFrom-Json
  $Version = (($wailsConfig.info.productVersion) -as [string]).Trim()
  if ([string]::IsNullOrWhiteSpace($Version)) {
    throw "productVersion missing in wails.json"
  }
}

Require-Command node
Require-Command npm
Require-Command go
Require-Command wails
if (-not $SkipInstaller) {
  Require-Command makensis
}

foreach ($file in @($XraySrc, $SingBoxSrc, $ConfigSrc)) {
  if (-not (Test-Path $file -PathType Leaf)) {
    throw "required file missing: $file"
  }
}

Write-Host "========================================"
Write-Host "  Ant Browser Windows Publish"
Write-Host "========================================"
Write-Host "Target : $Target"
Write-Host "Version: $Version"
Write-Host "Root   : $RootDir"
Write-Host ""

if (-not $SkipBuild) {
  Write-Host "[1/4] Installing frontend dependencies..."
  Push-Location (Join-Path $RootDir "frontend")
  try {
    npm ci --prefer-offline --no-audit --no-fund
  } finally {
    Pop-Location
  }

  Write-Host "[2/4] Building frontend assets..."
  Push-Location (Join-Path $RootDir "frontend")
  try {
    npm run build:clean
  } finally {
    Pop-Location
  }

  Write-Host "[3/4] Building Windows app binary with Wails..."
  Remove-Item $AppBin -Force -ErrorAction SilentlyContinue
  Push-Location $RootDir
  try {
    wails build -s -platform "windows/$Arch" -o ant-chrome -webview2 browser
  } finally {
    Pop-Location
  }
} else {
  Write-Host "[WARN] skipping build step"
}

if (-not (Test-Path $AppBin -PathType Leaf)) {
  throw "app binary not found: $AppBin"
}

Write-Host "[4/4] Assembling Windows packages..."
Remove-Item $AppStage -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $AppStage | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $AppStage "bin") | Out-Null
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

Copy-Item $AppBin (Join-Path $AppStage "ant-chrome.exe") -Force
Copy-Item $ConfigSrc (Join-Path $AppStage "config.yaml") -Force
Copy-Item $XraySrc (Join-Path $AppStage "bin\xray.exe") -Force
Copy-Item $SingBoxSrc (Join-Path $AppStage "bin\sing-box.exe") -Force

if (Test-Path $ChromeReadmeSrc -PathType Leaf) {
  New-Item -ItemType Directory -Force -Path (Join-Path $AppStage "chrome") | Out-Null
  Copy-Item $ChromeReadmeSrc (Join-Path $AppStage "chrome\README.md") -Force
}

$ZipName = "AntBrowser-$Version-windows-$Arch.zip"
$ZipPath = Join-Path $OutputDir $ZipName
Remove-Item $ZipPath -Force -ErrorAction SilentlyContinue
Compress-Archive -Path $AppStage -DestinationPath $ZipPath -Force

Write-Host "Artifacts generated:"
Write-Host "  - $ZipPath"

if (-not $SkipInstaller) {
  Push-Location (Join-Path $RootDir "publish")
  try {
    & makensis "/DVERSION=$Version" "/DSTAGINGDIR=$AppStage" "installer.nsi"
  } finally {
    Pop-Location
  }
  $SetupPath = Join-Path $OutputDir "AntBrowser-Setup-$Version.exe"
  if (-not (Test-Path $SetupPath -PathType Leaf)) {
    throw "installer not found: $SetupPath"
  }
  Write-Host "  - $SetupPath"
}

if (-not $KeepStaging) {
  Remove-Item $StageRoot -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "Done."
