/**
 * Llamadas al servidor. En desarrollo Vite redirige /api a Express (ver vite.config.mjs);
 * en producción lo sirve el mismo Express. Si el front vive en otro dominio, definir VITE_API_URL.
 */
const BASE = (import.meta.env && import.meta.env.VITE_API_URL) || '';

const MSG_SIN_CONEXION =
  'No pudimos conectar con el servidor. Verificá que esté corriendo (npm run dev) y probá de nuevo.';

async function pedir(ruta, { method = 'GET', body, token, signal, keepalive } = {}) {
  let res;
  try {
    res = await fetch(BASE + ruta, {
      method,
      signal,
      keepalive,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    if (e && e.name === 'AbortError') throw e;
    const err = new Error(MSG_SIN_CONEXION);
    err.sinConexion = true;
    throw err;
  }

  // Si no es JSON, no es nuestro servidor (por ejemplo un 404 en HTML).
  if (!(res.headers.get('content-type') || '').includes('application/json')) {
    const err = new Error(MSG_SIN_CONEXION);
    err.sinConexion = true;
    throw err;
  }

  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || `Error ${res.status}`);
    err.status = res.status;
    err.campo = data.campo;
    err.delServidor = true;
    throw err;
  }
  return data;
}

export const buscarProductos = (termino, signal) =>
  pedir(`/api/buscar?producto=${encodeURIComponent(termino)}`, { signal });

export const apiRegistro = (datos) => pedir('/api/auth/registro', { method: 'POST', body: datos });
export const apiLogin = (datos) => pedir('/api/auth/login', { method: 'POST', body: datos });
export const apiPerfil = (token) => pedir('/api/auth/me', { token });
export const apiObtenerCarrito = (token) => pedir('/api/carrito', { token });
export const apiGuardarCarrito = (token, items, opciones = {}) =>
  pedir('/api/carrito', { method: 'PUT', token, body: { items }, ...opciones });
