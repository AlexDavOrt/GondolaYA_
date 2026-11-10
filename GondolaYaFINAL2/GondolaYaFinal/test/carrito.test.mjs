import test from 'node:test';
import assert from 'node:assert';
import { calcularTotales, carritoReducer, idProducto, itemDesdeProducto, MAX_CANTIDAD, MAX_ITEMS } from '../src/context/carritoReducer.js';

const leche = { supermercado: 'Día', ean: '123', nombre: 'Leche 1L', precio: 1500.5, logo: 'ass/dia.png', url: 'https://dia.com/leche' };
const arroz = { supermercado: 'Jumbo', ean: '456', nombre: 'Arroz 1kg', precio: 2000, logo: 'ass/jumbo.png', url: 'https://jumbo.com/arroz' };
const add = (s, p) => carritoReducer(s, { tipo: 'agregar', item: itemDesdeProducto(p) });

test('agregar suma cantidad si el producto ya está y guarda el enlace', () => {
  let s = add([], leche);
  s = add(s, leche);
  assert.equal(s.length, 1);
  assert.equal(s[0].cantidad, 2);
  assert.equal(s[0].url, 'https://dia.com/leche');
});

test('el mismo producto en dos supermercados son dos items distintos', () => {
  assert.notEqual(idProducto(leche), idProducto({ ...leche, supermercado: 'Vea' }));
});

test('cambiar cantidad: sube, baja y quita el item al llegar a 0', () => {
  let s = add([], leche);
  const id = s[0].id;
  s = carritoReducer(s, { tipo: 'cambiar', id, delta: 1 });
  assert.equal(s[0].cantidad, 2);
  s = carritoReducer(s, { tipo: 'cambiar', id, delta: -1 });
  s = carritoReducer(s, { tipo: 'cambiar', id, delta: -1 });
  assert.equal(s.length, 0);
});

test('respeta los máximos de unidades y de productos', () => {
  let s = add([], leche);
  for (let i = 0; i < 150; i++) s = carritoReducer(s, { tipo: 'cambiar', id: s[0].id, delta: 1 });
  assert.equal(s[0].cantidad, MAX_CANTIDAD);
  let lleno = [];
  for (let i = 0; i < MAX_ITEMS + 10; i++) lleno = add(lleno, { ...leche, ean: 'e' + i });
  assert.equal(lleno.length, MAX_ITEMS);
});

test('quitar y vaciar', () => {
  let s = add(add([], leche), arroz);
  s = carritoReducer(s, { tipo: 'quitar', id: s[0].id });
  assert.equal(s.length, 1);
  assert.equal(carritoReducer(s, { tipo: 'vaciar' }).length, 0);
});

test('fusionar suma las unidades de invitado con las de la cuenta', () => {
  const cuenta = [{ ...itemDesdeProducto(leche), cantidad: 2 }];
  const invitado = [{ ...itemDesdeProducto(leche), cantidad: 1 }, itemDesdeProducto(arroz)];
  const s = carritoReducer([], { tipo: 'fusionar', items: [...cuenta, ...invitado] });
  assert.equal(s.length, 2);
  assert.equal(s.find((i) => i.nombre === 'Leche 1L').cantidad, 3);
});

test('reemplazar descarta basura y URLs peligrosas', () => {
  const s = carritoReducer([], {
    tipo: 'reemplazar',
    items: [{ ...itemDesdeProducto(leche), url: 'javascript:alert(1)', imagen: 'data:text/html,x' }, null, { id: 1 }],
  });
  assert.equal(s.length, 1);
  assert.equal(s[0].url, null);
  assert.equal(s[0].imagen, null);
});

test('totales por supermercado sin errores de decimales', () => {
  const s = [{ ...itemDesdeProducto({ ...leche, precio: 0.1 }), cantidad: 3 }, { ...itemDesdeProducto(leche), cantidad: 2 }, itemDesdeProducto(arroz)];
  const t = calcularTotales(s);
  assert.equal(t.cantidad, 6);
  assert.equal(t.grupos.length, 2);
  assert.equal(t.grupos[0].subtotal, 3001.3);
  assert.equal(t.total, 5001.3);
});

