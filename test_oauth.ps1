Write-Host "Testando app.py com novo oauth.json..."
Write-Host ""

$job = Start-Job -ScriptBlock {
    Set-Location "C:\Users\Nicolas\Documents\testando jamendo2\testando_jamendo"
    python app.py
}

Start-Sleep -Seconds 5

$output = Receive-Job $job

Write-Host "=== LOGS DE INICIALIZACAO ==="
Write-Host $output
Write-Host "=============================="

Stop-Job $job -ErrorAction SilentlyContinue
Remove-Job $job -ErrorAction SilentlyContinue

