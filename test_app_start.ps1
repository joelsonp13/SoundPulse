$ErrorActionPreference = "Continue"

Write-Host "Testando inicializacao do app.py..."
Write-Host ""

$job = Start-Job -ScriptBlock {
    Set-Location "C:\Users\Nicolas\Documents\testando jamendo2\testando_jamendo"
    python app.py 2>&1
}

Start-Sleep -Seconds 8

$output = Receive-Job $job -ErrorAction SilentlyContinue

Write-Host "=== LOGS DE INICIALIZACAO ==="
if ($output) {
    $output | ForEach-Object { Write-Host $_ }
} else {
    Write-Host "[Nenhum output recebido]"
}
Write-Host "=============================="
Write-Host ""

Stop-Job $job -ErrorAction SilentlyContinue
Remove-Job $job -ErrorAction SilentlyContinue