/* ---------- comparar la canasta y pasar productos de cadena ---------- */
import { ahorroPosible, compararCanasta, moverAOferta, ofertasDe } from '../src/context/carritoReducer.js';

const ofertasLeche = [
  { supermercado: 'Día', logo: 'ass/dia.png', nombre: 'Leche 1L Día', precio: 1500, url: 'https://dia.com/leche', imagen: null },
  { supermercado: 'Jumbo', logo: 'ass/jumbo.png', nombre: 'Leche 1L Jumbo', precio: 1700, url: 'https://jumbo.com/leche', imagen: null },
  { supermercado: 'Vea', logo: 'ass/vea.png', nombre: 'Leche 1L Vea', precio: 1600, url: 'https://vea.com/leche', imagen: null },
];
const ofertasArroz = [
  { supermercado: 'Jumbo', logo: 'ass/jumbo.png', nombre: 'Arroz 1kg Jumbo', precio: 2000, url: 'https://jumbo.com/arroz', imagen: null },
  { supermercado: 'Vea', logo: 'ass/vea.png', nombre: 'Arroz 1kg Vea', precio: 2300, url: 'https://vea.com/arroz', imagen: null },
];
const lecheEn = (s, n = 1) => ({ ...itemDesdeProducto({ ...leche, ...ofertasLeche.find((o) => o.supermercado === s), ean: '123' }, { medida: '1 L', ofertas: ofertasLeche }), cantidad: n });
const arrozEn = (s) => itemDesdeProducto({ ...arroz, ...ofertasArroz.find((o) => o.supermercado === s), ean: '456' }, { ofertas: ofertasArroz });

test('itemDesdeProducto guarda ean, medida, fecha y ofertas', () => {
  const it = lecheEn('Jumbo');
  assert.equal(it.ean, '123');
  assert.equal(it.medida, '1 L');
  assert.ok(it.ts > 0);
  assert.equal(it.ofertas.length, 3);
});

test('ofertasDe incluye la del propio supermercado una sola vez', () => {
  const o = ofertasDe(lecheEn('Jumbo'));
  assert.equal(o.length, 3);
  assert.equal(o[0].supermercado, 'Jumbo');
  assert.equal(o.filter((x) => x.supermercado === 'Jumbo').length, 1);
});

test('ahorroPosible: sugiere la cadena más barata y multiplica por la cantidad', () => {
  const a = ahorroPosible(lecheEn('Jumbo', 3));
  assert.equal(a.oferta.supermercado, 'Día');
  assert.equal(a.ahorro, 600);
  assert.equal(ahorroPosible(lecheEn('Día')), null);
});

test('compararCanasta: separa las cadenas que tienen todo de las que no y calcula la mejor mezcla', () => {
  const items = [lecheEn('Jumbo', 2), arrozEn('Jumbo')];
  const c = compararCanasta(items);
  assert.equal(c.actual, 2 * 1700 + 2000);
  // Día no tiene arroz: queda como parcial. Jumbo (5.400) y Vea (5.500) tienen todo, de más barata a más cara.
  assert.deepEqual(c.porTienda.filter((t) => t.completa).map((t) => t.supermercado), ['Jumbo', 'Vea']);
  assert.equal(c.porTienda.find((t) => t.supermercado === 'Vea').total, 2 * 1600 + 2300);
  const dia = c.porTienda.find((t) => t.supermercado === 'Día');
  assert.equal(dia.completa, false);
  assert.deepEqual(dia.faltan, ['Arroz 1kg Jumbo']);
  // mejor mezcla: leche en Día (1500) y arroz en Jumbo (2000)
  assert.equal(c.mejorMezcla, 2 * 1500 + 2000);
});

test('moverAOferta cambia de cadena sin perder la cantidad ni las demás ofertas', () => {
  const it = lecheEn('Jumbo', 4);
  const movido = moverAOferta(it, ofertasDe(it).find((o) => o.supermercado === 'Día'));
  assert.equal(movido.supermercado, 'Día');
  assert.equal(movido.precio, 1500);
  assert.equal(movido.cantidad, 4);
  assert.equal(movido.url, 'https://dia.com/leche');
  assert.notEqual(movido.id, it.id);
  // se puede volver atrás
  assert.equal(ofertasDe(movido).find((o) => o.supermercado === 'Jumbo').precio, 1700);
});

