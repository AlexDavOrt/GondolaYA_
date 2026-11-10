import { useCarrito } from '../context/CarritoContext.jsx';
import { idProducto } from '../context/carritoReducer.js';
import { precioTexto, precioUnitarioTexto, rutaLogo } from '../lib/formato.js';
import Cantidad from './Cantidad.jsx';
import { IconoCarrito, IconoExterno } from './Iconos.jsx';

/** Una fila por cadena: precio, precio por unidad y botón de carrito. */
function FilaOferta({ oferta, grupo, esMasBarato, hayVarias }) {
  const { enCarrito, agregar, cambiarCantidad, lleno } = useCarrito();
  const id = idProducto(oferta);
  const item = enCarrito(id);

  return (
    <li className={'offer' + (esMasBarato && hayVarias ? ' offer--best' : '')}>
      <div className="offer__store">
        <img src={rutaLogo(oferta.logo)} alt="" />
        <div className="offer__store-text">
          <span className="offer__store-name">{oferta.supermercado}</span>
          {esMasBarato && hayVarias && <span className="offer__tag">Más barato</span>}
        </div>
      </div>

      <div className="offer__price">
        <span className="offer__price-value">{precioTexto(oferta.precio)}</span>
        {oferta.precioUnitario != null && (
          <span className="offer__unit">{precioUnitarioTexto(oferta.precioUnitario, grupo.unidad)}</span>
        )}
      </div>

      <div className="offer__actions">
        {item ? (
          <Cantidad
            valor={item.cantidad}
            nombre={oferta.nombre}
            onMenos={() => cambiarCantidad(id, -1)}
            onMas={() => cambiarCantidad(id, 1)}
          />
        ) : (
          <button
            type="button"
            className="btn btn--primary btn--small"
            onClick={() => agregar(oferta, { medida: grupo.medida, ofertas: grupo.ofertas })}
            disabled={lleno}
            title={lleno ? 'El carrito llegó al máximo de productos' : undefined}
          >
            <IconoCarrito />
            Agregar
          </button>
        )}
        {oferta.url && (
          // Solo informativo: la persona decide si quiere abrirlo; nunca se redirige sola.
          <a className="result-card__link" href={oferta.url} target="_blank" rel="noopener noreferrer">
            Ver en el sitio <IconoExterno width={12} height={12} />
          </a>
        )}
      </div>
    </li>
  );
}

export default function GrupoCard({ grupo }) {
  const hayVarias = grupo.ofertas.length > 1;
  const barata = grupo.ofertas[0];

  return (
    <li className="group-card">
      <div className="group-card__top">
        <div className="result-card__image">
          {grupo.imagen ? (
            <img src={grupo.imagen} alt={grupo.nombre} loading="lazy" referrerPolicy="no-referrer" />
          ) : (
            <span className="result-card__no-image">Sin imagen</span>
          )}
        </div>

        <div className="group-card__info">
          {hayVarias && grupo.ahorro > 0 && (
            <span className="result-card__badge">
              Ahorrás {precioTexto(grupo.ahorro)} ({grupo.ahorroPct}%) en {barata.supermercado}
            </span>
          )}
          <h2 className="result-card__name">{grupo.nombre}</h2>
          <p className="result-card__brand group-card__meta">
            {grupo.marca && <span>{grupo.marca}</span>}
            {grupo.medida && <span className="chip">{grupo.medida}</span>}
          </p>
          {!hayVarias && (
            <p className="group-card__solo">Solo lo encontramos en {barata.supermercado}</p>
          )}
        </div>
      </div>

      <ul className="offers" aria-label={`Precios de ${grupo.nombre}`}>
        {grupo.ofertas.map((o) => (
          <FilaOferta
            key={`${o.supermercado}-${o.url || o.nombre}`}
            oferta={o}
            grupo={grupo}
            esMasBarato={o.precio === grupo.precioMin}
            hayVarias={hayVarias && grupo.ahorro > 0}
          />
        ))}
      </ul>
    </li>
  );
}
