import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCarrito } from '../context/CarritoContext.jsx';
import { IconoCarrito } from './Iconos.jsx';

const ENLACES = [
  ['/#inicio', 'Inicio'],
  ['/#como-funciona', 'Cómo funciona'],
  ['/#supermercados', 'Supermercados'],
];

export default function Navbar() {
  const [abierto, setAbierto] = useState(false);
  const { usuario, cerrarSesion } = useAuth();
  const { cantidadTotal } = useCarrito();
  const { key } = useLocation();

  // El menú del celular se cierra solo al navegar.
  useEffect(() => setAbierto(false), [key]);

  const primerNombre = usuario ? usuario.nombre.split(' ')[0] : '';

  return (
    <header className="navbar">
      <div className="navbar__inner wrap">
        <input
          type="checkbox"
          id="navbar-toggle"
          className="navbar__toggle-input"
          checked={abierto}
          onChange={(e) => setAbierto(e.target.checked)}
        />

        <Link to="/" className="navbar__brand">
          <img className="navbar__brand-logo" src="/ass/logo.png" alt="GondolaYa" />
          <span className="navbar__brand-name">GondolaYa</span>
        </Link>

        <ul className="navbar__menu" id="navbar-menu">
          {ENLACES.map(([to, texto]) => (
            <li className="navbar__item" key={to}>
              <Link className="navbar__link" to={to}>{texto}</Link>
            </li>
          ))}
        </ul>

        <div className="navbar__actions">
          <Link
            to="/carrito"
            className="navbar__cart"
            aria-label={cantidadTotal > 0 ? `Carrito, ${cantidadTotal} productos` : 'Carrito vacío'}
          >
            <IconoCarrito />
            {cantidadTotal > 0 && <span className="navbar__cart-badge">{cantidadTotal > 99 ? '99+' : cantidadTotal}</span>}
          </Link>

          {usuario ? (
            <div className="navbar__user">
              <span className="navbar__user-name">Hola, {primerNombre}</span>
              <button type="button" className="btn btn--secondary navbar__session-btn" onClick={cerrarSesion}>
                Salir
              </button>
            </div>
          ) : (
            <Link className="btn btn--primary navbar__session-btn" to="/login">Ingresar</Link>
          )}

          <label htmlFor="navbar-toggle" className="navbar__toggle" aria-label="Abrir menú">
            <span className="navbar__toggle-bar" />
            <span className="navbar__toggle-bar" />
            <span className="navbar__toggle-bar" />
          </label>
        </div>
      </div>
    </header>
  );
}
