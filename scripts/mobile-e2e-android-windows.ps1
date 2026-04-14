param(
  [Parameter(Mandatory = $true)]
  [string]$ApkPath,
  [string]$AvdName,
  [string]$MaestroPath,
  [int]$ApiPort = 3536,
  [string]$AppId = "com.actiko.app",
  [switch]$SkipBackend
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$script:AdbExecutable = ""
$script:EmulatorExecutable = ""

function Get-RepoRoot {
  return [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
}

function Resolve-CommandPath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$CommandName
  )

  $command = Get-Command $CommandName -ErrorAction SilentlyContinue
  if ($null -eq $command) {
    throw "Command not found: $CommandName"
  }

  return $command.Source
}

function Wait-ForAndroidDevice {
  param(
    [int]$TimeoutSeconds = 240
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    Start-Sleep -Seconds 5
    $devices = & $script:AdbExecutable devices
    $bootCompleted = ""

    try {
      $bootCompleted = (& $script:AdbExecutable shell getprop sys.boot_completed 2>$null).Trim()
    } catch {
      $bootCompleted = ""
    }

    if ($devices -match "`tdevice" -and $bootCompleted -eq "1") {
      return
    }
  } while ((Get-Date) -lt $deadline)

  throw "Android emulator did not become ready within $TimeoutSeconds seconds."
}

function Wait-ForBackend {
  param(
    [int]$Port,
    [int]$TimeoutSeconds = 120
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  $uri = "http://localhost:$Port/auth/login"
  $body = '{"login_id":"e2e@example.com","password":"password123"}'

  do {
    Start-Sleep -Seconds 2
    try {
      $response = Invoke-RestMethod -Method Post -Uri $uri -ContentType "application/json" -Body $body -TimeoutSec 3
      if ($response.token) {
        return
      }
    } catch {
    }
  } while ((Get-Date) -lt $deadline)

  throw "Mobile E2E backend did not become ready on port $Port."
}

function Resolve-MaestroExecutable {
  param(
    [string]$ExplicitPath
  )

  if ($ExplicitPath) {
    $resolved = Resolve-Path $ExplicitPath -ErrorAction Stop
    return $resolved.Path
  }

  $command = Get-Command maestro -ErrorAction SilentlyContinue
  if ($null -ne $command) {
    return $command.Source
  }

  throw "Maestro CLI was not found. Install Maestro or pass -MaestroPath."
}

function Resolve-AvdName {
  param(
    [string]$ExplicitName
  )

  if ($ExplicitName) {
    return $ExplicitName
  }

  $avds = (& $script:EmulatorExecutable -list-avds) | Where-Object { $_.Trim().Length -gt 0 }
  if ($avds.Count -eq 1) {
    return $avds[0].Trim()
  }

  throw "Could not infer a single AVD. Pass -AvdName."
}

function Test-ListeningPort {
  param(
    [int]$Port
  )

  $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  return $null -ne $connections
}

$repoRoot = Get-RepoRoot
$logDir = Join-Path $repoRoot "tmp/process-logs"
if (-not (Test-Path $logDir)) {
  New-Item -ItemType Directory -Path $logDir | Out-Null
}

$resolvedApkPath = (Resolve-Path $ApkPath -ErrorAction Stop).Path
$script:AdbExecutable = Resolve-CommandPath -CommandName "adb"
$script:EmulatorExecutable = Resolve-CommandPath -CommandName "emulator"
$maestroExecutable = Resolve-MaestroExecutable -ExplicitPath $MaestroPath

$backendProcess = $null
$startedEmulator = $false

try {
  $devices = & $script:AdbExecutable devices
  if ($devices -notmatch "`tdevice") {
    $resolvedAvdName = Resolve-AvdName -ExplicitName $AvdName
    $emulatorOutLog = Join-Path $logDir "mobile-e2e-emulator.out.log"
    $emulatorErrLog = Join-Path $logDir "mobile-e2e-emulator.err.log"

    Start-Process -FilePath $script:EmulatorExecutable -ArgumentList "-avd", $resolvedAvdName, "-no-snapshot-load" -RedirectStandardOutput $emulatorOutLog -RedirectStandardError $emulatorErrLog | Out-Null
    $startedEmulator = $true
  }
  Wait-ForAndroidDevice

  if (-not $SkipBackend) {
    if (-not (Test-ListeningPort -Port $ApiPort)) {
      $backendOutLog = Join-Path $logDir "mobile-e2e-server.out.log"
      $backendErrLog = Join-Path $logDir "mobile-e2e-server.err.log"
      $backendCommand = "Set-Location '$repoRoot'; `$env:API_PORT='$ApiPort'; pnpm mobile:e2e:server"

      $backendProcess = Start-Process -FilePath "powershell" -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $backendCommand -RedirectStandardOutput $backendOutLog -RedirectStandardError $backendErrLog -PassThru
    }

    Wait-ForBackend -Port $ApiPort
  }

  & $script:AdbExecutable install -r $resolvedApkPath
  if ($LASTEXITCODE -ne 0) {
    throw "adb install failed."
  }

  & $script:AdbExecutable shell monkey -p $AppId -c android.intent.category.LAUNCHER 1 | Out-Null
  Start-Sleep -Seconds 5

  Push-Location (Join-Path $repoRoot "apps/mobile")
  try {
    & $maestroExecutable test ".maestro/smoke.yaml"
    if ($LASTEXITCODE -ne 0) {
      throw "Maestro smoke test failed."
    }
  } finally {
    Pop-Location
  }
} finally {
  if ($null -ne $backendProcess -and -not $backendProcess.HasExited) {
    Stop-Process -Id $backendProcess.Id -Force
  }

  if ($startedEmulator) {
    try {
      & $script:AdbExecutable emu kill | Out-Null
    } catch {
    }
  }
}
