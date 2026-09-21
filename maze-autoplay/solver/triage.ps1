# triage.ps1 — cheap parallel official-A* sweep over candidate gem rooms.
# Usage: .\triage.ps1 [-Cap 0.05] [-Jobs 4] [-Only AxA,BxG]
# Writes triage_report.txt (one line per level: SOLVED/CAPPED/UNSOLVABLE/ERROR).
param(
  [string]$SolverDir = "",
  [string]$Runtime = "C:\Users\issac\AppData\Local\Temp\opencode\mazebench_pkg\mazebench_cli\_runtime",
  [string]$OutDir = "",
  [string]$Cap = "0.05",
  [int]$Jobs = 4,
  [string[]]$Only = @()
)
if ($SolverDir -eq "") { $SolverDir = Split-Path -Parent $MyInvocation.MyCommand.Path; }
if ($OutDir -eq "") { $OutDir = Join-Path ([System.IO.Path]::GetTempPath()) "mbtriage"; }
if (-not (Test-Path -LiteralPath $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null; }
$Levels = @(
  "AxA","AxF","AxG","AxI","AxK","AxL","AxM","AxO","AxP",
  "BxG","BxI","BxM","CxD","CxG","CxL","CxP","DxH","DxM","DxN",
  "ExM","ExO","ExP","FxK","FxO","GxF","HxP","IxE","IxP",
  "LxI","LxP","MxD","MxF","MxI","MxJ","MxN","NxF","NxN",
  "OxC","OxK","PxA","PxD","PxG","PxH","PxJ","PxL","PxM","PxN","PxO","PxP",
  "DxL"
);
if ($Only.Count -gt 0) { $Levels = @($Levels | Where-Object { $Only -contains $_ }); }
$running = @()
$results = @{}
foreach ($id in $Levels) {
  while ((Get-Job -State Running | Measure-Object).Count -ge $Jobs) { Start-Sleep -Seconds 2; }
  $j = Start-Job -Name ("t_" + $id) -ArgumentList @($SolverDir, $Runtime, $OutDir, $Cap, $id) -ScriptBlock {
    param($sdir, $rt, $outdir, $cap, $lv)
    $env:MB_RUNTIME = $rt
    $env:MB_OUT = $outdir + "\"
    & "node" (Join-Path $sdir "official.js") $lv $cap 2>&1
  };
  $running += $j;
  Write-Output ("triaging " + $id);
}
Wait-Job -Job $running -Timeout 540 | Out-Null;
foreach ($j in $running) {
  $id = $j.Name.Substring(2);
  if ($j.State -eq "Running") { Stop-Job -Job $j; $results[$id] = "TIMEOUT -"; }
  else {
    $out = Receive-Job -Job $j 2>&1 | Out-String;
    $m = [regex]::Match($out, "status=(\w+)\s+moves=([0-9\-a-zA-Z]+)\s+expanded=([0-9]+)");
    if ($m.Success) { $results[$id] = $m.Groups[1].Value.ToUpper() + " moves=" + $m.Groups[2].Value + " expanded=" + $m.Groups[3].Value; }
    else { $results[$id] = "ERROR -"; }
  }
  Remove-Job -Job $j -Force;
}
$Report = Join-Path $OutDir "triage_report.txt";
$lines = foreach ($id in ($results.Keys | Sort-Object)) { $id + ": " + $results[$id]; };
Set-Content -LiteralPath $Report -Value ($lines -join "`r`n");
Write-Output "---- report ----";
Write-Output ($lines -join "`n");
