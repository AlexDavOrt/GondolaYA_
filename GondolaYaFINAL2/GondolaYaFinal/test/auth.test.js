'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { crearAuth, sanitizarCarrito } = require('../auth');

function nuevoAuth() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gondolaya-'));
  return { auth: crearAuth({ dir }), dir };
}
function res() {
  const r = { status: 200, body: null };
  r.status = (c) => { r.codigo = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  return r;
}
const req = (body, extra = {}) => ({ body, headers: {}, ip: '1.1.1.1', ...extra });
const REG = { nombre: 'Ana Pérez', email: 'Ana@Mail.com', password: 'secreto123' };

test('registro crea usuario, devuelve token y guarda el hash (no la contraseña)', async () => {
  const { auth, dir } = nuevoAuth();
  const r = res();
  await auth.registro(req(REG), r);
  assert.equal(r.codigo, 201);
  assert.equal(r.body.usuario.email, 'ana@mail.com');
  assert.ok(r.body.token);
  const guardado = fs.readFileSync(path.join(dir, 'usuarios.json'), 'utf8');
  assert.ok(!guardado.includes('secreto123'));
});

test('registro rechaza datos inválidos y emails repetidos', async () => {
  const { auth } = nuevoAuth();
  let r = res(); await auth.registro(req({ ...REG, password: 'corta' }), r);
  assert.equal(r.codigo, 400); assert.equal(r.body.campo, 'password');
  r = res(); await auth.registro(req({ ...REG, email: 'no-es-email' }), r);
  assert.equal(r.codigo, 400); assert.equal(r.body.campo, 'email');
  r = res(); await auth.registro(req({ ...REG, nombre: 'A' }), r);
  assert.equal(r.codigo, 400); assert.equal(r.body.campo, 'nombre');
  await auth.registro(req(REG), res());
  r = res(); await auth.registro(req({ ...REG, email: 'ANA@mail.com' }), r);
  assert.equal(r.codigo, 409);
});

test('login: correcto, contraseña mala, usuario inexistente y bloqueo por intentos', async () => {
  const { auth } = nuevoAuth();
  await auth.registro(req(REG), res());
  let r = res(); await auth.login(req({ email: 'ana@mail.com', password: 'secreto123' }), r);
  assert.ok(r.body.token);
  r = res(); await auth.login(req({ email: 'ana@mail.com', password: 'otra-clave' }), r);
  assert.equal(r.codigo, 401);
  r = res(); await auth.login(req({ email: 'nadie@mail.com', password: 'secreto123' }), r);
  assert.equal(r.codigo, 401);
  for (let i = 0; i < 5; i++) await auth.login(req({ email: 'ana@mail.com', password: 'mala' + i }), res());
  r = res(); await auth.login(req({ email: 'ana@mail.com', password: 'secreto123' }), r);
  assert.equal(r.codigo, 429);
});

test('requiereAuth: acepta token válido y rechaza falsificado, vencido o ausente', async () => {
  const { auth } = nuevoAuth();
  const reg = res(); await auth.registro(req(REG), reg);
  const { token, usuario } = reg.body;

  let r = res(); let siguio = false;
  const rq = req({}, { headers: { authorization: `Bearer ${token}` } });
  auth.requiereAuth(rq, r, () => { siguio = true; });
  assert.ok(siguio); assert.equal(rq.usuario.id, usuario.id);

  for (const malo of [token.slice(0, -2) + 'xx', 'basura', '', auth.firmar({ sub: usuario.id, exp: Date.now() - 1000 })]) {
    r = res(); siguio = false;
    auth.requiereAuth(req({}, { headers: { authorization: `Bearer ${malo}` } }), r, () => { siguio = true; });
    assert.ok(!siguio); assert.equal(r.codigo, 401);
  }
  r = res(); auth.requiereAuth(req({}), r, () => {}); assert.equal(r.codigo, 401);
});

test('el carrito se guarda por usuario, se sanea y persiste entre reinicios', async () => {
  const { auth, dir } = nuevoAuth();
  const reg = res(); await auth.registro(req(REG), reg);
  const rq = req({
    items: [
      { id: 'Dia|1', nombre: 'Leche', precio: 1500.456, supermercado: 'Día', url: 'https://x.com/p', imagen: 'javascript:alert(1)', cantidad: 2, logo: 'ass/dia.png' },
      { id: 'Dia|1', nombre: 'Repetido', precio: 5, supermercado: 'Día', cantidad: 1 },
      { id: 'x', nombre: 'Sin precio', supermercado: 'Día', precio: -3 },
      'basura',
    ],
  }, { headers: { authorization: `Bearer ${reg.body.token}` } });
  auth.requiereAuth(rq, res(), () => {});
  const r = res(); auth.guardarCarrito(rq, r);
  assert.equal(r.body.items.length, 1);
  assert.equal(r.body.items[0].precio, 1500.46);
  assert.equal(r.body.items[0].imagen, null);       // javascript: descartado
  assert.equal(r.body.items[0].cantidad, 2);

  const auth2 = crearAuth({ dir });                  // "reinicio" del servidor: mismo secreto y datos
  const rq2 = req({}, { headers: { authorization: `Bearer ${reg.body.token}` } });
  auth2.requiereAuth(rq2, res(), () => {});
  const r2 = res(); auth2.obtenerCarrito(rq2, r2);
  assert.equal(r2.body.items[0].nombre, 'Leche');
});

test('sanitizarCarrito limita la cantidad de productos y de unidades', () => {
  const muchos = Array.from({ length: 150 }, (_, i) => ({ id: 'i' + i, nombre: 'P', precio: 1, supermercado: 'Vea', cantidad: 500 }));
  const limpio = sanitizarCarrito(muchos);
  assert.equal(limpio.length, 100);
  assert.equal(limpio[0].cantidad, 99);
});
