# ============================================================
# CeibaERP - Pruebas de API de la Fase 5: dashboard, alertas y reportes CSV
# (docs/04-REQ RF-24 a RF-30). Windows PowerShell 5.1. Solo lectura.
# Uso (con la app en marcha):
#   powershell -ExecutionPolicy Bypass -File .\scripts\pruebas-api-fase05.ps1
# La clave de los usuarios demo se pide oculta y no se imprime ni se guarda.
# ============================================================
param([string]$Base = "http://localhost:3000")

$ErrorActionPreference = "Stop"
$sec = Read-Host "Clave de los usuarios demo" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
$clave = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)

# El cuerpo se envia como bytes UTF-8: PowerShell 5.1 codifica los textos en
# ISO-8859-1 y una clave con tildes o "n" con virgulilla no coincidiria.
# La coma evita que PowerShell desarme el arreglo de bytes al devolverlo.
function Cuerpo($objeto) {
  return ,([Text.Encoding]::UTF8.GetBytes(($objeto | ConvertTo-Json -Depth 5 -Compress)))
}

function Entrar($correo) {
  $s = $null
  try {
    Invoke-WebRequest -Uri "$Base/api/auth/login" -Method Post -ContentType "application/json; charset=utf-8" `
      -Body (Cuerpo @{ email = $correo; password = $clave }) -SessionVariable s -UseBasicParsing -DisableKeepAlive | Out-Null
    Write-Host "Sesion iniciada: $correo"
    return $s
  } catch {
    $estado = 0
    if ($_.Exception.Response) { $estado = [int]$_.Exception.Response.StatusCode }
    Write-Host "NO se pudo iniciar sesion con $correo (estado $estado) $($_.ErrorDetails.Message)" -ForegroundColor Red
    return $null
  }
}

function Llamar($sesion, $metodo, $ruta, $cuerpo) {
  $p = @{
    Uri = "$Base$ruta"; Method = $metodo; WebSession = $sesion; UseBasicParsing = $true
    DisableKeepAlive = $true; ContentType = "application/json; charset=utf-8"
  }
  if ($cuerpo) { $p.Body = Cuerpo $cuerpo }
  try {
    $r = Invoke-WebRequest @p
    $texto = [Text.Encoding]::UTF8.GetString($r.RawContentStream.ToArray())
    return @{ Estado = [int]$r.StatusCode; Datos = ($texto | ConvertFrom-Json) }
  } catch {
    $estado = 0
    if ($_.Exception.Response) { $estado = [int]$_.Exception.Response.StatusCode }
    return @{ Estado = $estado; Datos = $null }
  }
}

$script:ok = 0
$script:total = 0
function Ver($id, $nombre, $esperado, $r) {
  $script:total++
  $bien = $r.Estado -eq $esperado
  if ($bien) { $script:ok++ }
  $linea = "{0,-5} {1,-50} esperado {2}  obtenido {3}  {4}" -f $id, $nombre, $esperado, $r.Estado, $(if ($bien) { "OK" } else { "REVISAR" })
  if ($bien) { Write-Host $linea -ForegroundColor Green } else { Write-Host $linea -ForegroundColor Red }
}


function Descargar($sesion, $ruta) {
  try {
    $r = Invoke-WebRequest -Uri "$Base$ruta" -WebSession $sesion -UseBasicParsing -DisableKeepAlive
    $texto = [Text.Encoding]::UTF8.GetString($r.RawContentStream.ToArray())
    return @{ Estado = [int]$r.StatusCode; Tipo = $r.Headers["Content-Type"]; Lineas = ($texto -split "`r`n" | Where-Object { $_ -ne "" }).Count }
  } catch {
    $estado = 0
    if ($_.Exception.Response) { $estado = [int]$_.Exception.Response.StatusCode }
    return @{ Estado = $estado; Tipo = $null; Lineas = 0 }
  }
}
Write-Host ""
Write-Host "CeibaERP - pruebas de API de la Fase 5 contra $Base" -ForegroundColor Cyan
$ger = Entrar "gerente@ceiba.test"
$bod = Entrar "bodega.centro@ceiba.test"
$caj = Entrar "cajero.centro@ceiba.test"
if (-not ($ger -and $bod -and $caj)) {
  Write-Host "No se ejecutaron las pruebas: revise la clave." -ForegroundColor Yellow
  $clave = $null
  exit 1
}
$clave = $null
Write-Host ""

$k = Llamar $ger "GET" "/api/dashboard/kpis"
Ver "D01" "Gerente consulta los ocho KPI" 200 $k
if ($k.Datos) {
  Write-Host "      Periodo $($k.Datos.filtros.desde) a $($k.Datos.filtros.hasta)"
  foreach ($id in @("KPI-01", "KPI-02", "KPI-03", "KPI-04", "KPI-05", "KPI-06", "KPI-07", "KPI-08")) {
    $v = $k.Datos.kpis.$id
    Write-Host ("      {0}  valor {1,-14} anterior {2,-14} semaforo {3}" -f $id, $v.valor, $v.anterior, $v.semaforo)
  }
}
Ver "D02" "Graficos con los mismos filtros" 200 (Llamar $ger "GET" "/api/dashboard/graficos")
Ver "D03" "Cajero consulta los KPI" 403 (Llamar $caj "GET" "/api/dashboard/kpis")
Ver "D04" "Bodega consulta los KPI" 403 (Llamar $bod "GET" "/api/dashboard/kpis")
Ver "D05" "Periodo invertido (desde > hasta)" 400 (Llamar $ger "GET" "/api/dashboard/kpis?desde=2026-11-20&hasta=2026-11-01")
Ver "D06" "Fecha imposible" 400 (Llamar $ger "GET" "/api/dashboard/kpis?desde=2026-02-30")

$otra = (Llamar $ger "GET" "/api/sucursales?tamano=100").Datos.datos | Where-Object { $_.codigo -ne "SUC-CEN" } | Select-Object -First 1
$a = Llamar $bod "GET" "/api/dashboard/alertas?sucursalId=$($otra.id)"
Ver "D07" "Bodega pide alertas de otra sucursal" 200 $a
$ajenas = @($a.Datos.datos | Where-Object { $_.sucursal -ne "Ceiba Centro" }).Count
$r = @{ Estado = $(if ($ajenas -eq 0) { 200 } else { 500 }) }
Ver "D07b" "...solo recibe alertas de su sucursal ($(@($a.Datos.datos).Count) filas)" 200 $r

$sinSesion = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Ver "D08" "KPI sin sesion" 401 (Llamar $sinSesion "GET" "/api/dashboard/kpis")

$c = Descargar $ger "/api/reportes/ventas.csv"
Ver "R01" "Gerente descarga ventas.csv ($($c.Lineas - 1) lineas)" 200 $c
$r = @{ Estado = $(if ($c.Tipo -like "text/csv*") { 200 } else { 500 }) }
Ver "R01b" "...con tipo de contenido text/csv" 200 $r
Ver "R02" "Gerente descarga cumplimiento-proveedores.csv" 200 (Descargar $ger "/api/reportes/cumplimiento-proveedores.csv")
Ver "R03" "Bodega descarga inventario-bajo-minimo.csv" 200 (Descargar $bod "/api/reportes/inventario-bajo-minimo.csv")
Ver "R04" "Bodega intenta descargar ventas.csv" 403 (Descargar $bod "/api/reportes/ventas.csv")
Ver "R05" "Cajero intenta descargar inventario critico" 403 (Descargar $caj "/api/reportes/inventario-bajo-minimo.csv")

Write-Host ""
$color = if ($script:ok -eq $script:total) { "Green" } else { "Red" }
Write-Host ("Resultado: {0} de {1} pruebas OK" -f $script:ok, $script:total) -ForegroundColor $color
