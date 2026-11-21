// ============================================================
// CeibaERP - Catalogos ficticios para los datos de demostracion
// Todos los nombres, documentos y NIT son inventados.
// ============================================================

export type SucursalSeed = {
  codigo: string;
  nombre: string;
  ciudad: string;
  direccion: string;
  ventasBaseDia: number; // ventas promedio por dia habil
  itemsMin: number;
  itemsMax: number;
  probClienteIdentificado: number;
};

export const SUCURSALES: SucursalSeed[] = [
  { codigo: "SUC-CEN", nombre: "Ceiba Centro", ciudad: "Medellín", direccion: "Carrera 50 # 50-20", ventasBaseDia: 30, itemsMin: 1, itemsMax: 3, probClienteIdentificado: 0.35 },
  { codigo: "SUC-LAU", nombre: "Ceiba Laureles", ciudad: "Medellín", direccion: "Circular 1 # 70-15", ventasBaseDia: 21, itemsMin: 2, itemsMax: 5, probClienteIdentificado: 0.55 },
  { codigo: "SUC-ENV", nombre: "Ceiba Envigado", ciudad: "Envigado", direccion: "Calle 38 Sur # 43-10", ventasBaseDia: 36, itemsMin: 1, itemsMax: 4, probClienteIdentificado: 0.4 },
  { codigo: "SUC-BEL", nombre: "Ceiba Bello", ciudad: "Bello", direccion: "Carrera 50 # 45-30", ventasBaseDia: 15, itemsMin: 1, itemsMax: 3, probClienteIdentificado: 0.3 },
];

export const CATEGORIAS = [
  { nombre: "Abarrotes", descripcion: "Granos, aceites, pastas y enlatados" },
  { nombre: "Lácteos y huevos", descripcion: "Leche, quesos, yogures y huevos" },
  { nombre: "Bebidas", descripcion: "Aguas, gaseosas, jugos y otras bebidas" },
  { nombre: "Aseo del hogar", descripcion: "Detergentes, limpiadores y papel" },
  { nombre: "Frutas y verduras", descripcion: "Productos frescos" },
  { nombre: "Panadería", descripcion: "Panes, arepas y galletas" },
  { nombre: "Carnes y embutidos", descripcion: "Pollo, res, cerdo y embutidos" },
  { nombre: "Cuidado personal", descripcion: "Higiene y cuidado personal" },
];

export type ProveedorSeed = {
  clave: string;
  nit: string;
  nombre: string;
  contacto: string;
  telefono: string;
  email: string;
  tiempoEntregaDias: number;
  probEntregaTardia: number;
};

export const PROVEEDORES: ProveedorSeed[] = [
  { clave: "P1", nit: "900111222-3", nombre: "Distribuidora Andina de Alimentos S.A.S.", contacto: "Marta Lucía Restrepo", telefono: "6044440101", email: "pedidos@andina-alimentos.test", tiempoEntregaDias: 4, probEntregaTardia: 0.55 },
  { clave: "P2", nit: "900222333-4", nombre: "Lácteos La Pradera S.A.S.", contacto: "Jorge Iván Zapata", telefono: "6044440202", email: "ventas@lapradera.test", tiempoEntregaDias: 2, probEntregaTardia: 0.1 },
  { clave: "P3", nit: "900333444-5", nombre: "Bebidas del Valle S.A.S.", contacto: "Paula Andrea Gomez", telefono: "6044440303", email: "comercial@bebidasvalle.test", tiempoEntregaDias: 3, probEntregaTardia: 0.1 },
  { clave: "P4", nit: "900444555-6", nombre: "Químicos del Hogar Ltda.", contacto: "Hernán Darío Ospina", telefono: "6044440404", email: "pedidos@quimicoshogar.test", tiempoEntregaDias: 5, probEntregaTardia: 0.08 },
  { clave: "P5", nit: "900555666-7", nombre: "Agrofrescos de Oriente S.A.S.", contacto: "Luz Elena Cardona", telefono: "6044440505", email: "despachos@agrofrescos.test", tiempoEntregaDias: 2, probEntregaTardia: 0.12 },
  { clave: "P6", nit: "900666777-8", nombre: "Panificadora San Telmo S.A.S.", contacto: "Carlos Mario Velez", telefono: "6044440606", email: "pedidos@santelmo.test", tiempoEntregaDias: 2, probEntregaTardia: 0.05 },
  { clave: "P7", nit: "900777888-9", nombre: "Cárnicos El Rodeo S.A.S.", contacto: "Diana Marcela Rios", telefono: "6044440707", email: "ventas@elrodeo.test", tiempoEntregaDias: 3, probEntregaTardia: 0.1 },
  { clave: "P8", nit: "900888999-0", nombre: "Cosméticos Aurora S.A.S.", contacto: "Andrés Felipe Mejia", telefono: "6044440808", email: "comercial@cosmeticosaurora.test", tiempoEntregaDias: 6, probEntregaTardia: 0.08 },
];

