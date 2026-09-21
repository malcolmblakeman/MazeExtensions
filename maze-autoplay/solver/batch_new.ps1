# batch_new.ps1 — solve + verify candidate rooms, log stats for the registry doc.
# Usage: .\batch_new.ps1 -Levels MxL,NxI -Mode bfs -Cap 1 [-HeapMB 3072]
# Output: solutions\<ID>.txt + new_registry_log.txt lines.
param(
  [string]$SolverDir = "",
  [string]$Runtime = "C:\Users\issac\AppData\Local\Temp\opencode\mazebench_pkg\mazebench_cli\_runtime",
  [string[]]$Levels = @(),
  [string]$Mode = "bfs",
  [double]$Cap = 1,
  [int]$HeapMB = 3072
)
if ($SolverDir -eq "") { $SolverDir = Split-Path -Parent $MyInvocation.MyCommand.Path; }
$SolDir = Join-Path $SolverDir "solutions"
if (-not (Test-Path -LiteralPath $SolDir)) { New-Item -ItemType Directory -Path $SolDir | Out-Null; }
$Log = Join-Path $SolDir "new_registry_log.txt"
foreach ($id in $Levels) {
  Write-Output ("=== " + $id + " (" + $Mode + ", cap " + $Cap + "M) ===")
  $env:MB_RUNTIME = $Runtime
  $env:MB_OUT = $SolDir + "\"
  $o = (& "node" ("--max-old-space-size=" + $HeapMB) (Join-Path $SolverDir "engsolve.js") $id $Mode $Cap) 2>&1 | Out-String
  Write-Output ($o.Trim())
  $cand = Join-Path $SolDir ("solve_" + $id + "_eng" + $Mode + ".json")
  if (-not (Test-Path -LiteralPath $cand)) { Write-Output ("MISS " + $id + ": no output file"); Add-Content -LiteralPath $Log -Value ($id + " MISS no-output " + $Mode + " cap=" + $Cap); continue; }
  try { $j = (Get-Content -LiteralPath $cand -Raw) | ConvertFrom-Json; $path = $j.path } catch { $path = "" }
  if (-not ($path -match "^[UDLR]+$")) { Write-Output ("MISS " + $id + ": bad path"); Add-Content -LiteralPath $Log -Value ($id + " MISS bad-path " + $Mode + " cap=" + $Cap); continue; }
  $pf = Join-Path $SolDir ($id + ".txt")
  Set-Content -LiteralPath $pf -Value $path -NoNewline
  $env:MB_RUNTIME = $Runtime
  $vr = (& "node" (Join-Path $SolverDir "verify_one.js") $id $pf) 2>&1 | Out-String
  Write-Output ($vr.Trim())
  $ok = $vr -match "VERIFIED"
  $mv = 0; $ex = 0; $el = 0
  if ($j.moves) { $mv = $j.moves } else { $mv = $path.Length }
  if ($j.expanded) { $ex = $j.expanded }
  if ($j.elapsed) { $el = $j.elapsed }
  if ($ok) { Write-Output ("PASS " + $id + ": " + $mv + " moves"); Add-Content -LiteralPath $Log -Value ($id + " PASS moves=" + $mv + " expanded=" + $ex + " elapsed=" + $el + "s mode=eng-" + $Mode + " cap=" + $Cap); }
  else { Write-Output ("FAIL " + $id + " verify"); Add-Content -LiteralPath $Log -Value ($id + " FAIL verify moves=" + $mv); }
}
Write-Output "batch done"
