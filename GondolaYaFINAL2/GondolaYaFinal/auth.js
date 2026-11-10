'use strict';

/**
 * Cuentas de usuario de GondolaYa (sin dependencias extra, solo el módulo "crypto" de Node).
 *  - Contraseñas: se guardan con scrypt + sal aleatoria (nunca en texto plano).
 *  - Sesión: token firmado con HMAC-SHA256 que vence a los 7 días.
 *  - Datos: datos/usuarios.json (proyecto académico; para producción conviene una base real).
 *  - Carrito: se guarda dentro del usuario, así lo ve desde cualquier dispositivo.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);

const DURACION_TOKEN_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ITEMS_CARRITO = 100;
const MAX_CANTIDAD = 99;
const MAX_INTENTOS = 5;
const VENTANA_INTENTOS_MS = 15 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Solo se aceptan URLs http(s); cualquier otra cosa (javascript:, data:, etc.) se descarta. */
function soloHttp(url) {
  if (typeof url !== 'string') return null;
  const limpia = url.trim();
  return limpia.length <= 2000 && /^https?:\/\//i.test(limpia) ? limpia : null;
}

const texto = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Ofertas del mismo producto en otras cadenas (sirven para comparar la canasta completa). */
function sanitizarOfertas(lista) {
  if (!Array.isArray(lista)) return [];
  const vistas = new Set();
  const limpia = [];
  for (const o of lista) {
    if (limpia.length >= 8) break;
    if (!o || typeof o !== 'object') continue;
    const supermercado = texto(o.supermercado, 40);
    const nombre = texto(o.nombre, 200);
    const precio = Number(o.precio);
    if (!supermercado || !nombre || vistas.has(supermercado)) continue;
    if (!Number.isFinite(precio) || precio <= 0 || precio > 1e9) continue;
    vistas.add(supermercado);
    limpia.push({
      supermercado,
      nombre,
      precio: Math.round(precio * 100) / 100,
      logo: typeof o.logo === 'string' && /^\/?ass\/[\w-]+\.png$/.test(o.logo) ? o.logo : null,
      imagen: soloHttp(o.imagen),
      url: soloHttp(o.url),
    });
  }
  return limpia;
}

/** Deja el carrito que manda el navegador en un formato seguro y acotado. */
function sanitizarCarrito(items) {
  if (!Array.isArray(items)) return [];
  const vistos = new Set();
  const limpio = [];
  for (const it of items) {
    if (limpio.length >= MAX_ITEMS_CARRITO) break;
    if (!it || typeof it !== 'object') continue;
    const id = texto(it.id, 300);
    const nombre = texto(it.nombre, 200);
    const supermercado = texto(it.supermercado, 40);
    const precio = Number(it.precio);
    if (!id || !nombre || !supermercado || vistos.has(id)) continue;
    if (!Number.isFinite(precio) || precio <= 0 || precio > 1e9) continue;
    vistos.add(id);
    limpio.push({
      id,
      nombre,
      marca: texto(it.marca, 100),
      precio: Math.round(precio * 100) / 100,
      supermercado,
      logo: typeof it.logo === 'string' && /^\/?ass\/[\w-]+\.png$/.test(it.logo) ? it.logo : null,
      imagen: soloHttp(it.imagen),
      url: soloHttp(it.url),
      cantidad: Math.max(1, Math.min(MAX_CANTIDAD, Math.floor(Number(it.cantidad)) || 1)),
      ean: texto(it.ean, 30) || null,
      medida: texto(it.medida, 30),
      ts: Number.isFinite(Number(it.ts)) && Number(it.ts) > 0 ? Math.floor(Number(it.ts)) : 0,
      ofertas: sanitizarOfertas(it.ofertas),
    });
  }
  return limpio;
}

function secretoPersistente(archivo) {
  try {
    const existente = fs.readFileSync(archivo, 'utf8').trim();
    if (existente.length >= 32) return existente;
  } catch (_) { /* no existe todavía */ }
  const nuevo = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(archivo, nuevo, { mode: 0o600 });
  return nuevo;
}