/**
 * Caso sembrado del producto:
 * - RIESGO: alta demanda; termina con cobertura menor al tiempo de entrega.
 * - AGOTADO: se deja de reponer en una sucursal y termina en 0.
 * - BAJA_ROTACION: muy poca demanda y existencias por encima del maximo.
 */
export type CasoProducto = "NORMAL" | "RIESGO" | "AGOTADO" | "BAJA_ROTACION";

export type ProductoSeed = {
  sku: string;
  nombre: string;
  categoria: string;
  proveedor: string;
  unidad: string;
  costo: number;
  precio: number;
  peso: number; // popularidad relativa
  caso: CasoProducto;
  sucursalAgotada?: string; // solo para AGOTADO
};

const p = (
  sku: string, nombre: string, categoria: string, proveedor: string, unidad: string,
  costo: number, precio: number, peso: number, caso: CasoProducto = "NORMAL", sucursalAgotada?: string,
): ProductoSeed => ({ sku, nombre, categoria, proveedor, unidad, costo, precio, peso, caso, sucursalAgotada });

export const PRODUCTOS: ProductoSeed[] = [
  // Abarrotes (proveedor impuntual P1)
  p("ABA-001", "Arroz blanco 1 kg", "Abarrotes", "P1", "unidad", 3900, 4900, 6, "RIESGO"),
  p("ABA-002", "Aceite de girasol 1 L", "Abarrotes", "P1", "unidad", 9800, 12500, 3.5, "RIESGO"),
  p("ABA-003", "Café molido 500 g", "Abarrotes", "P1", "unidad", 14500, 18900, 2.5, "RIESGO"),
  p("ABA-004", "Azúcar 1 kg", "Abarrotes", "P1", "unidad", 3600, 4600, 4),
  p("ABA-005", "Frijol rojo 500 g", "Abarrotes", "P1", "unidad", 5200, 6900, 2, "AGOTADO", "SUC-ENV"),
  p("ABA-006", "Lenteja 500 g", "Abarrotes", "P1", "unidad", 3100, 4200, 1.8),
  p("ABA-007", "Pasta spaghetti 500 g", "Abarrotes", "P1", "unidad", 2700, 3800, 3),
  p("ABA-008", "Atún en lata 170 g", "Abarrotes", "P1", "unidad", 5600, 7500, 2.5),
  p("ABA-009", "Quinua 500 g", "Abarrotes", "P1", "unidad", 11800, 15900, 0.08, "BAJA_ROTACION"),
  p("ABA-010", "Aceite de oliva extra virgen 500 ml", "Abarrotes", "P1", "unidad", 26500, 34900, 0.06, "BAJA_ROTACION"),
  p("ABA-011", "Vinagre balsámico 250 ml", "Abarrotes", "P1", "unidad", 12900, 16900, 0.05, "BAJA_ROTACION"),
  // Lácteos y huevos
  p("LAC-001", "Leche entera 1 L", "Lácteos y huevos", "P2", "unidad", 3300, 4300, 8, "RIESGO"),
  p("LAC-002", "Huevos AA x30", "Lácteos y huevos", "P2", "paquete", 15500, 19900, 3, "RIESGO"),
  p("LAC-003", "Queso campesino 500 g", "Lácteos y huevos", "P2", "unidad", 9900, 13500, 2),
  p("LAC-004", "Yogur natural 1 L", "Lácteos y huevos", "P2", "unidad", 6800, 8900, 1.8),
  p("LAC-005", "Mantequilla 250 g", "Lácteos y huevos", "P2", "unidad", 7400, 9800, 1.2),
  p("LAC-006", "Kumis 1 L", "Lácteos y huevos", "P2", "unidad", 5900, 7600, 1.3),
  p("LAC-007", "Crema de leche 200 ml", "Lácteos y huevos", "P2", "unidad", 3400, 4500, 1),
  // Bebidas (categoria con tendencia creciente)
  p("BEB-001", "Agua sin gas 600 ml", "Bebidas", "P3", "unidad", 1300, 2200, 5),
  p("BEB-002", "Gaseosa cola 1.5 L", "Bebidas", "P3", "unidad", 4300, 6200, 4),
  p("BEB-003", "Jugo de naranja 1 L", "Bebidas", "P3", "unidad", 5200, 7400, 2),
  p("BEB-004", "Bebida energizante 250 ml", "Bebidas", "P3", "unidad", 3800, 5900, 1.5),
  p("BEB-005", "Té helado 500 ml", "Bebidas", "P3", "unidad", 2600, 3900, 1.6),
  p("BEB-006", "Agua con gas 600 ml", "Bebidas", "P3", "unidad", 1600, 2600, 1),
  p("BEB-007", "Cerveza lager six-pack", "Bebidas", "P3", "paquete", 14200, 18900, 1.8),
  // Aseo del hogar
  p("ASE-001", "Detergente en polvo 1 kg", "Aseo del hogar", "P4", "unidad", 9200, 12400, 1.8),
  p("ASE-002", "Jabón lavaloza 500 g", "Aseo del hogar", "P4", "unidad", 4100, 5600, 2),
  p("ASE-003", "Papel higiénico x12", "Aseo del hogar", "P4", "paquete", 16800, 21900, 2.5),
  p("ASE-004", "Limpiador multiusos 1 L", "Aseo del hogar", "P4", "unidad", 5300, 7200, 1.2),
  p("ASE-005", "Blanqueador 2 L", "Aseo del hogar", "P4", "unidad", 5800, 7900, 1.3),
  p("ASE-006", "Suavizante de ropa 1 L", "Aseo del hogar", "P4", "unidad", 7100, 9600, 0.9, "AGOTADO", "SUC-LAU"),
  p("ASE-007", "Ambientador premium en aerosol", "Aseo del hogar", "P4", "unidad", 16500, 22900, 0.05, "BAJA_ROTACION"),
  p("ASE-008", "Bolsas de basura x10", "Aseo del hogar", "P4", "paquete", 3700, 5200, 1.4),
  // Frutas y verduras
  p("FRU-001", "Banano", "Frutas y verduras", "P5", "kg", 2400, 3400, 5),
  p("FRU-002", "Tomate chonto", "Frutas y verduras", "P5", "kg", 3100, 4500, 3.5),
  p("FRU-003", "Papa pastusa", "Frutas y verduras", "P5", "kg", 1900, 2900, 4),
  p("FRU-004", "Cebolla cabezona", "Frutas y verduras", "P5", "kg", 2600, 3800, 2.5),
  p("FRU-005", "Aguacate", "Frutas y verduras", "P5", "unidad", 2900, 4200, 2),
  p("FRU-006", "Manzana roja", "Frutas y verduras", "P5", "kg", 6400, 8900, 1.5),
  p("FRU-007", "Limón Tahití", "Frutas y verduras", "P5", "kg", 2700, 3900, 1.8),
  // Panadería
  p("PAN-001", "Pan tajado 500 g", "Panadería", "P6", "unidad", 4700, 6300, 3.5),
  p("PAN-002", "Arepas de maíz x10", "Panadería", "P6", "paquete", 3900, 5400, 3),
  p("PAN-003", "Pan francés", "Panadería", "P6", "unidad", 450, 700, 6),
  p("PAN-004", "Galletas de soda x6", "Panadería", "P6", "paquete", 3300, 4600, 1.5),
  p("PAN-005", "Tostadas integrales", "Panadería", "P6", "paquete", 4800, 6500, 0.9),
  p("PAN-006", "Croissant", "Panadería", "P6", "unidad", 1500, 2400, 1.2),
  // Carnes y embutidos
  p("CAR-001", "Pechuga de pollo", "Carnes y embutidos", "P7", "kg", 13900, 17900, 2.5),
  p("CAR-002", "Carne molida de res", "Carnes y embutidos", "P7", "kg", 19800, 25900, 2),
  p("CAR-003", "Salchicha x10", "Carnes y embutidos", "P7", "paquete", 7800, 10500, 1.8, "AGOTADO", "SUC-BEL"),
  p("CAR-004", "Jamón de cerdo 250 g", "Carnes y embutidos", "P7", "unidad", 6900, 9200, 1.4),
  p("CAR-005", "Chorizo x6", "Carnes y embutidos", "P7", "paquete", 9500, 12900, 1.2),
  p("CAR-006", "Lomo de cerdo", "Carnes y embutidos", "P7", "kg", 18500, 23900, 1),
  // Cuidado personal
  p("CUI-001", "Crema dental 100 ml", "Cuidado personal", "P8", "unidad", 4300, 5900, 2),
  p("CUI-002", "Jabón de baño x3", "Cuidado personal", "P8", "paquete", 6200, 8400, 1.5),
  p("CUI-003", "Champú 400 ml", "Cuidado personal", "P8", "unidad", 10900, 14500, 1.2),
  p("CUI-004", "Desodorante roll-on", "Cuidado personal", "P8", "unidad", 9800, 12900, 1),
  p("CUI-005", "Toallas higiénicas x10", "Cuidado personal", "P8", "paquete", 4900, 6700, 1.1),
  p("CUI-006", "Champú anticaspa premium 700 ml", "Cuidado personal", "P8", "unidad", 27900, 36900, 0.05, "BAJA_ROTACION"),
  p("CUI-007", "Crema facial antiedad 50 ml", "Cuidado personal", "P8", "unidad", 38900, 49900, 0.04, "BAJA_ROTACION"),
  p("CUI-008", "Cepillo dental", "Cuidado personal", "P8", "unidad", 3500, 4900, 0.9),
];