test('cambiarTienda y reasignar (todo a una cadena / a lo más barato)', () => {
  const s = [lecheEn('Jumbo', 2), arrozEn('Jumbo')];
  const aDia = carritoReducer(s, { tipo: 'cambiarTienda', id: s[0].id, supermercado: 'Día' });
  assert.equal(aDia[0].supermercado, 'Día');
  assert.equal(aDia[1].supermercado, 'Jumbo');

  const todoVea = carritoReducer(s, { tipo: 'reasignar', tienda: 'Vea' });
  assert.deepEqual(todoVea.map((i) => i.supermercado), ['Vea', 'Vea']);

  // 'Día' no tiene arroz: ese producto se queda donde estaba
  const todoDia = carritoReducer(s, { tipo: 'reasignar', tienda: 'Día' });
  assert.deepEqual(todoDia.map((i) => i.supermercado), ['Día', 'Jumbo']);

  const barato = carritoReducer(s, { tipo: 'reasignar', tienda: null });
  assert.deepEqual(barato.map((i) => i.supermercado), ['Día', 'Jumbo']);
  assert.equal(calcularTotales(barato).total, 2 * 1500 + 2000);
});

test('si dos productos terminan siendo el mismo, se suman las cantidades', () => {
  const s = [lecheEn('Jumbo', 2), lecheEn('Día', 3)];
  const r = carritoReducer(s, { tipo: 'cambiarTienda', id: s[0].id, supermercado: 'Día' });
  assert.equal(r.length, 1);
  assert.equal(r[0].cantidad, 5);
});

test('normalizar descarta ofertas inválidas y URLs peligrosas', () => {
  const it = { ...lecheEn('Jumbo'), ofertas: [
    { supermercado: 'Día', nombre: 'x', precio: 10, url: 'javascript:alert(1)', imagen: 'data:x', logo: '../../etc/passwd' },
    { supermercado: 'Día', nombre: 'repetida', precio: 11 },
    { supermercado: 'Vea', nombre: 'sin precio', precio: 0 },
    null,
  ] };
  const [limpio] = carritoReducer([], { tipo: 'reemplazar', items: [it] });
  assert.equal(limpio.ofertas.length, 1);
  assert.equal(limpio.ofertas[0].url, null);
  assert.equal(limpio.ofertas[0].imagen, null);
  assert.equal(limpio.ofertas[0].logo, null);
});

/* ---------- actualizar precios ---------- */
import { itemActualizado } from '../src/context/carritoReducer.js';

test('itemActualizado pone el precio de hoy y renueva las ofertas de todas las cadenas', () => {
  const it = lecheEn('Jumbo', 2);
  const grupos = [{ medida: '1 L', ofertas: [
    { supermercado: 'Jumbo', nombre: 'Leche 1L Jumbo', precio: 1800, ean: '123', url: 'https://jumbo.com/leche', logo: 'ass/jumbo.png' },
    { supermercado: 'Día', nombre: 'Leche 1L Día', precio: 1550, ean: '000123', url: 'https://dia.com/leche', logo: 'ass/dia.png' },
  ] }];
  const nuevo = itemActualizado(it, grupos, 5000);
  assert.equal(nuevo.precio, 1800);
  assert.equal(nuevo.ts, 5000);
  assert.equal(nuevo.cantidad, 2);
  assert.deepEqual(nuevo.ofertas.map((o) => o.supermercado).sort(), ['Día', 'Jumbo']);
  // Si la cadena ya no lo tiene, no se inventa nada
  assert.equal(itemActualizado(it, [{ ofertas: [grupos[0].ofertas[1]] }]), null);
  assert.equal(itemActualizado(it, []), null);
});

test('la acción actualizar conserva el id y la cantidad', () => {
  const s = [lecheEn('Jumbo', 3)];
  const nuevo = { ...s[0], precio: 1999 };
  const r = carritoReducer(s, { tipo: 'actualizar', id: s[0].id, item: nuevo });
  assert.equal(r[0].precio, 1999);
  assert.equal(r[0].id, s[0].id);
  assert.equal(r[0].cantidad, 3);
});
