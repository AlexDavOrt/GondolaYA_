import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiLogin, apiPerfil, apiRegistro } from '../lib/api.js';

const CLAVE_TOKEN = 'gondolaya.token';
const CLAVE_USUARIO = 'gondolaya.usuario';

const AuthContext = createContext(null);

function leerStorage(clave) {
  try { return localStorage.getItem(clave); } catch (_) { return null; }
}
function escribirStorage(clave, valor) {
  try {
    if (valor === null) localStorage.removeItem(clave);
    else localStorage.setItem(clave, valor);
  } catch (_) { /* modo privado o storage bloqueado: la sesión dura solo mientras la pestaña esté abierta */ }
}
function leerUsuario() {
  try { return JSON.parse(leerStorage(CLAVE_USUARIO)); } catch (_) { return null; }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => leerStorage(CLAVE_TOKEN));
  const [usuario, setUsuario] = useState(() => (leerStorage(CLAVE_TOKEN) ? leerUsuario() : null));

  const guardarSesion = useCallback((data) => {
    escribirStorage(CLAVE_TOKEN, data.token);
    escribirStorage(CLAVE_USUARIO, JSON.stringify(data.usuario));
    setToken(data.token);
    setUsuario(data.usuario);
  }, []);

  const cerrarSesion = useCallback(() => {
    escribirStorage(CLAVE_TOKEN, null);
    escribirStorage(CLAVE_USUARIO, null);
    setToken(null);
    setUsuario(null);
  }, []);

  // Al abrir la página con una sesión guardada, se confirma con el servidor que siga vigente.
  useEffect(() => {
    if (!token) return undefined;
    let cancelado = false;
    apiPerfil(token)
      .then((data) => {
        if (cancelado) return;
        setUsuario(data.usuario);
        escribirStorage(CLAVE_USUARIO, JSON.stringify(data.usuario));
      })
      .catch((e) => {
        if (!cancelado && e.status === 401) cerrarSesion();
      });
    return () => { cancelado = true; };
  }, [token, cerrarSesion]);

  const iniciarSesion = useCallback(async (email, password) => {
    const data = await apiLogin({ email, password });
    guardarSesion(data);
    return data.usuario;
  }, [guardarSesion]);

  const registrarse = useCallback(async (nombre, email, password) => {
    const data = await apiRegistro({ nombre, email, password });
    guardarSesion(data);
    return data.usuario;
  }, [guardarSesion]);

  const value = useMemo(
    () => ({ token, usuario, iniciarSesion, registrarse, cerrarSesion }),
    [token, usuario, iniciarSesion, registrarse, cerrarSesion],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
