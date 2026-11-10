import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import GrupoCard from '../components/GrupoCard.jsx';
import { IconoCheck } from '../components/Iconos.jsx';
import SearchBar from '../components/SearchBar.jsx';
import { buscarProductos } from '../lib/api.js';
import { limpiarTermino, nombreUnidad, precioTexto, precioUnitarioTexto } from '../lib/formato.js';
import { ORDENES, filtrarGrupos, ordenarGrupos, resumenMejor } from '../lib/ordenar.js';
import useTitulo from '../lib/useTitulo.js';

const POR_PAGINA = 20;
const FORMATO = { precio: precioTexto, unitario: precioUnitarioTexto, unidad: nombreUnidad };

function Esqueleto() {
  return (
    <ul className="results__list" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <li className="group-card skeleton" key={i}>
          <div className="group-card__top">
            <div className="skeleton__box skeleton__box--img" />
            <div className="skeleton__lines">
              <div className="skeleton__box" style={{ width: '70%' }} />
              <div className="skeleton__box" style={{ width: '40%' }} />
            </div>
          </div>
          <div className="skeleton__box skeleton__box--row" />
          <div className="skeleton__box skeleton__box--row" />
        </li>
      ))}
    </ul>
  );
}

export default function Resultados() {
  const [params] = useSearchParams();
  const termino = limpiarTermino(params.get('producto'));
  const [estado, setEstado] = useState({ termino: null, fase: 'cargando' });
  const [orden, setOrden] = useState('unitario');
  const [soloComparables, setSoloComparables] = useState(false);
  const [visibles, setVisibles] = useState(POR_PAGINA);

  useEffect(() => {
    if (termino.length < 2) return undefined;
    const controlador = new AbortController();
    setEstado({ termino, fase: 'cargando' });
    setVisibles(POR_PAGINA);
    buscarProductos(termino, controlador.signal)
      .then((data) => setEstado({ termino, fase: 'ok', data }))
      .catch((e) => {
        if (e.name === 'AbortError') return;
        setEstado({ termino, fase: 'error', mensaje: e.message });
      });
    return () => controlador.abort();
  }, [termino]);

  // La fase se deriva del término actual: así nunca se ve un frame con resultados de la búsqueda anterior.
  const fase = termino.length < 2 ? 'corto' : estado.termino === termino ? estado.fase : 'cargando';
  const data = fase === 'ok' ? estado.data : null;
  useTitulo(data ? `Resultados para ${data.producto} — GondolaYa` : 'Resultados — GondolaYa');

  const grupos = useMemo(
    () => (data ? ordenarGrupos(filtrarGrupos(data.grupos, { soloComparables }), orden) : []),
    [data, orden, soloComparables],
  );
  const enVarias = data ? data.grupos.filter((g) => g.ofertas.length > 1).length : 0;
  const mejor = useMemo(() => resumenMejor(grupos, orden, FORMATO), [grupos, orden]);

  return (
    <main className="results">
      <div className="wrap">
        <SearchBar className="results__search" valorInicial={termino} />

        {fase === 'corto' && (
          <div className="results__notice results__notice--info" role="status">
            Escribí al menos 2 caracteres para buscar un producto.
          </div>
        )}
        {fase === 'cargando' && (
          <>
            <div className="results__notice results__notice--info" role="status" aria-busy="true">
              Buscando precios de "{termino}" en las cadenas…
            </div>
            <Esqueleto />
          </>
        )}
        {fase === 'error' && (
          <div className="results__notice results__notice--info" role="alert">{estado.mensaje}</div>
        )}

        {data && (
          <div>
            <div className="results__head">
              <p className="section-head__eyebrow">RESULTADOS</p>
              <h1 className="results__title">Resultados para <span className="results__title-term">{data.producto}</span></h1>
              {data.total > 0 && (
                <p className="results__meta">
                  {data.totalGrupos} {data.totalGrupos === 1 ? 'producto' : 'productos'} en {data.consultados.length} supermercados
                  {enVarias > 0 && <> · {enVarias} {enVarias === 1 ? 'está' : 'están'} en más de una cadena</>}.
                </p>
              )}
            </div>

            {data.fallidos.length > 0 && (
              <div className="results__notice results__notice--warn">
                <p>
                  No pudimos consultar a {data.fallidos.join(', ')} en este momento, así que sus precios no
                  aparecen en la lista. Probá de nuevo en unos minutos.
                </p>
              </div>
            )}

            {data.total === 0 ? (
              <div className="results__empty">
                <h2 className="results__empty-title">No encontramos productos para "{data.producto}"</h2>
                <p className="results__empty-text">Probá con otra palabra o con un nombre más general, por ejemplo "leche" en lugar de la marca completa.</p>
                <Link className="btn btn--secondary" to="/">Volver al inicio</Link>
              </div>
            ) : (
              <>
                {mejor && (
                  <section className="results__best" aria-label={mejor.etiqueta}>
                    <div className="results__best-icon"><IconoCheck strokeWidth={2.4} /></div>
                    <div className="results__best-text">
                      <p className="results__best-label">
                        {mejor.etiqueta}: <strong className="results__best-price">{mejor.valor}</strong>
                      </p>
                      <p className="results__best-detail">{mejor.detalle}</p>
                    </div>
                  </section>
                )}

                <div className="toolbar" role="group" aria-label="Ordenar y filtrar resultados">
                  <label className="toolbar__field">
                    <span>Ordenar por</span>
                    <select value={orden} onChange={(e) => { setOrden(e.target.value); setVisibles(POR_PAGINA); }}>
                      {ORDENES.map((o) => <option key={o.id} value={o.id}>{o.texto}</option>)}
                    </select>
                  </label>
                  {enVarias > 0 && (
                    <label className="toolbar__check">
                      <input
                        type="checkbox"
                        checked={soloComparables}
                        onChange={(e) => { setSoloComparables(e.target.checked); setVisibles(POR_PAGINA); }}
                      />
                      Solo productos en más de una cadena
                    </label>
                  )}
                </div>

                {grupos.length === 0 ? (
                  <div className="results__notice results__notice--info">
                    Ningún producto de esta búsqueda está en más de una cadena. Desactivá el filtro para verlos todos.
                  </div>
                ) : (
                  <>
                    <ol className="results__list">
                      {grupos.slice(0, visibles).map((g) => <GrupoCard key={g.clave} grupo={g} />)}
                    </ol>
                    {grupos.length > visibles && (
                      <div className="results__more">
                        <button type="button" className="btn btn--secondary" onClick={() => setVisibles((v) => v + POR_PAGINA)}>
                          Mostrar más ({grupos.length - visibles} restantes)
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            <p className="results__source">
              Los precios se consultan en el momento al catálogo online (plataforma VTEX) de cada cadena y pueden
              variar según la sucursal o la zona de entrega. Agrupamos como "el mismo producto" solo lo que tiene el
              mismo código de barras. <Link to="/fuentes">Más sobre las fuentes</Link>.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
