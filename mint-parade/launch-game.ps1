param([switch]$NoBrowser)

$ErrorActionPreference = 'Stop'
$gameRoot = $PSScriptRoot
$serverPath = Join-Path $gameRoot 'serve.mjs'
$runtimePath = Join-Path $gameRoot 'runtime\node.exe'

function Test-GameServer([int]$Port) {
    try {
        $reply = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/__game_health" -TimeoutSec 1
        return $reply.game -eq 'mint-parade' -and $reply.root -eq $gameRoot
    } catch { return $false }
}

function Open-Game([int]$Port) {
    $gameUrl = "http://127.0.0.1:$Port/mint-parade/"
    if (-not $NoBrowser) { Start-Process $gameUrl }
    Write-Output $gameUrl
}

try {
    if (-not (Test-Path -LiteralPath $serverPath)) { throw 'Game files are missing. Keep the whole game folder together.' }
    # Reuse only a server for this exact folder; unrelated apps keep their ports.
    $listeners = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
        Where-Object { $_.LocalAddress -eq '127.0.0.1' -and $_.LocalPort -ge 4175 -and $_.LocalPort -le 4195 })
    foreach ($listener in $listeners) {
        if (Test-GameServer $listener.LocalPort) {
            Open-Game $listener.LocalPort
            exit 0
        }
    }
    if (-not (Test-Path -LiteralPath $runtimePath)) {
        $runtimePath = (Get-Command node.exe -ErrorAction Stop).Source
    }
    $logRoot = Join-Path $gameRoot 'launcher-logs'
    New-Item -ItemType Directory -Path $logRoot -Force | Out-Null
    foreach ($gamePort in 4175..4195) {
        if ($listeners.LocalPort -contains $gamePort) { continue }
        $logId = [Guid]::NewGuid().ToString('N')
        $stdoutPath = Join-Path $logRoot "$logId.log"
        $stderrPath = Join-Path $logRoot "$logId-error.log"
        $previousPort = $env:PORT
        try {
            $env:PORT = [string]$gamePort
            $server = Start-Process -FilePath $runtimePath -ArgumentList 'serve.mjs' -WorkingDirectory $gameRoot -WindowStyle Hidden -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath -PassThru
        } finally { $env:PORT = $previousPort }
        for ($attempt = 0; $attempt -lt 40; $attempt++) {
            if (Test-GameServer $gamePort) {
                Open-Game $gamePort
                exit 0
            }
            if ($server.HasExited) { break }
            Start-Sleep -Milliseconds 150
        }
        if (-not $server.HasExited) {
            throw "Game server did not become ready. See $stderrPath"
        }
        $serverError = Get-Content -LiteralPath $stderrPath -Raw -ErrorAction SilentlyContinue
        if ($serverError -notmatch 'EADDRINUSE') { throw "Game server failed: $serverError" }
    }
    throw 'No available game port (4175-4195).'
} catch {
    Write-Host "Could not start the game: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
