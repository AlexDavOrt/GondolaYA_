import { MAX_CANTIDAD } from '../context/carritoReducer.js';
import { IconoMas, IconoMenos } from './Iconos.jsx';

/** Selector de cantidad. Con 1 unidad el botón "−" saca el producto del carrito. */
export default function Cantidad({ valor, nombre, onMenos, onMas }) {
  return (
    <div className="qty" role="group" aria-label={`Cantidad de ${nombre}`}>
      <button
        type="button"
        className="qty__btn"
        onClick={onMenos}
        aria-label={valor <= 1 ? `Quitar ${nombre} del carrito` : 'Quitar una unidad'}
      >
        <IconoMenos />
      </button>
      <span className="qty__value" aria-live="polite">{valor}</span>
      <button
        type="button"
        className="qty__btn"
        onClick={onMas}
        disabled={valor >= MAX_CANTIDAD}
        aria-label="Agregar una unidad"
      >
        <IconoMas />
      </button>
    </div>
  );
}
