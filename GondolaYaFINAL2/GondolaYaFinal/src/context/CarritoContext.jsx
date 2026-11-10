import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { apiGuardarCarrito, apiObtenerCarrito } from '../lib/api.js';
import {
  MAX_ITEMS,
  calcularTotales,
  compararCanasta,
  carritoReducer,
  itemDesdeProducto,
  normalizarItems,
} from './carritoReducer.js';
import { useAuth } from './AuthContext.jsx';

const CLAVE_INVITADO = 'gondolaya.carrito';
const CarritoContext = createContext(null);

function leerInvitado() {
  try { return normalizarItems(JSON.parse(localStorage.getItem(CLAVE_INVITADO))); } catch (_) { return []; }
}
function escribirInvitado(items) {
  try { localStorage.setItem(CLAVE_INVITADO, JSON.stringify(items)); } catch (_) { /* sin storage */ }
}
function borrarInvitado() {
  try { localStorage.removeItem(CLAVE_INVITADO); } catch (_) { /* sin storage */ }
}

/**
 * El provider se monta de nuevo cada vez que cambia el token (ver App.jsx), por eso `token`
 * es fijo durante su vida:
 *  - Invitado: el carrito vive en localStorage.
 *  - Con sesión: se trae el carrito de la cuenta, se le suma lo que se juntó como invitado
 *    y de ahí en adelante cada cambio se guarda en el servidor.
 */
export function CarritoProvider({ token, children }) {
  const { cerrarSesion } = useAuth();
  const [items, dispatch] = useReducer(carritoReducer, null, () => (token ? [] : leerInvitado()));
  const [sincronizado, setSincronizado] = useState(false);
  const [errorSync, setErrorSync] = useState(false);
  const pendiente = useRef(null); // cambios que todavía no llegaron al servidor

  useEffect(() => {
    if (!token) escribirInvitado(items);
  }, [token, items]);

  useEffect(() => {
    if (!token) return undefined;
    let cancelado = false;
    apiObtenerCarrito(token)
      .then(({ items: remotos }) => {
        if (cancelado) return;
        dispatch({ tipo: 'fusionar', items: [...normalizarItems(remotos), ...leerInvitado()] });
        borrarInvitado();
        setSincronizado(true);
      })
      .catch((e) => {
        if (cancelado) return;
        if (e.status === 401) cerrarSesion();
        else setErrorSync(true);
      });
    return () => { cancelado = true; };
  }, [token, cerrarSesion]);

  // Los cambios se guardan 0,5 s después del último (así varios clics seguidos son un solo pedido).
  useEffect(() => {
    if (!token || !sincronizado) return undefined;
    pendiente.current = items;
    const t = setTimeout(() => {
      apiGuardarCarrito(token, items)
        .then(() => { if (pendiente.current === items) pendiente.current = null; })
        .catch((e) => {
          if (e.status === 401) cerrarSesion();
          else console.warn('No se pudo guardar el carrito en la cuenta:', e.message);
        });
    }, 500);
    return () => clearTimeout(t);
  }, [items, token, sincronizado, cerrarSesion]);

  // Si se cierra o se oculta la pestaña (o se sale de la cuenta) con algo sin guardar, se guarda en el acto.
  useEffect(() => {
    if (!token || !sincronizado) return undefined;
    const volcar = () => {
      if (!pendiente.current) return;
      const itemsPendientes = pendiente.current;
      pendiente.current = null;
      apiGuardarCarrito(token, itemsPendientes, { keepalive: true }).catch(() => {});
    };
    const alCambiarVisibilidad = () => { if (document.visibilityState === 'hidden') volcar(); };
    window.addEventListener('pagehide', volcar);
    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    return () => {
      window.removeEventListener('pagehide', volcar);
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
      volcar();
    };
  }, [token, sincronizado]);

  const agregar = useCallback(
    (producto, contexto) => dispatch({ tipo: 'agregar', item: itemDesdeProducto(producto, contexto) }),
    [],
  );
  const cambiarTienda = useCallback((id, supermercado) => dispatch({ tipo: 'cambiarTienda', id, supermercado }), []);
  const actualizarItem = useCallback((id, item) => dispatch({ tipo: 'actualizar', id, item }), []);
  const reasignar = useCallback((tienda) => dispatch({ tipo: 'reasignar', tienda }), []);
  const quitar = useCallback((id) => dispatch({ tipo: 'quitar', id }), []);
  const cambiarCantidad = useCallback((id, delta) => dispatch({ tipo: 'cambiar', id, delta }), []);
  const vaciar = useCallback(() => dispatch({ tipo: 'vaciar' }), []);

  const value = useMemo(() => {
    const { cantidad, total, grupos } = calcularTotales(items);
    return {
      items,
      grupos,
      total,
      canasta: compararCanasta(items),
      cantidadTotal: cantidad,
      lleno: items.length >= MAX_ITEMS,
      errorSync,
      enCarrito: (id) => items.find((i) => i.id === id),
      agregar,
      quitar,
      cambiarCantidad,
      cambiarTienda,
      reasignar,
      actualizarItem,
      vaciar,
    };
  }, [items, errorSync, agregar, quitar, cambiarCantidad, cambiarTienda, reasignar, actualizarItem, vaciar]);

  return <CarritoContext.Provider value={value}>{children}</CarritoContext.Provider>;
}

export function useCarrito() {
  const ctx = useContext(CarritoContext);
  if (!ctx) throw new Error('useCarrito debe usarse dentro de <CarritoProvider>');
  return ctx;
}
