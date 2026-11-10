'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { parsearCantidad, precioUnitario } = require('../lib/unidades');
const { convertir, agruparOfertas, normalizarEan } = require('../lib/catalogo');
const { crearLimitador } = require('../lib/limitador');

test('parsearCantidad lee litros, gramos, kilos y packs del nombre', () => {
  const casos = [
    ['Leche Entera Sachet 1 L', 'volumen', 1000],
    ['Aceite de girasol 900 cc', 'volumen', 900],
    ['Fideos Spaghetti 500g', 'peso', 500],
    ['Yerba Mate 1kg', 'peso', 1000],
    ['Coca Cola 2,25 L', 'volumen', 2250],
    ['Gaseosa 6 x 330 ml', 'volumen', 1980],
    ['Cerveza Lata 473 ml x6', 'volumen', 2838],
    ['Jabón 125g x 3', 'peso', 375],
    ['Arroz x 1 kg', 'peso', 1000],
    ['Huevos x 12 u', 'unidad', 12],
  ];
  for (const [nombre, tipo, base] of casos) {
    const c = parsearCantidad(nombre);
    assert.ok(c, nombre);
    assert.equal(c.tipo, tipo, nombre);
    assert.equal(c.base, base, nombre);
  }
});

test('parsearCantidad no inventa: sin medida clara devuelve null', () => {
  for (const nombre of ['Pañales Talle G', 'Queso cremoso', 'Detergente 3 en 1', '', null, undefined]) {
    assert.equal(parsearCantidad(nombre), null, String(nombre));
  }
  // "lata" no es litros, ni "3 en 1" son 3 unidades
  assert.equal(parsearCantidad('Lata de arvejas'), null);
});

test('parsearCantidad muestra los packs como "6 × 330 ml" y el precio unitario es por litro/kg/unidad', () => {
  assert.equal(parsearCantidad('Gaseosa 6 x 330 ml').etiqueta, '6 × 330 ml');
  assert.equal(precioUnitario(1500, parsearCantidad('Leche 1L')), 1500);
  assert.equal(precioUnitario(4500, parsearCantidad('Gaseosa 6 x 330 ml')), 2272.73);
  assert.equal(precioUnitario(3000, parsearCantidad('Huevos x 12 u')), 250);
  assert.equal(precioUnitario(3000, null), null);
});

const vtex = (nombre, precio, ean, stock = 5) => ({
  productName: nombre, brand: 'Marca', link: `https://tienda.com/${ean}/p`,
  items: [{ ean, images: [{ imageUrl: 'https://img.com/a.jpg' }], sellers: [{ commertialOffer: { Price: precio, AvailableQuantity: stock } }] }],
});

test('convertir toma el precio, la medida y descarta lo que no tiene stock', () => {
  const r = convertir('dia', [vtex('Leche 1 L', 1500, '779001'), vtex('Leche sin stock 1 L', 900, '779002', 0)]);
  assert.equal(r.length, 1);
  assert.equal(r[0].supermercado, 'Día');
  assert.equal(r[0].precio, 1500);
  assert.equal(r[0].cantidad.etiqueta, '1 L');
});

test('agruparOfertas junta el mismo código de barras entre cadenas (aunque cambien los ceros) y calcula el ahorro', () => {
  const productos = [
    ...convertir('jumbo', [vtex('Leche Entera 1 L', 1700, '7790742000011')]),
    ...convertir('dia', [vtex('Leche entera 1L', 1500, '7790742000011')]),
    ...convertir('disco', [vtex('Leche Entera 1 L', 1650, '07790742000011')]),
    ...convertir('vea', [vtex('Leche de almendras 1 L', 3400, '')]),
  ];
  const grupos = agruparOfertas(productos);
  assert.equal(grupos.length, 2);
  const leche = grupos.find((g) => g.ofertas.length === 3);
  assert.deepEqual(leche.ofertas.map((o) => o.supermercado), ['Día', 'Disco', 'Jumbo']);
  assert.equal(leche.precioMin, 1500);
  assert.equal(leche.ahorro, 200);
  assert.equal(leche.ahorroPct, 12);
  assert.equal(leche.unidad, 'L');
  assert.equal(leche.ofertas[0].precioUnitario, 1500);
  // Sin código de barras no se adivina: queda solo
  assert.equal(grupos.find((g) => g.ofertas.length === 1).ofertas[0].supermercado, 'Vea');
});

test('agruparOfertas deja una sola oferta por cadena (la más barata)', () => {
  const productos = convertir('dia', [vtex('Leche 1 L', 1500, '7790742000011'), vtex('Leche 1 L promo', 1400, '7790742000011')]);
  const [g] = agruparOfertas(productos);
  assert.equal(g.ofertas.length, 1);
  assert.equal(g.precioMin, 1400);
});

test('normalizarEan', () => {
  assert.equal(normalizarEan('07790742000011'), '7790742000011');
  assert.equal(normalizarEan('12'), null);
  assert.equal(normalizarEan(null), null);
});

test('limitador: corta después del máximo y se reinicia al pasar la ventana', () => {
  let t = 0;
  const lim = crearLimitador({ max: 3, ventanaMs: 1000, ahora: () => t });
  const res = () => { const r = { codigo: 200, cabeceras: {} }; r.status = (c) => { r.codigo = c; return r; }; r.json = (b) => { r.body = b; return r; }; r.set = (k, v) => { r.cabeceras[k] = v; }; return r; };
  const pedir = () => { let paso = false; const r = res(); lim({ ip: '9.9.9.9' }, r, () => { paso = true; }); return { paso, r }; };
  assert.ok(pedir().paso && pedir().paso && pedir().paso);
  const bloqueado = pedir();
  assert.equal(bloqueado.paso, false);
  assert.equal(bloqueado.r.codigo, 429);
  assert.ok(bloqueado.r.cabeceras['Retry-After']);
  // otra IP no se ve afectada
  let otra = false; lim({ ip: '8.8.8.8' }, res(), () => { otra = true; });
  assert.ok(otra);
  t = 1500;
  assert.ok(pedir().paso);
});
