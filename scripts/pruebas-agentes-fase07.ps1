# ============================================================
# CeibaERP - Pruebas de los agentes con Gemini (docs/10-PRU seccion 5: PRU-C09 y PRU-C10)
# Windows PowerShell 5.1. El informe ejecutivo ejecuta el Agente 1 y el Agente 2 y consume
# varias llamadas a Gemini (entre 5 y 8): corralo una sola vez con la cuota disponible.
# Crea ordenes en BORRADOR y recomendaciones PENDIENTES de prueba en la sucursal indicada.
# Uso (con la app en marcha):
#   powershell -ExecutionPolicy Bypass -File .\scripts\pruebas-agentes-fase07.ps1
#   powershell -ExecutionPolicy Bypass -File .\scripts\pruebas-agentes-fase07.ps1 -Sucursal Envigado
#   powershell -ExecutionPolicy Bypass -File .\scripts\pruebas-agentes-fase07.ps1 -SinIA   (solo permisos y validaciones)
#   powershell -ExecutionPolicy Bypass -File .\scripts\pruebas-agentes-fase07.ps1 -Inventario 42
#     (solo el Agente 2, con la salida de la ejecucion 42 del Agente 1; gasta menos cuota)
# La clave de los usuarios demo se pide oculta y no se imprime ni se guarda.
# ============================================================
param([string]$Base = "http://localhost:3000", [string]$Sucursal = "Bello", [switch]$SinIA, [int]$Inventario = 0)

$ErrorActionPreference = "Stop"
$sec = Read-Host "Clave de los usuarios demo" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
$clave = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
[Console]::OutputEncoding = [Text.Encoding]::UTF8

# El cuerpo se envia como bytes UTF-8; la coma evita que PowerShell desarme el arreglo.
function Cuerpo($objeto) {
  return ,([Text.Encoding]::UTF8.GetBytes(($objeto | ConvertTo-Json -Depth 6 -Compress)))
}

