import { useState } from 'react';
import { Link } from 'react-router-dom';
import Cantidad from '../components/Cantidad.jsx';
import { IconoBasura, IconoCarrito, IconoCheck, IconoCopiar, IconoExterno } from '../components/Iconos.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCarrito } from '../context/CarritoContext.jsx';
import { ahorroPosible, itemActualizado } from '../context/carritoReducer.js';
import { buscarProductos } from '../lib/api.js';
import { haceCuanto, limpiarTermino, precioTexto, rutaLogo } from '../lib/formato.js';
import useTitulo from '../lib/useTitulo.js';

function armarLista(grupos, total) {
  const lineas = ['Mi lista de GondolaYa', ''];
  for (const g of grupos) {
    lineas.push(`${g.supermercado} — subtotal ${precioTexto(g.subtotal)}`);
    for (const it of g.items) {
      const link = it.url ? ` — ${it.url}` : '';
      lineas.push(`- ${it.cantidad} x ${it.nombre} (${precioTexto(it.precio)} c/u)${link}`);
    }
    lineas.push('');
  }
  lineas.push(`Total: ${precioTexto(total)}`);
  return lineas.join('\n');
}

const UN_DIA = 24 * 60 * 60 * 1000;

/** Cuánto costaría toda la compra en cada cadena, y cuánto se ahorra eligiendo bien. */
function ComparadorCanasta({ canasta, total, reasignar }) {
  const completas = canasta.porTienda.filter((t) => t.completa);
  const parciales = canasta.porTienda.filter((t) => !t.completa);
  const masBarata = completas[0];
  const masCara = completas[completas.length - 1];
  const ahorroMezcla = Math.round((total - canasta.mejorMezcla) * 100) / 100;
  const hayMezclaMejor = ahorroMezcla > 0.009;

  return (
    <section className="basket" aria-label="Comparar la compra completa entre supermercados">
      <h2 className="basket__title">¿Dónde conviene comprar todo?</h2>
      <p className="basket__lede">
        Sumamos tu lista completa en cada cadena, con el precio que vimos al agregar cada producto.
      </p>

      {completas.length > 0 ? (
        <ol className="basket__list">
          {completas.map((t, i) => {
            const diferencia = Math.round((t.total - masBarata.total) * 100) / 100;
            return (
              <li key={t.supermercado} className={'basket__row' + (i === 0 ? ' basket__row--best' : '')}>
                {t.logo && <img src={rutaLogo(t.logo)} alt="" />}
                <div className="basket__row-text">
                  <span className="basket__store">{t.supermercado}</span>
                  <span className="basket__status">
                    {i === 0 ? 'La opción más barata con todo' : `${precioTexto(diferencia)} más que ${masBarata.supermercado}`}
                  </span>
                </div>
                <strong className="basket__total">{precioTexto(t.total)}</strong>
                <button type="button" className="btn btn--secondary btn--small" onClick={() => reasignar(t.supermercado)}>
                  Pasar todo acá
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="basket__empty">
          Ninguna cadena tiene todos los productos de tu lista, así que no se puede armar la compra completa en un solo lugar.
        </p>
      )}

      {parciales.length > 0 && (
        <ul className="basket__partial">
          {parciales.map((t) => (
            <li key={t.supermercado} title={`Le faltan: ${t.faltan.join(', ')}`}>
              {t.supermercado}: le {t.faltan.length === 1 ? 'falta 1 producto' : `faltan ${t.faltan.length} productos`}
            </li>
          ))}
        </ul>
      )}

      {completas.length > 1 && masCara.total > masBarata.total && (
        <p className="basket__saving">
          <IconoCheck width={16} height={16} />
          Comprando todo en {masBarata.supermercado} pagás {precioTexto(masCara.total - masBarata.total)} menos que en {masCara.supermercado}.
        </p>
      )}

      {hayMezclaMejor && (
        <div className="basket__mix">
          <p>
            Eligiendo para cada producto la cadena más barata gastarías <strong>{precioTexto(canasta.mejorMezcla)}</strong>
            {' '}({precioTexto(ahorroMezcla)} menos que tu carrito actual), pero tendrías que comprar en varias cadenas.
          </p>
          <button type="button" className="btn btn--primary btn--small" onClick={() => reasignar(null)}>
            Aplicar la combinación más barata
          </button>
        </div>
      )}
    </section>
  );
}

export default function Carrito() {
  useTitulo('Tu carrito — GondolaYa');
  const { usuario } = useAuth();
  const { items, grupos, total, canasta, cantidadTotal, cambiarCantidad, cambiarTienda, reasignar, actualizarItem, quitar, vaciar, errorSync } = useCarrito();
  const [confirmando, setConfirmando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [actualizando, setActualizando] = useState(false);
  const [aviso, setAviso] = useState('');

  // Hay con qué comparar solo si algún producto tiene precio en otra cadena.
  const sePuedeComparar = items.some((i) => (i.ofertas || []).some((o) => o.supermercado !== i.supermercado));
  const viejos = items.filter((i) => i.ts > 0 && Date.now() - i.ts > UN_DIA);
  const masViejo = viejos.length > 0 ? Math.min(...viejos.map((i) => i.ts)) : 0;

  /** Vuelve a buscar cada producto (de a 3 a la vez) y le pone el precio de hoy. */
  async function actualizarPrecios() {
    setActualizando(true);
    setAviso('');
    const cola = [...items];
    let ok = 0;
    let fallos = 0;
    async function trabajador() {
      while (cola.length > 0) {
        const it = cola.shift();
        try {
          const data = await buscarProductos(limpiarTermino(it.nombre));
          const nuevo = itemActualizado(it, data.grupos);
          if (nuevo) { actualizarItem(it.id, nuevo); ok += 1; } else fallos += 1;
        } catch (_) {
          fallos += 1;
        }
      }
    }
    await Promise.all([trabajador(), trabajador(), trabajador()]);
    setActualizando(false);
    setAviso(
      `Actualizamos ${ok} de ${ok + fallos} productos.`
      + (fallos > 0 ? ` No pudimos actualizar ${fallos}: puede que ya no estén disponibles o que hayas hecho muchas búsquedas seguidas.` : ''),
    );
  }

  async function copiarLista() {
    try {
      await navigator.clipboard.writeText(armarLista(grupos, total));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch (_) {
      window.alert('No pudimos copiar la lista. Probá desde un navegador con permiso para el portapapeles.');
    }
  }

  return (
    <main className="results">
      <div className="wrap">
        <div className="results__head">
          <p className="section-head__eyebrow">MI CARRITO</p>
          <h1 className="results__title">Tu carrito</h1>
          {items.length > 0 && (
            <p className="results__meta">
              {cantidadTotal} {cantidadTotal === 1 ? 'unidad' : 'unidades'} en {grupos.length} {grupos.length === 1 ? 'supermercado' : 'supermercados'}.
            </p>
          )}
        </div>

        {errorSync && (
          <div className="results__notice results__notice--warn" role="alert">
            No pudimos sincronizar el carrito con tu cuenta. Lo que agregues ahora se pierde si cerrás la página.
          </div>
        )}

        {items.length === 0 ? (
          <div className="results__empty">
            <h2 className="results__empty-title">Tu carrito está vacío</h2>
            <p className="results__empty-text">Buscá un producto y tocá "Agregar al carrito" para armar tu lista. Acá vas a ver todo junto, con el enlace a cada producto.</p>
            <Link className="btn btn--primary" to="/#inicio">Buscar productos</Link>
          </div>
        ) : (
          <>
            {!usuario && (
              <div className="results__notice results__notice--info">
                Estás como invitado: tu carrito se guarda solo en este navegador.{' '}
                <Link to="/login" state={{ desde: '/carrito' }}>Ingresá o creá una cuenta</Link> para guardarlo y verlo desde cualquier dispositivo.
              </div>
            )}

            {viejos.length > 0 && (
              <div className="results__notice results__notice--warn" role="status">
                {viejos.length === 1 ? 'Un producto tiene' : `${viejos.length} productos tienen`} el precio guardado {haceCuanto(masViejo)}.
                Los precios cambian: actualizalos para ver el de hoy antes de comprar.
              </div>
            )}

            {sePuedeComparar && <ComparadorCanasta canasta={canasta} total={total} reasignar={reasignar} />}

            {grupos.map((g) => (
              <section className="cart__group" key={g.supermercado} aria-label={`Productos de ${g.supermercado}`}>
                <header className="cart__group-head">
                  {g.logo && <img src={rutaLogo(g.logo)} alt="" />}
                  <h2 className="cart__group-name">{g.supermercado}</h2>
                  <span className="cart__group-sub">Subtotal {precioTexto(g.subtotal)}</span>
                </header>

                <ol className="results__list">
                  {g.items.map((it) => (
                    <li className="result-card" key={it.id}>
                      <div className="result-card__image">
                        {it.imagen ? (
                          <img src={it.imagen} alt={it.nombre} loading="lazy" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="result-card__no-image">Sin imagen</span>
                        )}
                      </div>

                      <div className="result-card__body">
                        <h3 className="result-card__name">{it.nombre}</h3>
                        {it.marca && <p className="result-card__brand">{it.marca}</p>}
                        <p className="cart-item__unit">
                          {precioTexto(it.precio)} c/u
                          {it.medida && <span className="chip">{it.medida}</span>}
                        </p>
                        {(() => {
                          const mejora = ahorroPosible(it);
                          return mejora && (
                            <p className="cart-item__tip">
                              En <strong>{mejora.oferta.supermercado}</strong> lo encontraste {precioTexto(mejora.ahorro)} más barato.{' '}
                              <button type="button" className="cart-item__switch" onClick={() => cambiarTienda(it.id, mejora.oferta.supermercado)}>
                                Cambiar a {mejora.oferta.supermercado}
                              </button>
                            </p>
                          );
                        })()}
                      </div>

                      <div className="result-card__price">
                        <span className="result-card__price-value">{precioTexto(it.precio * it.cantidad)}</span>
                        <div className="result-card__actions">
                          <Cantidad
                            valor={it.cantidad}
                            nombre={it.nombre}
                            onMenos={() => cambiarCantidad(it.id, -1)}
                            onMas={() => cambiarCantidad(it.id, 1)}
                          />
                          {it.url ? (
                            <a className="result-card__link cart-item__link" href={it.url} target="_blank" rel="noopener noreferrer">
                              Ver en el sitio original <IconoExterno />
                            </a>
                          ) : (
                            <span className="cart-item__nolink">Sin enlace disponible</span>
                          )}
                          <button type="button" className="cart-item__remove" onClick={() => quitar(it.id)}>
                            <IconoBasura /> Quitar
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ))}

            <section className="cart__summary" aria-label="Resumen del carrito">
              <div className="cart__summary-row">
                <span className="cart__total-label">Total estimado</span>
                <strong className="cart__total-value">{precioTexto(total)}</strong>
              </div>
              <p className="cart__note">
                Los precios son los del momento en que agregaste cada producto y pueden variar según la sucursal o la zona de entrega.
                La compra se finaliza en el sitio de cada supermercado con el enlace de cada producto.
              </p>
              <div className="cart__summary-actions">
                <button type="button" className="btn btn--secondary" onClick={actualizarPrecios} disabled={actualizando}>
                  {actualizando ? 'Actualizando precios…' : 'Actualizar precios'}
                </button>
                <button type="button" className="btn btn--primary" onClick={copiarLista}>
                  <IconoCopiar width={16} height={16} /> {copiado ? '¡Lista copiada!' : 'Copiar lista con enlaces'}
                </button>
                {confirmando ? (
                  <>
                    <button type="button" className="btn btn--secondary" onClick={() => { vaciar(); setConfirmando(false); }}>
                      Sí, vaciar el carrito
                    </button>
                    <button type="button" className="btn btn--ghost" onClick={() => setConfirmando(false)}>Cancelar</button>
                  </>
                ) : (
                  <button type="button" className="btn btn--ghost" onClick={() => setConfirmando(true)}>
                    <IconoCarrito width={16} height={16} /> Vaciar carrito
                  </button>
                )}
              </div>
              {aviso && <p className="cart__note" role="status">{aviso}</p>}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
