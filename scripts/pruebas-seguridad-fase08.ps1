# ============================================================
# CeibaERP - Pruebas de seguridad (docs/10-PRU seccion 4: PRU-S01 a PRU-S12)
# Windows PowerShell 5.1. Contra la app local o la desplegada:
#   powershell -ExecutionPolicy Bypass -File .\scripts\pruebas-seguridad-fase08.ps1
#   powershell -ExecutionPolicy Bypass -File .\scripts\pruebas-seguridad-fase08.ps1 -Base https://<app>.up.railway.app
# La clave de los usuarios demo se pide oculta y no se imprime ni se guarda.
# Crea una orden de compra de prueba en borrador y al final la cancela; no cambia el stock.
# PRU-S09 bloquea durante 15 minutos un correo inexistente (atacante.prueba@ceiba.test),
# nunca una cuenta real.
# ============================================================
param([string]$Base = "http://localhost:3000")

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

# Llama a la API y devuelve estado, datos y codigo de error. Sin sesion si $sesion es $null.
function Llamar($sesion, $metodo, $ruta, $cuerpo) {
  $p = @{
    Uri = "$Base$ruta"; Method = $metodo; UseBasicParsing = $true; TimeoutSec = 60
    DisableKeepAlive = $true; ContentType = "application/json; charset=utf-8"
  }
  if ($null -ne $sesion) { $p.WebSession = $sesion }
  if ($null -ne $cuerpo) { $p.Body = Cuerpo $cuerpo }
  try {
    $r = Invoke-WebRequest @p
    $texto = [Text.Encoding]::UTF8.GetString($r.RawContentStream.ToArray())
    return @{ Estado = [int]$r.StatusCode; Datos = ($texto | ConvertFrom-Json); Texto = $texto; Codigo = "" }
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
    return @{ Estado = $estado; Datos = $null; Texto = $cuerpoError; Codigo = $codigo }
  }
}

$script:ok = 0
$script:total = 0
function Ver($id, $nombre, $esperado, $r) {
  $script:total++
  $bien = $r.Estado -eq $esperado
  if ($bien) { $script:ok++ }
  $linea = "{0,-7} {1,-58} esperado {2}  obtenido {3}  {4}" -f $id, $nombre, $esperado, $r.Estado, $(if ($bien) { "OK" } else { "REVISAR" })
  if (-not $bien -and $r.Codigo) { $linea += " ($($r.Codigo))" }
  if ($bien) { Write-Host $linea -ForegroundColor Green } else { Write-Host $linea -ForegroundColor Red }
}
# Verificacion logica: se reporta como 200 (cumple) o 0 (no cumple).
function Cumple($id, $nombre, [bool]$condicion) {
  Ver $id $nombre 200 @{ Estado = $(if ($condicion) { 200 } else { 0 }) }
}

Write-Host ""
Write-Host "CeibaERP - pruebas de seguridad (Fase 8) contra $Base" -ForegroundColor Cyan
$ger  = Entrar "gerente@ceiba.test"
$caj  = Entrar "cajero.centro@ceiba.test"
$cajB = Entrar "cajero.bello@ceiba.test"
$bod  = Entrar "bodega.centro@ceiba.test"
if (-not ($ger -and $caj -and $cajB -and $bod)) {
  Write-Host "No se ejecutaron las pruebas: revise la clave." -ForegroundColor Yellow
  $clave = $null
  exit 1
}
$clave = $null
Write-Host ""

# PRU-S01 y S02: autenticacion y autorizacion por rol
Ver "S01" "Consultar productos sin sesion" 401 (Llamar $null "GET" "/api/productos")
Ver "S02" "Cajero consulta los usuarios" 403 (Llamar $caj "GET" "/api/usuarios")

# Datos de apoyo: un producto con stock en Centro y una orden de prueba en borrador
$inv = (Llamar $caj "GET" "/api/inventario?q=PAN-003&tamano=1").Datos.datos[0]
$fecha = (Get-Date).AddDays(3).ToString("yyyy-MM-dd")
$orden = Llamar $bod "POST" "/api/ordenes-compra" @{ proveedorId = $inv.producto.proveedorId; fechaEsperada = $fecha; items = @(@{ productoId = $inv.productoId; cantidad = 5 }) }
Ver "aux" "Bodega crea una orden de prueba en borrador" 201 $orden

Ver "S03" "Cajero intenta aprobar una orden de compra" 403 (Llamar $caj "POST" "/api/ordenes-compra/$($orden.Datos.id)/aprobar" @{})

# PRU-S04: el servidor rechaza precios y totales enviados por el cliente (RN-02)
Ver "S04" "Venta con precioUnitario alterado" 400 (Llamar $caj "POST" "/api/ventas" @{ medioPago = "EFECTIVO"; items = @(@{ productoId = $inv.productoId; cantidad = 1; precioUnitario = 1 }) })
Ver "S04b" "Venta con total enviado por el cliente" 400 (Llamar $caj "POST" "/api/ventas" @{ medioPago = "EFECTIVO"; total = 1; items = @(@{ productoId = $inv.productoId; cantidad = 1 }) })

