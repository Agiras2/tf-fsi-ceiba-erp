# ============================================================
# CeibaERP - Pruebas de API de la Fase 4 (docs/10-PRU: PRU-I01, I04, I05,
# PRU-S03, S04, S05, S07, S08). Windows PowerShell 5.1.
# Uso (con la app en marcha):
#   powershell -ExecutionPolicy Bypass -File .\scripts\pruebas-api-fase04.ps1
#   powershell -ExecutionPolicy Bypass -File .\scripts\pruebas-api-fase04.ps1 -Base https://<app>.up.railway.app
# La clave de los usuarios demo se pide oculta y no se imprime ni se guarda.
# Crea una venta (que luego anula) y una orden (que luego cancela): el stock
# queda igual al inicial.
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

Write-Host ""
Write-Host "CeibaERP - pruebas de API de la Fase 4 contra $Base" -ForegroundColor Cyan
$caj  = Entrar "cajero.centro@ceiba.test"
$cajB = Entrar "cajero.bello@ceiba.test"
$bod  = Entrar "bodega.centro@ceiba.test"
$ger  = Entrar "gerente@ceiba.test"
if (-not ($caj -and $cajB -and $bod -and $ger)) {
  $noAscii = $clave -match '[^\x20-\x7E]'
  Write-Host ""
  Write-Host "No se ejecutaron las pruebas. Diagnostico (sin mostrar la clave):" -ForegroundColor Yellow
  Write-Host "  Longitud de la clave escrita: $($clave.Length) caracteres"
  Write-Host "  Contiene espacios al inicio o al final: $($clave -ne $clave.Trim())"
  Write-Host "  Contiene caracteres fuera de ASCII (tildes, n con virgulilla...): $noAscii"
  Write-Host "  Compruebe la misma clave en el navegador con cajero.centro@ceiba.test."
  $clave = $null
  exit 1
}
$clave = $null
Write-Host ""

$prod = (Llamar $caj "GET" "/api/inventario?q=PAN-003&tamano=1").Datos.datos[0]
Write-Host "Producto de prueba: $($prod.producto.nombre) - stock inicial $($prod.stock)"

$v = Llamar $caj "POST" "/api/ventas" @{ medioPago = "EFECTIVO"; items = @(@{ productoId = $prod.productoId; cantidad = 2 }) }
Ver "I01" "Cajero registra una venta" 201 $v
Write-Host "      Venta #$($v.Datos.id) - total $($v.Datos.total) calculado por el servidor"

$r = Llamar $caj "POST" "/api/ventas" @{ medioPago = "EFECTIVO"; items = @(@{ productoId = $prod.productoId; cantidad = 1; precioUnitario = 1 }) }
Ver "S04" "Venta con precioUnitario alterado" 400 $r

$r = Llamar $caj "POST" "/api/ventas" @{ medioPago = "EFECTIVO"; total = 1; items = @(@{ productoId = $prod.productoId; cantidad = 1 }) }
Ver "S04b" "Venta con total enviado por el cliente" 400 $r

$stock = (Llamar $caj "GET" "/api/inventario?q=PAN-003&tamano=1").Datos.datos[0].stock
$r = Llamar $caj "POST" "/api/ventas" @{ medioPago = "EFECTIVO"; items = @(@{ productoId = $prod.productoId; cantidad = $stock + 1 }) }
Ver "S07" "Venta con cantidad mayor al stock ($($stock + 1))" 409 $r

$r = Llamar $cajB "GET" "/api/ventas/$($v.Datos.id)"
Ver "S05" "Cajero de Bello consulta una venta de Centro" 404 $r

$r = Llamar $ger "POST" "/api/ventas/$($v.Datos.id)/anular" @{ motivo = "Prueba de anulacion Fase 4" }
Ver "I04" "Gerente anula la venta" 200 $r

$r = Llamar $ger "POST" "/api/ventas/$($v.Datos.id)/anular" @{ motivo = "Prueba de anulacion Fase 4" }
Ver "I04b" "Anular otra vez la misma venta" 409 $r

$final = (Llamar $caj "GET" "/api/inventario?q=PAN-003&tamano=1").Datos.datos[0].stock
Write-Host "      Stock final: $final (inicial: $($prod.stock))"

$fecha = (Get-Date).AddDays(3).ToString("yyyy-MM-dd")
$o = Llamar $bod "POST" "/api/ordenes-compra" @{ proveedorId = $prod.producto.proveedorId; fechaEsperada = $fecha; items = @(@{ productoId = $prod.productoId; cantidad = 10 }) }
Ver "I05" "Bodega crea una orden en borrador" 201 $o

$r = Llamar $bod "POST" "/api/ordenes-compra/$($o.Datos.id)/recibir"
Ver "S08" "Bodega recibe una orden en BORRADOR" 409 $r

$r = Llamar $caj "POST" "/api/ordenes-compra/$($o.Datos.id)/aprobar"
Ver "S03" "Cajero intenta aprobar la orden" 403 $r

$r = Llamar $ger "POST" "/api/ordenes-compra/$($o.Datos.id)/cancelar" @{ motivo = "Orden de prueba de seguridad" }
Ver "K01" "Gerente cancela la orden de prueba" 200 $r

Write-Host ""
$color = if ($script:ok -eq $script:total -and $final -eq $prod.stock) { "Green" } else { "Red" }
Write-Host ("Resultado: {0} de {1} pruebas OK; stock final igual al inicial: {2}" -f $script:ok, $script:total, ($final -eq $prod.stock)) -ForegroundColor $color
