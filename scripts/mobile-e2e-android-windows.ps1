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

function Get-ConnectedDeviceSerials {
  $lines = & $script:AdbExecutable devices

  return $lines |
    Select-Object -Skip 1 |
    Where-Object { $_ -match "`tdevice$" } |
    ForEach-Object { ($_ -split "`t")[0].Trim() } |
    Where-Object { $_ }
}

function Get-EmulatorSerials {
  return Get-ConnectedDeviceSerials | Where-Object { $_ -like "emulator-*" }
}

function Get-EmulatorAvdName {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Serial
  )

  try {
    $lines = & $script:AdbExecutable -s $Serial emu avd name 2>$null
    foreach ($line in $lines) {
      $trimmed = $line.Trim()
      if ($trimmed -and $trimmed -ne "OK") {
        return $trimmed
      }
    }
  } catch {
  }

  return $null
}

function Wait-ForAndroidDevice {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Serial,
    [int]$TimeoutSeconds = 240
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    Start-Sleep -Seconds 5
    $devices = Get-ConnectedDeviceSerials
    $bootCompleted = ""

    try {
      $bootCompleted = (& $script:AdbExecutable -s $Serial shell getprop sys.boot_completed 2>$null).Trim()
    } catch {
      $bootCompleted = ""
    }

    if (($devices -contains $Serial) -and $bootCompleted -eq "1") {
      return
    }
  } while ((Get-Date) -lt $deadline)

  throw "Android device $Serial did not become ready within $TimeoutSeconds seconds."
}

function Find-RunningEmulatorSerial {
  param(
    [string]$AvdName
  )

  $emulatorSerials = Get-EmulatorSerials
  if (-not $emulatorSerials) {
    return $null
  }

  if ($AvdName) {
    foreach ($serial in $emulatorSerials) {
      if ((Get-EmulatorAvdName -Serial $serial) -eq $AvdName) {
        return $serial
      }
    }
    return $null
  }

  if ($emulatorSerials.Count -eq 1) {
    return $emulatorSerials[0]
  }

  throw "Multiple Android emulators are connected. Pass -AvdName to select one."
}

function Start-AndroidEmulator {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ResolvedAvdName,
    [string[]]$ExistingEmulatorSerials
  )

  $emulatorOutLog = Join-Path $logDir "mobile-e2e-emulator.out.log"
  $emulatorErrLog = Join-Path $logDir "mobile-e2e-emulator.err.log"

  Start-Process -FilePath $script:EmulatorExecutable -ArgumentList "-avd", $ResolvedAvdName, "-no-snapshot-load" -RedirectStandardOutput $emulatorOutLog -RedirectStandardError $emulatorErrLog | Out-Null

  $deadline = (Get-Date).AddSeconds(240)
  do {
    Start-Sleep -Seconds 5
    $currentEmulatorSerials = Get-EmulatorSerials
    foreach ($serial in $currentEmulatorSerials) {
      $matchesAvd =
        -not $ResolvedAvdName -or
        (Get-EmulatorAvdName -Serial $serial) -eq $ResolvedAvdName
      if (-not $matchesAvd) {
        continue
      }

      if (($ExistingEmulatorSerials -notcontains $serial) -or $currentEmulatorSerials.Count -eq 1) {
        try {
          $bootCompleted = (& $script:AdbExecutable -s $serial shell getprop sys.boot_completed 2>$null).Trim()
          if ($bootCompleted -eq "1") {
            return $serial
          }
        } catch {
        }
      }
    }
  } while ((Get-Date) -lt $deadline)

  throw "Android emulator $ResolvedAvdName did not become ready within 240 seconds."
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
$targetDeviceSerial = $null

try {
  $targetDeviceSerial = Find-RunningEmulatorSerial -AvdName $AvdName
  if (-not $targetDeviceSerial) {
    $resolvedAvdName = Resolve-AvdName -ExplicitName $AvdName
    $existingEmulatorSerials = @(Get-EmulatorSerials)
    $targetDeviceSerial = Start-AndroidEmulator -ResolvedAvdName $resolvedAvdName -ExistingEmulatorSerials $existingEmulatorSerials
    $startedEmulator = $true
  }
  Wait-ForAndroidDevice -Serial $targetDeviceSerial

  if (-not $SkipBackend) {
    if (-not (Test-ListeningPort -Port $ApiPort)) {
      $backendOutLog = Join-Path $logDir "mobile-e2e-server.out.log"
      $backendErrLog = Join-Path $logDir "mobile-e2e-server.err.log"
      $backendCommand = "Set-Location '$repoRoot'; `$env:API_PORT='$ApiPort'; pnpm mobile:e2e:server"

      $backendProcess = Start-Process -FilePath "powershell" -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $backendCommand -RedirectStandardOutput $backendOutLog -RedirectStandardError $backendErrLog -PassThru
    }

    Wait-ForBackend -Port $ApiPort
  }

  & $script:AdbExecutable -s $targetDeviceSerial install -r $resolvedApkPath
  if ($LASTEXITCODE -ne 0) {
    throw "adb install failed."
  }

  & $script:AdbExecutable -s $targetDeviceSerial shell monkey -p $AppId -c android.intent.category.LAUNCHER 1 | Out-Null
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

  if ($startedEmulator -and $targetDeviceSerial) {
    try {
      & $script:AdbExecutable -s $targetDeviceSerial emu kill | Out-Null
    } catch {
    }
  }
}