# PRU-S05: aislamiento por sucursal en ventas
$ventaCentro = (Llamar $caj "GET" "/api/ventas?tamano=1").Datos.datos[0]
Ver "S05" "Cajero de Bello consulta una venta de Centro" 404 (Llamar $cajB "GET" "/api/ventas/$($ventaCentro.id)")

# PRU-S06: aislamiento por sucursal en inventario
$sucs = (Llamar $ger "GET" "/api/sucursales?tamano=100").Datos.datos
$bello = @($sucs | Where-Object { $_.nombre -like "*Bello*" })[0]
$invBello = (Llamar $ger "GET" "/api/inventario?sucursalId=$($bello.id)&tamano=1").Datos.datos[0]
Ver "S06" "Bodega de Centro ajusta inventario de Bello" 404 (Llamar $bod "POST" "/api/inventario/$($invBello.id)/ajustes" @{ tipo = "ENTRADA"; cantidad = 1; motivo = "Prueba de seguridad" })

# PRU-S07 y S08: reglas de negocio
$stock = (Llamar $caj "GET" "/api/inventario?q=PAN-003&tamano=1").Datos.datos[0].stock
Ver "S07" "Venta con cantidad mayor al stock ($($stock + 1))" 409 (Llamar $caj "POST" "/api/ventas" @{ medioPago = "EFECTIVO"; items = @(@{ productoId = $inv.productoId; cantidad = $stock + 1 }) })
Ver "S08" "Recibir una orden en BORRADOR" 409 (Llamar $bod "POST" "/api/ordenes-compra/$($orden.Datos.id)/recibir" @{})

# PRU-S09: limitador de intentos fallidos (5 por correo e IP en 15 minutos)
$estados = @()
for ($n = 1; $n -le 6; $n++) {
  $estados += (Llamar $null "POST" "/api/auth/login" @{ email = "atacante.prueba@ceiba.test"; password = "ClaveIncorrecta$n" }).Estado
}
Write-Host ("        Estados de los seis intentos: {0}" -f ($estados -join ", "))
Cumple "S09" "Cinco intentos 401 y el sexto 429" (($estados[0..4] | Where-Object { $_ -ne 401 }).Count -eq 0 -and $estados[5] -eq 429)

# PRU-S10: inyeccion SQL en la busqueda
$q = [Uri]::EscapeDataString("' OR 1=1 --")
$r = Llamar $ger "GET" "/api/productos?q=$q"
Ver "S10" "Busqueda con ' OR 1=1 --" 200 $r
Cumple "S10b" "La busqueda no devuelve todos los productos (total $($r.Datos.total))" ($r.Datos.total -eq 0)

# PRU-S11: JWT con la firma alterada
$uri = [Uri]$Base
$cookie = $ger.Cookies.GetCookies($uri) | Where-Object { $_.Name -eq "ceiba_sesion" } | Select-Object -First 1
if ($cookie) {
  $valor = $cookie.Value
  $ultimo = $valor.Substring($valor.Length - 2, 1)
  $otro = if ($ultimo -eq "A") { "B" } else { "A" }
  $alterado = $valor.Substring(0, $valor.Length - 2) + $otro + $valor.Substring($valor.Length - 1)
  $falsa = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $c = New-Object System.Net.Cookie("ceiba_sesion", $alterado, "/", $uri.Host)
  $c.Secure = ($uri.Scheme -eq "https")
  $falsa.Cookies.Add($c)
  Ver "S11" "Cookie con un JWT de firma alterada" 401 (Llamar $falsa "GET" "/api/auth/me")
  Ver "S11b" "La misma consulta con la cookie original" 200 (Llamar $ger "GET" "/api/auth/me")
} else {
  Write-Host "S11     No se encontro la cookie de sesion para alterarla." -ForegroundColor Red
  $script:total++
}

# PRU-S12: /api/health sin versiones ni datos internos
$h = Llamar $null "GET" "/api/health"
Ver "S12" "Estado del servicio" 200 $h
$campos = @($h.Datos.PSObject.Properties.Name)
Write-Host ("        Campos de la respuesta: {0}" -f ($campos -join ", "))
Cumple "S12b" "Solo estado, base de datos y fecha (sin versiones)" ((@($campos | Where-Object { @("estado", "baseDeDatos", "fecha") -notcontains $_ }).Count -eq 0) -and ($h.Texto -notmatch "version|next|prisma|postgres"))

# Limpieza: se cancela la orden de prueba
Ver "aux" "Gerente cancela la orden de prueba" 200 (Llamar $ger "POST" "/api/ordenes-compra/$($orden.Datos.id)/cancelar" @{ motivo = "Orden de prueba de seguridad (Fase 8)" })

Write-Host ""
$color = if ($script:ok -eq $script:total) { "Green" } else { "Yellow" }
Write-Host ("Resultado: {0} de {1} verificaciones OK." -f $script:ok, $script:total) -ForegroundColor $color
