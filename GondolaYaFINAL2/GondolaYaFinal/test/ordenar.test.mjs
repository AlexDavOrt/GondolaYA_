import test from 'node:test';
import assert from 'node:assert';
import { filtrarGrupos, ordenarGrupos, resumenMejor, tipoDominante } from '../src/lib/ordenar.js';
import { haceCuanto, precioUnitarioTexto } from '../src/lib/formato.js';

const g = (nombre, precioMin, extra = {}) => ({
  clave: nombre, nombre, precioMin, precioMax: precioMin, ahorro: 0, ofertas: [{ nombre, supermercado: 'Día', precio: precioMin }],
  tipoMedida: null, precioUnitarioMin: null, unidad: null, ...extra,
});
const leche1 = g('Leche 1L', 1500, { tipoMedida: 'volumen', unidad: 'L', precioUnitarioMin: 1500, ahorro: 200, precioMax: 1700 });
const pack6 = g('Leche 6 x 1L', 8400, { tipoMedida: 'volumen', unidad: 'L', precioUnitarioMin: 1400, ahorro: 500, precioMax: 8900 });
const polvo = g('Leche en polvo 800 g', 9000, { tipoMedida: 'peso', unidad: 'kg', precioUnitarioMin: 11250 });
const almendras = g('Leche de almendras', 3000);
const todos = [polvo, leche1, almendras, pack6];
const FORMATO = { precio: (n) => `$${n}`, unitario: (n, u) => `$${n}/${u}`, unidad: (u) => u };

test('el tipo dominante es el que más se repite (no mezcla litros con kilos)', () => {
  assert.equal(tipoDominante(todos), 'volumen');
});

test('por precio unitario: primero los comparables más baratos por litro, el resto después por precio', () => {
  const r = ordenarGrupos(todos, 'unitario').map((x) => x.nombre);
  assert.deepEqual(r, ['Leche 6 x 1L', 'Leche 1L', 'Leche de almendras', 'Leche en polvo 800 g']);
});

test('por precio y por diferencia entre cadenas', () => {
  assert.equal(ordenarGrupos(todos, 'precio')[0].nombre, 'Leche 1L');
  assert.equal(ordenarGrupos(todos, 'ahorro')[0].nombre, 'Leche 6 x 1L');
});

test('sin ninguna medida, el orden unitario cae a menor precio', () => {
  const r = ordenarGrupos([g('B', 20), g('A', 10)], 'unitario').map((x) => x.nombre);
  assert.deepEqual(r, ['A', 'B']);
});

test('ordenar no modifica la lista original', () => {
  const copia = [...todos];
  ordenarGrupos(todos, 'precio');
  assert.deepEqual(todos, copia);
});

test('filtrar: solo productos en más de una cadena', () => {
  const dos = { ...leche1, ofertas: [leche1.ofertas[0], { ...leche1.ofertas[0], supermercado: 'Vea' }] };
  assert.deepEqual(filtrarGrupos([dos, polvo], { soloComparables: true }).map((x) => x.nombre), ['Leche 1L']);
  assert.equal(filtrarGrupos([dos, polvo]).length, 2);
});

test('el destacado cambia según el orden elegido', () => {
  const porUnidad = ordenarGrupos(todos, 'unitario');
  assert.match(resumenMejor(porUnidad, 'unitario', FORMATO).etiqueta, /por L/);
  assert.equal(resumenMejor(porUnidad, 'unitario', FORMATO).valor, '$1400/L');
  assert.equal(resumenMejor(ordenarGrupos(todos, 'precio'), 'precio', FORMATO).valor, '$1500');
  assert.equal(resumenMejor(ordenarGrupos(todos, 'ahorro'), 'ahorro', FORMATO).valor, '$500');
  assert.equal(resumenMejor([], 'precio', FORMATO), null);
});

test('formato de precio unitario y de antigüedad', () => {
  assert.equal(precioUnitarioTexto(2272.73, 'L'), '$2.272,73/L');
  assert.equal(precioUnitarioTexto(250, 'un'), '$250/un.');
  const ahora = Date.UTC(2026, 10, 9, 12);
  assert.equal(haceCuanto(ahora - 30 * 1000, ahora), 'hace un momento');
  assert.equal(haceCuanto(ahora - 3 * 3600 * 1000, ahora), 'hace 3 horas');
  assert.equal(haceCuanto(ahora - 50 * 3600 * 1000, ahora), 'hace 2 días');
});