function Entrar($correo) {
  $s = $null
  try {
    Invoke-WebRequest -Uri "$Base/api/auth/login" -Method Post -ContentType "application/json; charset=utf-8" `
      -Body (Cuerpo @{ email = $correo; password = $clave }) -SessionVariable s -UseBasicParsing -DisableKeepAlive | Out-Null
    Write-Host "Sesion iniciada: $correo"
    return $s
  } catch {
    Write-Host "NO se pudo iniciar sesion con $correo" -ForegroundColor Red
    return $null
  }
}

function Llamar($sesion, $metodo, $ruta, $cuerpo, [int]$Segundos = 60) {
  $p = @{
    Uri = "$Base$ruta"; Method = $metodo; WebSession = $sesion; UseBasicParsing = $true; TimeoutSec = $Segundos
    DisableKeepAlive = $true; ContentType = "application/json; charset=utf-8"
  }
  if ($null -ne $cuerpo) { $p.Body = Cuerpo $cuerpo }
  try {
    $r = Invoke-WebRequest @p
    $texto = [Text.Encoding]::UTF8.GetString($r.RawContentStream.ToArray())
    return @{ Estado = [int]$r.StatusCode; Datos = ($texto | ConvertFrom-Json); Codigo = "" }
  } catch {
    $estado = 0
    if ($_.Exception.Response) { $estado = [int]$_.Exception.Response.StatusCode }
    $codigo = ""
    $cuerpoError = $_.ErrorDetails.Message
    if (-not $cuerpoError -and $_.Exception.Response) {
      try {
        $lector = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream(), [Text.Encoding]::UTF8)
        $cuerpoError = $lector.ReadToEnd()
        $lector.Close()
      } catch { }
    }
    try { $codigo = ($cuerpoError | ConvertFrom-Json).error.codigo } catch { }
    return @{ Estado = $estado; Datos = $null; Codigo = $codigo }
  }
}

$script:ok = 0
$script:total = 0
function Ver($id, $nombre, $esperado, $r) {
  $script:total++
  $bien = $r.Estado -eq $esperado
  if ($bien) { $script:ok++ }
  $linea = "{0,-5} {1,-58} esperado {2}  obtenido {3}  {4}" -f $id, $nombre, $esperado, $r.Estado, $(if ($bien) { "OK" } else { "REVISAR" })
  if (-not $bien -and $r.Codigo) { $linea += " ($($r.Codigo))" }
  if ($bien) { Write-Host $linea -ForegroundColor Green } else { Write-Host $linea -ForegroundColor Red }
}
# Verificacion logica: se reporta como 200 (cumple) o 0 (no cumple).
function Cumple($id, $nombre, [bool]$condicion) {
  Ver $id $nombre 200 @{ Estado = $(if ($condicion) { 200 } else { 0 }) }
}
function Texto($t, [int]$max = 300) {
  $t = "$t" -replace "\s+", " "
  if ($t.Length -gt $max) { return $t.Substring(0, $max) + "..." }
  return $t
}

Write-Host ""
Write-Host "CeibaERP - pruebas de los agentes (Fase 7) contra $Base" -ForegroundColor Cyan
$ger  = Entrar "gerente@ceiba.test"
$adm  = Entrar "admin@ceiba.test"
$bod  = Entrar "bodega.centro@ceiba.test"
$caj  = Entrar "cajero.centro@ceiba.test"
if (-not ($ger -and $adm -and $bod -and $caj)) {
  Write-Host "No se ejecutaron las pruebas: revise la clave." -ForegroundColor Yellow
  $clave = $null
  exit 1
}
$clave = $null

# Permisos y validaciones (sin consumir cuota de Gemini)
Write-Host ""
Ver "S01" "Cajero ejecuta el Agente 1" 403 (Llamar $caj "POST" "/api/agentes/inventario" @{})
Ver "S02" "Bodega consulta el historial de ejecuciones" 403 (Llamar $bod "GET" "/api/agentes/ejecuciones")
Ver "S03" "Bodega consulta las recomendaciones" 403 (Llamar $bod "GET" "/api/recomendaciones")
Ver "S04" "Sucursal no numerica" 400 (Llamar $ger "POST" "/api/agentes/inventario" @{ sucursalId = "x" })
Ver "S05" "Campo extra en la entrada del agente" 400 (Llamar $ger "POST" "/api/agentes/inventario" @{ rol = "ADMIN" })
Ver "S06" "Periodo invertido en el Agente 2" 400 (Llamar $ger "POST" "/api/agentes/comercial" @{ desde = "2026-11-10"; hasta = "2026-11-01" })
Ver "S07" "Administrador acepta una recomendacion (solo GER)" 403 (Llamar $adm "POST" "/api/recomendaciones/999999/aceptar" @{})
Ver "S08" "Gerente acepta una recomendacion inexistente" 404 (Llamar $ger "POST" "/api/recomendaciones/999999/aceptar" @{})
Ver "S09" "Ejecucion inexistente" 404 (Llamar $ger "GET" "/api/agentes/ejecuciones/999999")

if ($SinIA) {
  Write-Host ""
  Write-Host ("Resultado: {0} de {1} verificaciones OK (sin IA)." -f $script:ok, $script:total) -ForegroundColor $(if ($script:ok -eq $script:total) { "Green" } else { "Yellow" })
  exit 0
}

# Sucursal de la prueba (por nombre)
$sucs = Llamar $ger "GET" "/api/sucursales?tamano=100"
$suc = @($sucs.Datos.datos | Where-Object { $_.nombre -like "*$Sucursal*" })[0]
if (-not $suc) { Write-Host "No existe una sucursal que contenga '$Sucursal'." -ForegroundColor Red; exit 1 }

$i = $null
Write-Host ""
if ($Inventario -gt 0) {
  # Solo el Agente 2, con la salida registrada de una ejecucion del Agente 1 (RF-38).
  Write-Host "Agente 2 para $($suc.nombre) con la ejecucion #$Inventario del Agente 1. Puede tardar 1 o 2 minutos..." -ForegroundColor Cyan
  $inicio = Get-Date
  $res = Llamar $ger "POST" "/api/agentes/comercial" @{ sucursalId = $suc.id; ejecucionInventarioId = $Inventario } 600
  Write-Host ("      Tiempo total: {0:N0} s" -f ((Get-Date) - $inicio).TotalSeconds)
  Ver "I01" "Agente 2 responde" 200 $res
  if ($res.Estado -ne 200) { Write-Host "Sin respuesta del Agente 2: revise la consola del servidor." -ForegroundColor Yellow; exit 1 }
  $h1 = @{ id = $Inventario }
  $h2 = @{ id = $res.Datos.id }
} else {
  Write-Host "Informe ejecutivo para $($suc.nombre): Agente 1 y luego Agente 2. Puede tardar de 1 a 3 minutos..." -ForegroundColor Cyan
  $inicio = Get-Date
  $inf = Llamar $ger "POST" "/api/agentes/informe-ejecutivo" @{ sucursalId = $suc.id } 600
  Write-Host ("      Tiempo total: {0:N0} s" -f ((Get-Date) - $inicio).TotalSeconds)
  Ver "I01" "Informe ejecutivo responde" 200 $inf
  if ($inf.Estado -ne 200) { Write-Host "Sin respuesta del informe: revise la consola del servidor." -ForegroundColor Yellow; exit 1 }
  $i = $inf.Datos
  Write-Host ("      Estado: {0}  Modelo: {1}  Error: {2}" -f $i.estado, $i.modelo, $i.error)
  Cumple "I02" "Informe COMPLETADA con dos agentes encadenados" ($i.estado -eq "COMPLETADA" -and @($i.hijas).Count -eq 2)
  Write-Host ("      Resumen: {0}" -f (Texto $i.resumen 500))
  $h1 = @($i.hijas | Where-Object { $_.agente -eq "INVENTARIO" })[0]
  $h2 = @($i.hijas | Where-Object { $_.agente -eq "COMERCIAL" })[0]
}

# PRU-C09: Agente 1
if ($h1) {
  $a1 = (Llamar $ger "GET" "/api/agentes/ejecuciones/$($h1.id)").Datos
  $r1 = $a1.resultado
  Write-Host ""
  Write-Host "C09  Agente 1 (ejecucion #$($a1.id), $($a1.estado), modelo $($a1.modelo), $([math]::Round($a1.duracionMs / 1000)) s)" -ForegroundColor Cyan
  Write-Host ("      Herramientas: {0}" -f ((@($a1.herramientasUsadas) | ForEach-Object { $_.herramienta }) -join ", "))
  Write-Host ("      Resumen: {0}" -f (Texto $r1.resumen))
  foreach ($c in @($r1.criterios)) { Write-Host "      Criterio: $(Texto $c 200)" }
  $incl = @($r1.decisiones | Where-Object { $_.incluir })
  $excl = @($r1.decisiones | Where-Object { -not $_.incluir })
  $ajust = @($r1.decisiones | Where-Object { $_.ajustadaPorIA })
  Write-Host ("      Candidatos: {0} (incluidos {1}, excluidos {2}, ajustados por la IA {3}); ignorados: {4}" -f @($r1.decisiones).Count, $incl.Count, $excl.Count, $ajust.Count, (@($r1.ignorados) -join ", "))
  foreach ($d in $ajust) { Write-Host ("        {0} {1}: {2} -> {3} {4}" -f $d.sku, $d.sucursal, $d.prioridadBase, $d.prioridad, (Texto $d.justificacion 150)) }
  Write-Host ("      Ordenes BORRADOR creadas: {0}; alertas: {1}" -f @($a1.ordenes).Count, @($a1.recomendaciones).Count)
  if (@($r1.decisiones).Count -eq 0) {
    # Sin candidatos el sistema completa la ejecucion sin llamar al modelo (docs/07-IAG 5.4).
    Write-Host "      Sin candidatos de reposicion: no se llama al modelo. Para PRU-C09 con IA, venda primero un producto hasta dejarlo bajo el minimo." -ForegroundColor Yellow
    Cumple "C09" "Agente 1 completado sin candidatos y sin llamar al modelo" ($a1.estado -eq "COMPLETADA" -and -not $a1.modelo)
  } else {
    Cumple "C09" "Agente 1 completado y usa la propuesta del sistema" ($a1.estado -eq "COMPLETADA" -and [bool](@($a1.herramientasUsadas) | Where-Object { $_.herramienta -eq "calcularPropuestaReposicion" }))
  }
  $okOrdenes = $true
  $okCantidades = $true
  $okExcluidos = $true
  foreach ($o in @($a1.ordenes)) {
    $det = (Llamar $ger "GET" "/api/ordenes-compra/$($o.id)").Datos
    if ($det.estado -ne "BORRADOR" -or $det.origen -ne "AGENTE_INVENTARIO" -or $det.ejecucionAgente.id -ne $a1.id) { $okOrdenes = $false }
    foreach ($linea in @($det.detalles)) {
      $dec = @($incl | Where-Object { $_.sku -eq $linea.producto.sku -and $_.sucursal -eq $det.sucursal.nombre })[0]
      if (-not $dec -or $dec.cantidad -ne $linea.cantidad) { $okCantidades = $false }
      if (@($excl | Where-Object { $_.sku -eq $linea.producto.sku -and $_.sucursal -eq $det.sucursal.nombre }).Count -gt 0) { $okExcluidos = $false }
    }
  }
  Cumple "C09" "Ordenes en BORRADOR, origen IA y ligadas a la ejecucion" $okOrdenes
  Cumple "C09" "Cantidades de las ordenes = cantidades del codigo" $okCantidades
  Cumple "C09" "Ningun producto excluido por la IA quedo en una orden" $okExcluidos
}

# PRU-C10: Agente 2
if ($h2) {
  $a2 = (Llamar $ger "GET" "/api/agentes/ejecuciones/$($h2.id)").Datos
  $r2 = $a2.resultado
  Write-Host ""
  Write-Host "C10  Agente 2 (ejecucion #$($a2.id), $($a2.estado), modelo $($a2.modelo), $([math]::Round($a2.duracionMs / 1000)) s)" -ForegroundColor Cyan
  if ($a2.estado -ne "COMPLETADA") {
    Write-Host ("      Error: {0}" -f $a2.error) -ForegroundColor Yellow
    Cumple "C10" "Agente 2 completado" $false
  } else {
  Write-Host ("      Herramientas: {0}" -f ((@($a2.herramientasUsadas) | ForEach-Object { $_.herramienta }) -join ", "))
  Write-Host ("      Resumen: {0}" -f (Texto $r2.resumen))
  foreach ($x in @($r2.hallazgos)) {
    Write-Host ("      Hallazgo [{0}] {1}: IA {2} | sistema {3}" -f $x.kpiRelacionado, (Texto $x.titulo 80), $x.valor, $(if ($x.valorSistema) { $x.valorSistema } else { "ver grafico" }))
  }
  foreach ($x in @($a2.recomendaciones)) { Write-Host ("      Recomendacion #{0} {1}/{2}: {3}" -f $x.id, $x.tipo, $x.prioridad, (Texto $x.titulo 100)) }
  foreach ($x in @($r2.descartadas)) { Write-Host ("      Descartada: {0} - {1}" -f (Texto $x.titulo 80), $x.motivo) -ForegroundColor DarkYellow }
  Cumple "C10" "Agente 2 completado" ($a2.estado -eq "COMPLETADA")
  if ($i) {
    Cumple "C10" "Ligado al Agente 1 y al informe (entrada y padre)" ($a2.ejecucionEntrada.id -eq $h1.id -and $a2.ejecucionPadre.id -eq $i.id)
  } else {
    Cumple "C10" "Ligado a la ejecucion #$($h1.id) del Agente 1 (entrada)" ($a2.ejecucionEntrada.id -eq $h1.id)
  }
  Cumple "C10" "Usa la salida del Agente 1 (obtenerResultadoAgenteInventario)" ([bool](@($a2.herramientasUsadas) | Where-Object { $_.herramienta -eq "obtenerResultadoAgenteInventario" }))
  $hallazgos = @($r2.hallazgos | Where-Object { $_ })
  Cumple "C10" "Cada hallazgo cita un KPI o grafico" ($hallazgos.Count -gt 0 -and -not ($hallazgos | Where-Object { -not $_.kpiRelacionado }))
  $skusRiesgo = @($r1.decisiones | ForEach-Object { $_.sku })
  $incoherentes = @($a2.recomendaciones | Where-Object { ($_.tipo -eq "PROMOCION" -or $_.tipo -eq "LIQUIDACION") -and $_.producto -and ($skusRiesgo -contains $_.producto.sku) })
  Cumple "C10" "Ninguna promocion o liquidacion de un producto en riesgo" ($incoherentes.Count -eq 0)

  # RF-40: decision del gerente
  $pend = @($a2.recomendaciones | Where-Object { $_.estado -eq "PENDIENTE" })
  if ($pend.Count -gt 0) {
    Write-Host ""
    Ver "D01" "Gerente acepta la recomendacion #$($pend[0].id)" 200 (Llamar $ger "POST" "/api/recomendaciones/$($pend[0].id)/aceptar" @{ comentario = "Prueba Fase 7: se revisara esta semana" })
    Ver "D02" "Segunda decision sobre la misma recomendacion" 409 (Llamar $ger "POST" "/api/recomendaciones/$($pend[0].id)/descartar" @{ comentario = "Intento duplicado" })
    if ($pend.Count -gt 1) {
      Ver "D03" "Descartar sin comentario" 400 (Llamar $ger "POST" "/api/recomendaciones/$($pend[1].id)/descartar" @{})
    }
  }
  }
}

Write-Host ""
$color = if ($script:ok -eq $script:total) { "Green" } else { "Yellow" }
Write-Host ("Resultado: {0} de {1} verificaciones OK. Revise ademas el texto de cada analisis." -f $script:ok, $script:total) -ForegroundColor $color
