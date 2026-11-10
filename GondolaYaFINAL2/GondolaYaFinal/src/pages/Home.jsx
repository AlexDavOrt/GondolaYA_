import { Link, useNavigate } from 'react-router-dom';
import { IconoBuscar, IconoCheck, IconoInfo, IconoPantalla, IconoRayo } from '../components/Iconos.jsx';
import SearchBar from '../components/SearchBar.jsx';
import useTitulo from '../lib/useTitulo.js';

const CATEGORIAS = ['Almacén', 'Lácteos', 'Bebidas', 'Limpieza', 'Congelados'];
const SUPERMERCADOS = [
  ['carrefour', 'Carrefour'], ['dia', 'Día'], ['jumbo', 'Jumbo'], ['disco', 'Disco'], ['vea', 'Vea'],
];

export default function Home() {
  const navigate = useNavigate();
  useTitulo('GondolaYa — Comparador de precios de supermercados');

  return (
    <main>
      {/* =================== HERO / INICIO =================== */}
      <section className="hero" id="inicio">
        <div className="wrap hero__grid">
          <div className="hero__content">
            <span className="hero__badge">
              <IconoCheck className="hero__badge-icon" />
              Precios de las tiendas online de cada cadena
            </span>

            <h1 className="hero__title">
              Encontrá el mejor precio
              <span className="hero__title-accent"> antes de comprar</span>
            </h1>

            <p className="hero__lede">Buscás un producto y te mostramos cuánto cuesta en Carrefour, Día, Jumbo, Disco y Vea, con el precio por litro o kg, para que sepas dónde conviene comprarlo.</p>

            <SearchBar />

            <Link to="/#como-funciona" className="hero__more">
              <IconoInfo className="hero__more-icon" />
              Ver cómo funciona
            </Link>

            <p className="hero__categories-label">CATEGORÍAS POPULARES</p>
            <div className="hero__categories">
              {CATEGORIAS.map((categoria) => (
                <button
                  key={categoria}
                  type="button"
                  className="hero__category"
                  onClick={() => navigate(`/resultados?producto=${encodeURIComponent(categoria)}`)}
                >
                  {categoria}
                </button>
              ))}
            </div>

            <div className="hero__trust">
              <div className="hero__trust-item"><IconoCheck className="hero__trust-icon" />Precios de las tiendas online</div>
              <div className="hero__trust-item"><IconoRayo className="hero__trust-icon" />Consultados en el momento</div>
              <div className="hero__trust-item"><IconoCheck className="hero__trust-icon" />Gratis para usuarios</div>
            </div>
          </div>
        </div>
      </section>

      {/* =================== CÓMO FUNCIONA =================== */}
      <section className="how" id="como-funciona">
        <div className="wrap">
          <div className="section-head section-head--center">
            <p className="section-head__eyebrow">CÓMO FUNCIONA</p>
            <h2 className="section-head__title">Ahorrar te toma 3 pasos</h2>
            <p className="section-head__subtitle">Sin instalar nada ni recorrer sucursales. Buscás, comparamos, elegís y ahorrás — así de simple.</p>
          </div>

          <div className="how__steps">
            <div className="how__step">
              <div className="how__step-icon"><IconoBuscar /><span className="how__step-index">1</span></div>
              <h3 className="how__step-title">Buscás el producto</h3>
              <p className="how__step-text">Escribí el nombre de lo que necesitás comprar, desde leche hasta detergente.</p>
            </div>
            <div className="how__step">
              <div className="how__step-icon"><IconoPantalla /><span className="how__step-index">2</span></div>
              <h3 className="how__step-title">Comparamos por vos</h3>
              <p className="how__step-text">Consultamos al instante el catálogo online (plataforma VTEX) de cada cadena y juntamos el mismo producto de todas.</p>
            </div>
            <div className="how__step">
              <div className="how__step-icon"><IconoCheck strokeWidth={2} /><span className="how__step-index">3</span></div>
              <h3 className="how__step-title">Elegís el mejor precio</h3>
              <p className="how__step-text">Ves el precio en cada cadena, el precio por litro o kg y cuánto ahorrás. Armás tu carrito y te decimos dónde conviene comprar todo.</p>
            </div>
          </div>
        </div>
      </section>

      {/* =================== SUPERMERCADOS =================== */}
      <section className="stores" id="supermercados">
        <div className="wrap">
          <div className="section-head section-head--center">
            <p className="section-head__eyebrow">SUPERMERCADOS</p>
            <h2 className="section-head__title">Comparamos cinco de las cadenas más grandes</h2>
            <p className="section-head__subtitle">Consultamos el catálogo online de cada una cada vez que buscás.</p>
          </div>

          <div className="stores__grid">
            {SUPERMERCADOS.map(([archivo, nombre]) => (
              <div className="stores__card" key={archivo}>
                <div className="stores__card-logo"><img src={`/ass/${archivo}.png`} alt={nombre} /></div>
                <span className="stores__card-name">{nombre}</span>
              </div>
            ))}
          </div>

          <p className="stores__note">
            <IconoCheck className="stores__note-icon" />
            <span>
              Los precios son los de la tienda online y pueden variar según la sucursal o la zona de entrega.{' '}
              <Link to="/fuentes">Cómo obtenemos los datos</Link>
            </span>
          </p>
        </div>
      </section>
    </main>
  );
}
