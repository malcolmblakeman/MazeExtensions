# solve_all.ps1 — solve MazeBench levels in parallel on this machine.
#
# Backends:
#   C    csolve.exe (native BFS/A*, flat 2D model) — no 16M browser cap,
#        GBs of RAM usable. FxE's 19.4M-state A* runs here, impossible in a tab.
#   node engsolve.js / official.js (real engine physics: ice, punchers,
#        lifts, floaters, orange...) — for mechanic levels C can't model.
#
# Usage:
#   .\solve_all.ps1                  # classics (C) + CxO (node A*), throttled
#   .\solve_all.ps1 -All             # also re-solve the 10 engine rooms
#   .\solve_all.ps1 -Only HxF,OxD    # just these
#   .\solve_all.ps1 -Runtime D:\path\to\_runtime -EngineJobs 3
#
# Output: solutions\<ID>.txt (raw path) + PASS/FAIL report (engine-verified,
# optimal length checked where known). Needs node in PATH for node jobs.
param(
  [string]$SolverDir = "",
  [string]$Runtime = "C:\Users\issac\AppData\Local\Temp\opencode\mazebench_pkg\mazebench_cli\_runtime",
  [int]$EngineJobs = 2,
  [switch]$All,
  [string[]]$Only = @()
)

if ($SolverDir -eq "") { $SolverDir = Split-Path -Parent $MyInvocation.MyCommand.Path; }
$LevelsDir = Join-Path $SolverDir "levels"
$SolDir = Join-Path $SolverDir "solutions"
$Csolve = Join-Path $SolverDir "csolve.exe"
$Node = "node"
if (-not (Test-Path -LiteralPath $SolDir)) { New-Item -ItemType Directory -Path $SolDir | Out-Null; }

# id, backend(c|eng|off), solver/cap, expected optimal moves (0 = win-only check)
$Table = @(
  @{ Id = "HxF"; Back = "c";   Mode = "bfs";   Cap = 10; Exp = 88 },
  @{ Id = "HxH"; Back = "c";   Mode = "bfs";   Cap = 2;  Exp = 56 },
  @{ Id = "GxH"; Back = "c";   Mode = "bfs";   Cap = 2;  Exp = 164 },
  @{ Id = "FxE"; Back = "c";   Mode = "astar"; Cap = 30; Exp = 125 },
  @{ Id = "FxF"; Back = "c";   Mode = "bfs";   Cap = 2;  Exp = 92 },
  @{ Id = "GxG"; Back = "c";   Mode = "bfs";   Cap = 10; Exp = 220 },
  @{ Id = "CxO"; Back = "eng"; Mode = "astar"; Cap = 3;  Exp = 0 }
);
if ($All) {
  $Table += @(
    @{ Id = "JxH"; Back = "eng"; Mode = "bfs";   Cap = 1; Exp = 117 },
    @{ Id = "DxG"; Back = "off"; Mode = "";      Cap = 2; Exp = 202 },
    @{ Id = "JxL"; Back = "eng"; Mode = "bfs";   Cap = 1; Exp = 127 },
    @{ Id = "FxB"; Back = "eng"; Mode = "bfs";   Cap = 1; Exp = 82 },
    @{ Id = "JxG"; Back = "eng"; Mode = "bfs";   Cap = 1; Exp = 134 },
    @{ Id = "OxD"; Back = "eng"; Mode = "bfs";   Cap = 1; Exp = 90 },
    @{ Id = "HxC"; Back = "eng"; Mode = "bfs";   Cap = 1; Exp = 81 },
    @{ Id = "JxE"; Back = "eng"; Mode = "astar"; Cap = 2; Exp = 174 },
    @{ Id = "IxI"; Back = "eng"; Mode = "bfs";   Cap = 1; Exp = 34 },
    @{ Id = "NxE"; Back = "eng"; Mode = "bfs";   Cap = 1; Exp = 39 }
  );
}
if ($Only.Count -gt 0) { $Table = @($Table | Where-Object { $Only -contains $_.Id }); }
if ($Table.Count -eq 0) { Write-Output "nothing selected"; exit 1; }

