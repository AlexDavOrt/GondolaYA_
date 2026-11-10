import { Link } from 'react-router-dom';
import useTitulo from '../lib/useTitulo.js';

export default function Privacidad() {
  useTitulo('Privacidad — GondolaYa');
  return (
    <main className="doc">
      <div className="wrap doc__wrap">
        <p className="section-head__eyebrow">PRIVACIDAD</p>
        <h1 className="doc__title">Qué datos guardamos</h1>

        <h2>Si usás GondolaYa sin cuenta</h2>
        <p>
          Tu carrito se guarda solo en tu navegador (almacenamiento local). No lo enviamos a nuestro servidor
          hasta que ingreses a una cuenta.
        </p>

        <h2>Si creás una cuenta</h2>
        <ul>
          <li>Guardamos tu nombre, tu email y tu carrito.</li>
          <li>Tu contraseña no se guarda: guardamos solo una huella cifrada (scrypt) que sirve para verificarla.</li>
          <li>Al ingresar, tu navegador guarda un token de sesión que dura 7 días. Al tocar “Salir” se borra de tu navegador.</li>
        </ul>

        <h2>Tus búsquedas</h2>
        <p>
          El texto que buscás se envía a nuestro servidor para consultar las tiendas online. No lo asociamos a tu cuenta.
        </p>

        <h2>Terceros</h2>
        <ul>
          <li>Las tipografías se cargan desde Google Fonts.</li>
          <li>Las fotos de los productos se cargan desde los sitios de cada cadena.</li>
          <li>Los enlaces “Ver en el sitio” abren la tienda de cada cadena, que tiene sus propias políticas.</li>
          <li>No incluimos herramientas de analítica ni publicidad.</li>
        </ul>

        <h2>Consultas y eliminación de la cuenta</h2>
        <p>
          Si querés que eliminemos tu cuenta o tenés dudas, escribinos a{' '}
          <a href="mailto:gondolaya@gmail.com">gondolaya@gmail.com</a>.
        </p>

        <p className="doc__back"><Link to="/">← Volver al inicio</Link></p>
      </div>
    </main>
  );
}
