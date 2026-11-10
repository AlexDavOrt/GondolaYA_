import { Link } from 'react-router-dom';
import useTitulo from '../lib/useTitulo.js';

export default function Fuentes() {
  useTitulo('Fuentes de datos — GondolaYa');
  return (
    <main className="doc">
      <div className="wrap doc__wrap">
        <p className="section-head__eyebrow">FUENTES DE DATOS</p>
        <h1 className="doc__title">De dónde salen los precios</h1>

        <h2>Las tiendas online de cada cadena</h2>
        <p>
          Cada vez que buscás un producto, nuestro servidor consulta el catálogo público de las tiendas online de
          Carrefour, Día, Jumbo, Disco y Vea. Todas usan la plataforma de comercio electrónico VTEX, que expone
          ese catálogo sin necesidad de clave. No usamos los datos de SEPA / Precios Claros.
        </p>

        <h2>Qué significa cada precio</h2>
        <ul>
          <li>Es el precio publicado en la tienda online en el momento de la consulta. Guardamos cada búsqueda hasta 10 minutos para no sobrecargar a las cadenas.</li>
          <li>Puede ser distinto al de la góndola y variar según la sucursal o la zona de entrega.</li>
          <li>Puede no incluir descuentos con tarjeta o billetera, ni promociones por cantidad que la tienda aplique recién en el carrito.</li>
          <li>Solo mostramos productos con stock informado por la tienda.</li>
        </ul>

        <h2>Cómo sabemos que es “el mismo producto”</h2>
        <p>
          Juntamos las ofertas de distintas cadenas solo cuando el producto tiene el mismo código de barras (EAN).
          Los productos sin código quedan solos: preferimos no juntar de más antes que mostrar una comparación falsa.
        </p>

        <h2>Precio por litro, kg o unidad</h2>
        <p>
          Lo calculamos leyendo la medida que figura en el nombre del producto (por ejemplo “1 L”, “500 g” o
          “6 x 330 ml”). Si el nombre no la trae o es ambigua, no mostramos precio por unidad. Como se lee de un
          texto, puede equivocarse: ante la duda, mirá la presentación en el sitio de la cadena.
        </p>

        <h2>Cadenas que todavía no están</h2>
        <p>
          Por ahora no incluimos otras cadenas, como Coto, porque no usan la misma plataforma y no podemos
          consultarlas de la misma forma.
        </p>

        <p className="doc__back"><Link to="/">← Volver al inicio</Link></p>
      </div>
    </main>
  );
}