$NodeMem = "5120"
$Jobs = @()
foreach ($t in $Table) {
  $id = $t.Id
  if ($t.Back -eq "c") {
    $lvl = Join-Path $LevelsDir ($id + ".lvl")
    $Jobs += Start-Job -Name ("c_" + $id) -ArgumentList @($Csolve, $lvl, $t.Mode, $t.Cap) -ScriptBlock {
      param($exe, $lvl, $mode, $cap)
      & $exe $lvl $mode $cap 2>&1
    }
    Write-Output ("started C job " + $id + " (" + $t.Mode + ", cap " + $t.Cap + "M)");
  } else {
    while ((Get-Job -State Running | Measure-Object).Count -ge $EngineJobs) { Start-Sleep -Seconds 5; }
    $Jobs += Start-Job -Name ("n_" + $id) -ArgumentList @($SolverDir, $Runtime, $SolDir, $NodeMem, $t) -ScriptBlock {
      param($sdir, $rt, $outdir, $mem, $job)
      $env:MB_RUNTIME = $rt
      $env:MB_OUT = $outdir + "\"
      $nodeArgs = @()
      if ($job.Back -eq "off") { $nodeArgs = @((Join-Path $sdir "official.js"), $job.Id, $job.Cap); }
      else { $nodeArgs = @("--max-old-space-size=" + $mem, (Join-Path $sdir "engsolve.js"), $job.Id, $job.Mode, $job.Cap); }
      & "node" $nodeArgs 2>&1
    }
    Write-Output ("started node job " + $id + " (" + $t.Back + "/" + $t.Mode + ", cap " + $t.Cap + "M)");
  }
}
Write-Output "waiting for jobs…";
Wait-Job -Job $Jobs | Out-Null;

$Fail = 0
foreach ($t in $Table) {
  $id = $t.Id
  $job = $Jobs | Where-Object { $_.Name -eq ("c_" + $id) -or $_.Name -eq ("n_" + $id) } | Select-Object -First 1
  $out = Receive-Job -Job $job 2>&1 | Out-String
  $path = ""
  if ($t.Back -eq "c") {
    $m = [regex]::Match($out, "path=([UDLR]+)")
    if ($m.Success) { $path = $m.Groups[1].Value; }
    $okLine = $out -match "SOLVED"
  } else {
    $cand1 = Join-Path $SolDir ("solve_" + $id + "_eng" + $t.Mode + ".json")
    $cand2 = Join-Path $SolDir ($id + "_official.txt")
    $src = ""
    if ((Test-Path -LiteralPath $cand1)) { $src = $cand1; }
    elseif ((Test-Path -LiteralPath $cand2)) { $src = $cand2; }
    if ($src -ne "") {
      $raw = (Get-Content -LiteralPath $src -Raw).Trim()
      try {
        $j = $raw | ConvertFrom-Json
        if ($j.path) { $path = $j.path; } else { $path = $raw; }
      } catch { $path = $raw; }
    }
    $okLine = ($path -match "^[UDLR]+$")
  }
  if ($path -eq "") { Write-Output ("FAIL " + $id + ": no path produced"); $Fail += 1; continue; }
  $pathFile = Join-Path $SolDir ($id + ".txt")
  Set-Content -LiteralPath $pathFile -Value $path -NoNewline
  $env:MB_RUNTIME = $Runtime
  $vr = (& $Node (Join-Path $SolverDir "verify_one.js") $id $pathFile) 2>&1 | Out-String
  $verified = $vr -match "VERIFIED"
  $lenOk = ($t.Exp -eq 0) -or ($path.Length -eq $t.Exp)
  if ($verified -and $lenOk) { Write-Output ("PASS " + $id + ": " + $path.Length + " moves, engine-verified"); }
  else { Write-Output ("FAIL " + $id + ": verified=" + $verified + " len=" + $path.Length + " exp=" + $t.Exp + " :: " + $vr.Trim()); $Fail += 1; }
}
Write-Output ("done: " + ($Table.Count - $Fail) + "/" + $Table.Count + " PASS");
if ($Fail -gt 0) { exit 1; }
