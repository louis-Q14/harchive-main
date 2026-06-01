# Kill node process on port 3099
$conn = Get-NetTCPConnection -LocalPort 3099 -State Listen -ErrorAction SilentlyContinue
if ($conn) {
    $pid3099 = $conn.OwningProcess
    Write-Host "Killing PID $pid3099 on port 3099..."
    Stop-Process -Id $pid3099 -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
    Write-Host "Done."
} else {
    Write-Host "No process on port 3099."
}