export const NOMBRES = [
  "Alejandro", "Andrea", "Camila", "Carlos", "Catalina", "Daniel", "Daniela", "David", "Diana", "Esteban",
  "Felipe", "Gloria", "Isabel", "Jorge", "Juan", "Julián", "Laura", "Luisa", "Manuela", "María",
  "Mateo", "Natalia", "Pablo", "Paula", "Santiago", "Sara", "Sebastián", "Sofía", "Valentina", "Verónica",
];

export const APELLIDOS = [
  "Arango", "Arias", "Cardona", "Castaño", "Echeverri", "Franco", "Gallego", "Garcia", "Giraldo", "Gomez",
  "Henao", "Hoyos", "Jaramillo", "Lopez", "Marin", "Mejia", "Montoya", "Muñoz", "Ospina", "Posada",
  "Quintero", "Restrepo", "Rios", "Rodriguez", "Salazar", "Sierra", "Tamayo", "Uribe", "Velez", "Zapata",
];

export type UsuarioSeed = { nombre: string; email: string; rol: "ADMIN" | "GERENTE" | "BODEGA" | "CAJERO"; sucursal?: string };

export const USUARIOS: UsuarioSeed[] = [
  { nombre: "Adriana Admin Ceiba", email: "admin@ceiba.test", rol: "ADMIN" },
  { nombre: "Gabriel Gerente Ceiba", email: "gerente@ceiba.test", rol: "GERENTE" },
  { nombre: "Bernardo Bodega Centro", email: "bodega.centro@ceiba.test", rol: "BODEGA", sucursal: "SUC-CEN" },
  { nombre: "Beatriz Bodega Laureles", email: "bodega.laureles@ceiba.test", rol: "BODEGA", sucursal: "SUC-LAU" },
  { nombre: "Bruno Bodega Envigado", email: "bodega.envigado@ceiba.test", rol: "BODEGA", sucursal: "SUC-ENV" },
  { nombre: "Brenda Bodega Bello", email: "bodega.bello@ceiba.test", rol: "BODEGA", sucursal: "SUC-BEL" },
  { nombre: "Camilo Cajero Centro", email: "cajero.centro@ceiba.test", rol: "CAJERO", sucursal: "SUC-CEN" },
  { nombre: "Carolina Cajera Laureles", email: "cajero.laureles@ceiba.test", rol: "CAJERO", sucursal: "SUC-LAU" },
  { nombre: "César Cajero Envigado", email: "cajero.envigado@ceiba.test", rol: "CAJERO", sucursal: "SUC-ENV" },
  { nombre: "Claudia Cajera Bello", email: "cajero.bello@ceiba.test", rol: "CAJERO", sucursal: "SUC-BEL" },
];
