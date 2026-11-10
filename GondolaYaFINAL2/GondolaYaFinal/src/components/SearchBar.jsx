import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { limpiarTermino } from '../lib/formato.js';
import { IconoBuscar, IconoFlecha } from './Iconos.jsx';

const SUGERENCIAS = [
  ['Leche', 'Lácteos'], ['Queso cremoso', 'Lácteos'], ['Arroz', 'Almacén'], ['Fideos', 'Almacén'],
  ['Yerba mate', 'Almacén'], ['Aceite de girasol', 'Almacén'], ['Café', 'Almacén'], ['Gaseosa', 'Bebidas'],
  ['Agua mineral', 'Bebidas'], ['Detergente', 'Limpieza'], ['Lavandina', 'Limpieza'], ['Hamburguesas', 'Congelados'],
];

const normalizar = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function SearchBar({ className = '', valorInicial = '' }) {
  const navigate = useNavigate();
  const [valor, setValor] = useState(valorInicial);
  const [enfocado, setEnfocado] = useState(false);

  useEffect(() => setValor(valorInicial), [valorInicial]);

  const sugerencias = useMemo(() => {
    const q = normalizar(valor.trim());
    return SUGERENCIAS.filter(([nombre]) => !q || normalizar(nombre).includes(q)).slice(0, 5);
  }, [valor]);

  function buscar(texto) {
    const termino = limpiarTermino(texto);
    if (termino.length < 2) return;
    setEnfocado(false);
    navigate(`/resultados?producto=${encodeURIComponent(termino)}`);
  }

  return (
    <div className={`hero__search ${className}`.trim()}>
      <form
        className={'hero__search-bar' + (enfocado ? ' hero__search-bar--focused' : '')}
        role="search"
        onSubmit={(e) => { e.preventDefault(); buscar(valor); }}
      >
        <IconoBuscar className="hero__search-icon" />
        <input
          className="hero__search-input"
          type="text"
          name="producto"
          required
          minLength={2}
          maxLength={80}
          aria-label="Producto a buscar"
          placeholder="Buscá un producto... Ej: leche, arroz, fideos"
          autoComplete="off"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onFocus={() => setEnfocado(true)}
          onBlur={() => setEnfocado(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') e.currentTarget.blur(); }}
        />
        <button className="btn btn--primary hero__search-button" type="submit">
          Buscar ahora
          <IconoFlecha width={15} height={15} />
        </button>
      </form>

      <div className={'hero__search-suggestions' + (enfocado && sugerencias.length ? ' hero__search-suggestions--open' : '')}>
        {sugerencias.map(([nombre, categoria]) => (
          <button
            key={nombre}
            type="button"
            className="hero__suggestion"
            // mouseDown + preventDefault: el clic funciona antes de que el input pierda el foco
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { setValor(nombre); buscar(nombre); }}
          >
            <span>{nombre}</span>
            <span className="hero__suggestion-tag">{categoria}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
