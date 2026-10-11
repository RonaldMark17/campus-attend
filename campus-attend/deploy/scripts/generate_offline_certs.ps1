# CampusAttend Internal Offline CA & SSL Certificate Generator
# Runs 100% locally on Windows PowerShell without internet connectivity

param(
    [string]$DomainName = "attendance.school.lan",
    [string]$OutputDir = "$PSScriptRoot\..\certs"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " CampusAttend Offline SSL Certificate Provisioning" -ForegroundColor Cyan
Write-Host " Domain: $DomainName" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$certPfxPath = "$OutputDir\$DomainName.pfx"
$certCerPath = "$OutputDir\$DomainName.cer"

Write-Host "[1/2] Generating Self-Signed Internal Certificate..." -ForegroundColor Yellow
$cert = New-SelfSignedCertificate `
    -DnsName $DomainName, "localhost", "127.0.0.1" `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -KeyExportPolicy Exportable `
    -KeySpec Signature `
    -KeyLength 2048 `
    -KeyAlgorithm RSA `
    -HashAlgorithm SHA256 `
    -NotAfter (Get-Date).AddYears(5) `
    -FriendlyName "CampusAttend School LAN Authority"

Write-Host "[2/2] Exporting Public Certificate for School Browser Trust..." -ForegroundColor Yellow
Export-Certificate -Cert $cert -FilePath $certCerPath | Out-Null

$pwd = ConvertTo-SecureString -String "CampusAttend2026!" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath $certPfxPath -Password $pwd | Out-Null

Write-Host "[+] Certificate successfully created!" -ForegroundColor Green
Write-Host "    Public Cert : $certCerPath (Install into Trusted Root on faculty laptops)" -ForegroundColor Gray
Write-Host "    Private PFX : $certPfxPath" -ForegroundColor Gray
