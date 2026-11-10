'use strict';

/**
 * Servidor de GondolaYa.
 *  - Sirve el front en React ya compilado (carpeta dist/, se genera con `npm run build`).
 *  - POST /api/auth/registro, POST /api/auth/login, GET /api/auth/me  ->  cuentas de usuario (ver auth.js).
 *  - GET/PUT /api/carrito  ->  carrito guardado en la cuenta (requiere sesión).
 *  - GET /api/buscar?producto=leche  ->  consulta el catálogo público de VTEX de cada cadena
 *    (Carrefour, Día, Jumbo, Disco, Vea), detecta la medida de cada producto (para el precio por
 *    litro / kg / unidad) y agrupa el mismo producto (mismo código de barras) entre cadenas.
 *
 * La consulta se hace desde acá (servidor) y no desde el navegador para evitar problemas de CORS.
 * La API de VTEX no requiere API key. Requiere Node 18+ (usa fetch global).
 */

const path = require('path');
const express = require('express');
const cors = require('cors');
const { crearAuth } = require('./auth');
const { SUPERMERCADOS, convertir, agruparOfertas } = require('./lib/catalogo');
const { crearLimitador } = require('./lib/limitador');

const PORT = process.env.PORT || 3001;
const TIMEOUT_MS = 8000;
const MAX_POR_SUPERMERCADO = 24;          // VTEX permite hasta 50 por consulta; más resultados = más productos en común entre cadenas
const CACHE_MS = 10 * 60 * 1000;          // 10 minutos
const USER_AGENT = process.env.GONDOLAYA_USER_AGENT
  || 'Mozilla/5.0 (compatible; GondolaYa/1.0; proyecto-academico)';

/* ------------------------------------------------------------------ */
/*  Consulta a VTEX                                                     */
/* ------------------------------------------------------------------ */

async function pedirVtex(base, texto, conCanalVentas) {
  const url = `${base}/api/catalog_system/pub/products/search`
    + `?ft=${encodeURIComponent(texto)}&_from=0&_to=${MAX_POR_SUPERMERCADO - 1}`
    + (conCanalVentas ? '&sc=1' : '');

  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  // VTEX responde 200 o 206 (contenido parcial) cuando la búsqueda anduvo bien.
  if (res.status !== 200 && res.status !== 206) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function hayAlgunaOferta(productos) {
  return productos.some((p) => (p.items || []).some((i) => Array.isArray(i.sellers) && i.sellers.length > 0));
}

async function buscarEnSupermercado(clave, texto) {
  const { base } = SUPERMERCADOS[clave];
  let productos = await pedirVtex(base, texto, false);

  // Algunas tiendas (se vio en Carrefour) a veces responden 200 pero sin "sellers", es decir,
  // sin precios. Reintentar con el canal de ventas sc=1 lo resuelve.
  if (productos.length > 0 && !hayAlgunaOferta(productos)) {
    productos = await pedirVtex(base, texto, true);
  }
  return convertir(clave, productos);
}

/* ------------------------------------------------------------------ */
/*  Búsqueda en todas las cadenas (en paralelo) + caché                */
/* ------------------------------------------------------------------ */

const cache = new Map();

async function buscar(termino) {
  const clave = termino.toLowerCase();
  const guardado = cache.get(clave);
  if (guardado && Date.now() - guardado.creado < CACHE_MS) return guardado.resultado;

  const claves = Object.keys(SUPERMERCADOS);
  const respuestas = await Promise.allSettled(claves.map((c) => buscarEnSupermercado(c, termino)));

  const productos = [];
  const consultados = [];
  const fallidos = [];
  respuestas.forEach((r, i) => {
    const nombre = SUPERMERCADOS[claves[i]].nombre;
    if (r.status === 'fulfilled') {
      productos.push(...r.value);
      consultados.push(nombre);
    } else {
      console.warn(`No se pudo consultar ${nombre} para "${termino}": ${r.reason && r.reason.message}`);
      fallidos.push(nombre);
    }
  });

  // El mismo producto (mismo código de barras) de distintas cadenas queda en un solo grupo.
  const grupos = agruparOfertas(productos);
  const resultado = {
    producto: termino,
    total: productos.length,          // ofertas encontradas
    totalGrupos: grupos.length,       // productos distintos
    consultados,
    fallidos,
    grupos,
  };

  // Solo se cachean búsquedas completas (sin supermercados caídos).
  if (fallidos.length === 0) {
    if (cache.size >= 200) cache.clear();
    cache.set(clave, { creado: Date.now(), resultado });
  }
  return resultado;
}

/* ------------------------------------------------------------------ */
/*  Servidor                                                            */
/* ------------------------------------------------------------------ */

const DIST = path.join(__dirname, 'dist');

function crearApp({ auth = crearAuth() } = {}) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '200kb' }));

  app.get('/api/buscar', crearLimitador({ max: 40, ventanaMs: 60 * 1000 }), async (req, res) => {
    const termino = String(req.query.producto ?? '').trim().replace(/\s+/g, ' ').slice(0, 80);
    if (termino.length < 2) {
      return res.status(400).json({ error: 'Escribí al menos 2 caracteres para buscar un producto.' });
    }
    try {
      res.json(await buscar(termino));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Ocurrió un error al consultar los precios.' });
    }
  });

  app.post('/api/auth/registro', auth.registro);
  app.post('/api/auth/login', auth.login);
  app.get('/api/auth/me', auth.requiereAuth, auth.me);
  app.get('/api/carrito', auth.requiereAuth, auth.obtenerCarrito);
  app.put('/api/carrito', auth.requiereAuth, auth.guardarCarrito);

  app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta de la API inexistente.' }));

  // Front compilado (solo se publica dist/, nunca datos/, auth.js, package.json, etc.).
  app.use(express.static(DIST));
  // React Router maneja las rutas del lado del navegador: cualquier GET devuelve index.html.
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    res.sendFile(path.join(DIST, 'index.html'), (err) => {
      if (err) res.status(404).type('text').send('Falta compilar el front: ejecutá "npm run build" (o usá "npm run dev" para desarrollar).');
    });
  });

  // Errores (por ejemplo un JSON mal formado) siempre en formato JSON.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status && err.status < 500 ? err.status : 500;
    res.status(status).json({ error: status === 500 ? 'Error interno del servidor.' : 'Solicitud inválida.' });
  });

  return app;
}

const app = crearApp();

if (require.main === module) {
  app.listen(PORT, () => console.log(`GondolaYa corriendo en http://localhost:${PORT}`));
}

module.exports = { app, crearApp, convertir, buscar };