function leerUsuarios(archivo) {
  try {
    const data = JSON.parse(fs.readFileSync(archivo, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

async function hashearPassword(password) {
  const sal = crypto.randomBytes(16);
  const clave = await scrypt(password, sal, 64);
  return `${sal.toString('hex')}:${clave.toString('hex')}`;
}

async function verificarPassword(password, almacenado) {
  const [salHex, claveHex] = String(almacenado).split(':');
  if (!salHex || !claveHex) return false;
  const esperado = Buffer.from(claveHex, 'hex');
  const calculado = await scrypt(password, Buffer.from(salHex, 'hex'), esperado.length);
  return crypto.timingSafeEqual(calculado, esperado);
}

const normalizarEmail = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : '');

function crearAuth({ dir = path.join(__dirname, 'datos'), secreto } = {}) {
  fs.mkdirSync(dir, { recursive: true });
  const archivo = path.join(dir, 'usuarios.json');
  const clave = secreto || process.env.GONDOLAYA_SECRET || secretoPersistente(path.join(dir, '.secret'));
  const usuarios = leerUsuarios(archivo);
  const intentos = new Map();

  // Hash "de mentira" para que responder a un email inexistente tarde lo mismo que a uno real.
  const SAL_FALSA = crypto.randomBytes(16);
  const ALMACENADO_FALSO = `${SAL_FALSA.toString('hex')}:${crypto.scryptSync('falso', SAL_FALSA, 64).toString('hex')}`;

  function guardar() {
    const tmp = `${archivo}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(usuarios, null, 2));
    fs.renameSync(tmp, archivo);
  }

  /* ---------- token ---------- */
  function firmarCuerpo(cuerpo) {
    return crypto.createHmac('sha256', clave).update(cuerpo).digest('base64url');
  }
  function firmar(payload) {
    const cuerpo = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${cuerpo}.${firmarCuerpo(cuerpo)}`;
  }
  function leerToken(token) {
    try {
      if (typeof token !== 'string') return null;
      const partes = token.split('.');
      if (partes.length !== 2) return null;
      const esperada = Buffer.from(firmarCuerpo(partes[0]));
      const recibida = Buffer.from(partes[1]);
      if (esperada.length !== recibida.length || !crypto.timingSafeEqual(esperada, recibida)) return null;
      const payload = JSON.parse(Buffer.from(partes[0], 'base64url').toString('utf8'));
      return payload && payload.exp > Date.now() ? payload : null;
    } catch (_) {
      return null;
    }
  }

  /* ---------- límite de intentos de login ---------- */
  function bloqueado(k) {
    const r = intentos.get(k);
    if (!r) return false;
    if (Date.now() - r.desde > VENTANA_INTENTOS_MS) { intentos.delete(k); return false; }
    return r.n >= MAX_INTENTOS;
  }
  function registrarFallo(k) {
    if (intentos.size > 5000) intentos.clear();
    const r = intentos.get(k);
    if (!r || Date.now() - r.desde > VENTANA_INTENTOS_MS) intentos.set(k, { n: 1, desde: Date.now() });
    else r.n += 1;
  }

  const publico = (u) => ({ id: u.id, nombre: u.nombre, email: u.email });
  const sesion = (u) => ({ token: firmar({ sub: u.id, exp: Date.now() + DURACION_TOKEN_MS }), usuario: publico(u) });
  const ipDe = (req) => req.ip || (req.socket && req.socket.remoteAddress) || 'desconocida';
  const falla = (res, status, error, campo) => res.status(status).json(campo ? { error, campo } : { error });
  const errorInterno = (res, err) => {
    console.error(err);
    return falla(res, 500, 'Ocurrió un error. Probá de nuevo en un momento.');
  };

  /* ---------- handlers ---------- */
  async function registro(req, res) {
    try {
      const body = req.body || {};
      const nombre = texto(body.nombre, 200).replace(/\s+/g, ' ');
      const email = normalizarEmail(body.email);
      const password = body.password;

      if (nombre.length < 2 || nombre.length > 60) return falla(res, 400, 'Ingresá tu nombre (entre 2 y 60 caracteres).', 'nombre');
      if (!email || email.length > 120 || !EMAIL_RE.test(email)) return falla(res, 400, 'Ingresá un email válido.', 'email');
      if (typeof password !== 'string' || password.length < 8 || password.length > 100) {
        return falla(res, 400, 'La contraseña debe tener entre 8 y 100 caracteres.', 'password');
      }
      if (usuarios.some((u) => u.email === email)) return falla(res, 409, 'Ya existe una cuenta con ese email.', 'email');

      const hash = await hashearPassword(password);
      // Se vuelve a chequear después del await: dos registros simultáneos no pueden duplicar el email.
      if (usuarios.some((u) => u.email === email)) return falla(res, 409, 'Ya existe una cuenta con ese email.', 'email');

      const usuario = { id: crypto.randomUUID(), nombre, email, hash, creado: new Date().toISOString(), carrito: [] };
      usuarios.push(usuario);
      guardar();
      return res.status(201).json(sesion(usuario));
    } catch (err) {
      return errorInterno(res, err);
    }
  }

  async function login(req, res) {
    try {
      const body = req.body || {};
      const email = normalizarEmail(body.email);
      const password = body.password;
      if (!email || typeof password !== 'string' || !password) return falla(res, 400, 'Ingresá tu email y tu contraseña.');

      const k = `${ipDe(req)}|${email}`;
      if (bloqueado(k)) return falla(res, 429, 'Demasiados intentos fallidos. Probá de nuevo en unos minutos.');

      const usuario = usuarios.find((u) => u.email === email);
      let ok = false;
      if (password.length <= 100) {
        ok = usuario
          ? await verificarPassword(password, usuario.hash)
          : (await verificarPassword(password, ALMACENADO_FALSO), false);
      }
      if (!ok) {
        registrarFallo(k);
        return falla(res, 401, 'Email o contraseña incorrectos.');
      }
      intentos.delete(k);
      return res.json(sesion(usuario));
    } catch (err) {
      return errorInterno(res, err);
    }
  }

  function requiereAuth(req, res, next) {
    const cabecera = String(req.headers.authorization || '');
    const token = cabecera.startsWith('Bearer ') ? cabecera.slice(7).trim() : '';
    const payload = leerToken(token);
    const usuario = payload && usuarios.find((u) => u.id === payload.sub);
    if (!usuario) return falla(res, 401, 'Tu sesión venció. Volvé a ingresar.');
    req.usuario = usuario;
    return next();
  }

  const me = (req, res) => res.json({ usuario: publico(req.usuario) });
  const obtenerCarrito = (req, res) => res.json({ items: sanitizarCarrito(req.usuario.carrito) });

  function guardarCarrito(req, res) {
    try {
      const items = sanitizarCarrito((req.body || {}).items);
      req.usuario.carrito = items;
      guardar();
      return res.json({ items });
    } catch (err) {
      return errorInterno(res, err);
    }
  }

  return { registro, login, requiereAuth, me, obtenerCarrito, guardarCarrito, firmar, leerToken };
}

module.exports = { crearAuth, sanitizarCarrito };
