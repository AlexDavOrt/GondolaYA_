import { Link } from 'react-router-dom';
import useTitulo from '../lib/useTitulo.js';

export default function NotFound() {
  useTitulo('Página no encontrada — GondolaYa');
  return (
    <main className="results">
      <div className="wrap">
        <div className="results__empty">
          <h1 className="results__empty-title">No encontramos esa página</h1>
          <p className="results__empty-text">Puede que el enlace esté mal escrito o que la página ya no exista.</p>
          <Link className="btn btn--primary" to="/">Volver al inicio</Link>
        </div>
      </div>
    </main>
  );
}
