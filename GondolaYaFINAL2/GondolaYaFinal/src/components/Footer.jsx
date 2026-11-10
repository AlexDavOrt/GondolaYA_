import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer__grid">
          <div className="footer__brand">
            <div className="navbar__brand">
              <img className="navbar__brand-logo" src="/ass/logo.png" alt="GondolaYa" style={{ width: 32, height: 32 }} />
              <span className="navbar__brand-name footer__brand-name">GondolaYa</span>
            </div>
            <p className="footer__brand-text">Comparamos los precios de las tiendas online de los supermercados argentinos, para que vos elijas mejor.</p>
          </div>

          <div className="footer__col">
            <h5 className="footer__col-title">Navegación</h5>
            <ul className="footer__col-list">
              <li><Link className="footer__col-link" to="/#inicio">Inicio</Link></li>
              <li><Link className="footer__col-link" to="/#como-funciona">Cómo funciona</Link></li>
              <li><Link className="footer__col-link" to="/#supermercados">Supermercados</Link></li>
              <li><Link className="footer__col-link" to="/carrito">Mi carrito</Link></li>
            </ul>
          </div>

          <div className="footer__col">
            <h5 className="footer__col-title">Legal</h5>
            <ul className="footer__col-list">
              <li><Link className="footer__col-link" to="/fuentes">Fuentes de datos</Link></li>
              <li><Link className="footer__col-link" to="/privacidad">Privacidad</Link></li>
            </ul>
          </div>

          <div className="footer__col">
            <h5 className="footer__col-title">Contacto</h5>
            <ul className="footer__col-list">
              <li><a className="footer__col-link" href="mailto:gondolaya@gmail.com">gondolaya@gmail.com</a></li>
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <span>© 2026 GondolaYa. Hecho en Argentina 🇦🇷</span>
          <span>Precios de las tiendas online (VTEX)</span>
        </div>
      </div>
    </footer>
  );
}
