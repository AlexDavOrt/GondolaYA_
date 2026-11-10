import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import Campo from '../components/Campo.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useTitulo from '../lib/useTitulo.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const INICIAL = { nombre: '', email: '', password: '', confirmar: '' };

function validar(modo, v) {
  const e = {};
  if (modo === 'registro' && v.nombre.trim().length < 2) e.nombre = 'Ingresá tu nombre (mínimo 2 caracteres)';
  if (!EMAIL_RE.test(v.email.trim())) e.email = 'Ingresá un email válido';
  if (modo === 'registro') {
    if (v.password.length < 8) e.password = 'La contraseña debe tener al menos 8 caracteres';
    if (v.confirmar !== v.password) e.confirmar = 'Las contraseñas no coinciden';
  } else if (!v.password) {
    e.password = 'Ingresá tu contraseña';
  }
  return e;
}

export default function Login({ modo = 'ingresar' }) {
  const esRegistro = modo === 'registro';
  useTitulo(esRegistro ? 'Crear cuenta — GondolaYa' : 'Ingresar — GondolaYa');

  const { usuario, iniciarSesion, registrarse } = useAuth();
  const location = useLocation();
  const destino = (location.state && location.state.desde) || '/';

  const [valores, setValores] = useState(INICIAL);
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // Si ya hay sesión (o se acaba de iniciar), se redirige solo.
  if (usuario) return <Navigate to={destino} replace />;

  const cambiar = (campo) => (e) => {
    setValores((v) => ({ ...v, [campo]: e.target.value }));
    setErrores((er) => ({ ...er, [campo]: undefined }));
    setErrorGeneral('');
  };

  async function enviar(e) {
    e.preventDefault();
    const errs = validar(modo, valores);
    setErrores(errs);
    if (Object.keys(errs).length > 0) return;

    setEnviando(true);
    setErrorGeneral('');
    try {
      if (esRegistro) await registrarse(valores.nombre.trim(), valores.email.trim(), valores.password);
      else await iniciarSesion(valores.email.trim(), valores.password);
    } catch (err) {
      if (err.campo) setErrores({ [err.campo]: err.message });
      else setErrorGeneral(err.message);
      setEnviando(false);
    }
  }

  return (
    <main className="auth">
      <div className="wrap">
        <div className="auth__card">
          <div className="auth__tabs" role="tablist">
            <Link to="/login" state={location.state} className={'auth__tab' + (!esRegistro ? ' auth__tab--active' : '')} role="tab" aria-selected={!esRegistro}>Ingresar</Link>
            <Link to="/registro" state={location.state} className={'auth__tab' + (esRegistro ? ' auth__tab--active' : '')} role="tab" aria-selected={esRegistro}>Crear cuenta</Link>
          </div>

          <h1 className="auth__title">{esRegistro ? 'Creá tu cuenta' : 'Bienvenido de nuevo'}</h1>
          <p className="auth__lede">
            {esRegistro
              ? 'Guardá tu carrito y encontralo desde cualquier dispositivo.'
              : 'Ingresá para recuperar tu carrito de compras.'}
          </p>

          <form key={modo} onSubmit={enviar} noValidate>
            {esRegistro && (
              <Campo id="auth-nombre" label="Nombre" name="nombre" type="text" autoComplete="name" placeholder="Tu nombre"
                value={valores.nombre} onChange={cambiar('nombre')} error={errores.nombre} />
            )}
            <Campo id="auth-email" label="Email" name="email" type="email" autoComplete="email" placeholder="tu@email.com"
              value={valores.email} onChange={cambiar('email')} error={errores.email} />
            <Campo id="auth-password" label="Contraseña" name="password" type={verPassword ? 'text' : 'password'}
              autoComplete={esRegistro ? 'new-password' : 'current-password'}
              placeholder={esRegistro ? 'Mínimo 8 caracteres' : 'Tu contraseña'}
              value={valores.password} onChange={cambiar('password')} error={errores.password} />
            {esRegistro && (
              <Campo id="auth-confirmar" label="Repetí la contraseña" name="confirmar" type={verPassword ? 'text' : 'password'}
                autoComplete="new-password" placeholder="Repetí tu contraseña"
                value={valores.confirmar} onChange={cambiar('confirmar')} error={errores.confirmar} />
            )}

            <label className="auth__show">
              <input type="checkbox" checked={verPassword} onChange={(e) => setVerPassword(e.target.checked)} />
              Mostrar contraseña
            </label>

            {errorGeneral && <div className="auth__error" role="alert">{errorGeneral}</div>}

            <button type="submit" className="btn btn--primary contact__submit" disabled={enviando}>
              {enviando ? 'Un momento…' : esRegistro ? 'Crear cuenta' : 'Ingresar'}
            </button>
          </form>

          <p className="auth__switch">
            {esRegistro ? (
              <>¿Ya tenés cuenta? <Link to="/login" state={location.state}>Ingresá</Link></>
            ) : (
              <>¿Todavía no tenés cuenta? <Link to="/registro" state={location.state}>Creá una gratis</Link></>
            )}
          </p>
        </div>
      </div>
    </main>
  );
}
