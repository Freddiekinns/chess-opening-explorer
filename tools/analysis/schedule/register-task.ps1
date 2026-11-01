<#
Registers the monthly popularity-stats refresh (refresh.py) as a Windows
scheduled task for the current user: at logon and daily at 09:00, each
catching up as soon as possible after a missed start.

First sets up %LOCALAPPDATA%\openingbook: a worktree of this repository,
detached at origin/main, and a Python venv from its requirements.txt. The task
runs refresh.py from that worktree, which resets to origin/main on every run,
so it only ever runs merged code and never touches this checkout.

    .\register-task.ps1              # set up, register the task
    .\register-task.ps1 -Unregister  # remove the task (worktree, venv and logs stay)
#>
param([switch]$Unregister)

$ErrorActionPreference = 'Stop'
$TaskName = 'Opening Book popularity refresh'

if ($Unregister) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  return
}

$Base = Join-Path $env:LOCALAPPDATA 'openingbook'
$Worktree = Join-Path $Base 'worktree'
$Venv = Join-Path $Base 'venv'
$Repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path

New-Item -ItemType Directory -Force $Base | Out-Null
git -C $Repo fetch --quiet origin main
if ($LASTEXITCODE -ne 0) { throw 'git fetch failed' }
if (-not (Test-Path (Join-Path $Worktree '.git'))) {
  git -C $Repo worktree add --detach $Worktree origin/main
  if ($LASTEXITCODE -ne 0) { throw 'git worktree add failed' }
}
$Analysis = Join-Path $Worktree 'tools\analysis'
if (-not (Test-Path (Join-Path $Analysis 'refresh.py'))) {
  throw 'refresh.py is not on origin/main yet: merge it before registering'
}
if (-not (Test-Path (Join-Path $Venv 'Scripts\python.exe'))) {
  py -3 -m venv $Venv
}
& (Join-Path $Venv 'Scripts\python.exe') -m pip install --quiet -r (Join-Path $Analysis 'requirements.txt')

# pythonw: no console window at every logon.
$Action = New-ScheduledTaskAction `
  -Execute (Join-Path $Venv 'Scripts\pythonw.exe') `
  -Argument "`"$(Join-Path $Analysis 'refresh.py')`"" `
  -WorkingDirectory $Analysis
$Triggers = @(
  (New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"),
  (New-ScheduledTaskTrigger -Daily -At '09:00')
)
# Defaults kept on purpose: no start on battery, and stop on going to battery.
# A run killed mid-month loses only that month's summarising; downloads resume
# and finished summaries are kept.
$Settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -RunOnlyIfNetworkAvailable `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Hours 12)
$Principal = New-ScheduledTaskPrincipal `
  -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Triggers `
  -Settings $Settings -Principal $Principal -Force `
  -Description 'Summarises the latest Lichess month and commits the refreshed popularity stats to a local branch for review. Never pushes.'
