'use strict';

const { parsearCantidad, precioUnitario, UNIDAD_PRECIO } = require('./unidades');

/** Cadenas que se consultan (todas usan la plataforma VTEX y su catálogo público). */
const SUPERMERCADOS = {
  carrefour: { nombre: 'Carrefour', base: 'https://www.carrefour.com.ar',             logo: 'ass/carrefour.png' },
  dia:       { nombre: 'Día',       base: 'https://diaonline.supermercadosdia.com.ar', logo: 'ass/dia.png' },
  jumbo:     { nombre: 'Jumbo',     base: 'https://www.jumbo.com.ar',                  logo: 'ass/jumbo.png' },
  disco:     { nombre: 'Disco',     base: 'https://www.disco.com.ar',                  logo: 'ass/disco.png' },
  vea:       { nombre: 'Vea',       base: 'https://www.vea.com.ar',                    logo: 'ass/vea.png' },
};

/** Solo se aceptan URLs http(s); cualquier otra cosa (javascript:, data:, etc.) se descarta. */
function soloHttp(url) {
  if (typeof url !== 'string') return null;
  const limpia = url.trim();
  return /^https?:\/\//i.test(limpia) ? limpia : null;
}

/**
 * Convierte la respuesta de VTEX (producto -> items -> sellers -> commertialOffer)
 * en productos con precio. Por cada producto toma la oferta disponible más barata entre
 * sus SKUs y descarta lo que no tiene stock o precio. Usa solo "Price": "ListPrice" no es
 * confiable en algunas cadenas. Además detecta la medida ("1 L", "500 g") para poder
 * calcular el precio por litro / kg / unidad.
 */
function convertir(clave, productos) {
  const sm = SUPERMERCADOS[clave];
  const resultado = [];

  for (const p of productos) {
    if (!p || !p.productName || !Array.isArray(p.items)) continue;

    let mejorPrecio = null;
    let mejorItem = null;
    for (const item of p.items) {
      for (const seller of item.sellers || []) {
        const oferta = seller && seller.commertialOffer;   // (sí, con ese typo: es el nombre real)
        if (!oferta) continue;
        const precio = Number(oferta.Price);
        const stock = Number(oferta.AvailableQuantity);
        if (precio > 0 && stock > 0 && (mejorPrecio === null || precio < mejorPrecio)) {
          mejorPrecio = precio;
          mejorItem = item;
        }
      }
    }
    if (mejorPrecio === null) continue;

    const imagen = (mejorItem.images || []).map((i) => soloHttp(i && i.imageUrl)).find(Boolean) || null;
    let urlOriginal = soloHttp(p.link);
    if (!urlOriginal && p.linkText) urlOriginal = `${sm.base}/${p.linkText}/p`;

    const nombre = String(p.productName);
    const cantidad = parsearCantidad(nombre)
      || parsearCantidad(String(mejorItem.nameComplete || mejorItem.name || ''));

    resultado.push({
      nombre,
      marca: p.brand ? String(p.brand) : '',
      precio: mejorPrecio,
      supermercado: sm.nombre,
      logo: sm.logo,
      imagen,
      url: urlOriginal,
      ean: mejorItem.ean || null,
      cantidad,
    });
  }
  return resultado;
}

/** EAN sin ceros a la izquierda (UPC-A y EAN-13 del mismo producto deben coincidir). null si no sirve. */
function normalizarEan(ean) {
  const limpio = String(ean ?? '').replace(/\D/g, '').replace(/^0+/, '');
  return limpio.length >= 7 ? limpio : null;
}

/**
 * Junta en un solo grupo las ofertas del MISMO producto (mismo código de barras) de distintas cadenas.
 * Cada grupo trae las ofertas ordenadas de más barata a más cara (una por cadena) y cuánto se ahorra.
 * Los productos sin código de barras quedan solos: no se adivina que son iguales.
 */
function agruparOfertas(productos) {
  const mapa = new Map();
  productos.forEach((p, i) => {
    const ean = normalizarEan(p.ean);
    const clave = ean ? `ean:${ean}` : `solo:${i}`;
    if (!mapa.has(clave)) mapa.set(clave, []);
    mapa.get(clave).push(p);
  });

  const grupos = [];
  for (const [clave, lista] of mapa) {
    // Una oferta por cadena (la más barata) y todas de menor a mayor precio.
    const porCadena = new Map();
    for (const p of lista) {
      const previa = porCadena.get(p.supermercado);
      if (!previa || p.precio < previa.precio) porCadena.set(p.supermercado, p);
    }
    const ofertas = [...porCadena.values()]
      .sort((a, b) => a.precio - b.precio || a.supermercado.localeCompare(b.supermercado, 'es'));

    // Mismo código de barras = misma presentación: se usa la medida que se haya podido leer.
    const cantidad = (ofertas.find((o) => o.cantidad) || {}).cantidad || null;
    const unidad = cantidad ? UNIDAD_PRECIO[cantidad.tipo] : null;
    const conUnitario = ofertas.map((o) => ({
      nombre: o.nombre,
      marca: o.marca,
      precio: o.precio,
      precioUnitario: precioUnitario(o.precio, cantidad),
      supermercado: o.supermercado,
      logo: o.logo,
      imagen: o.imagen,
      url: o.url,
      ean: o.ean,
    }));

    const barata = conUnitario[0];
    const cara = conUnitario[conUnitario.length - 1];
    const ahorro = Math.round((cara.precio - barata.precio) * 100) / 100;
    grupos.push({
      clave,
      nombre: barata.nombre,
      marca: (conUnitario.find((o) => o.marca) || {}).marca || '',
      imagen: (conUnitario.find((o) => o.imagen) || {}).imagen || null,
      medida: cantidad ? cantidad.etiqueta : null,
      tipoMedida: cantidad ? cantidad.tipo : null,
      unidad,
      precioMin: barata.precio,
      precioMax: cara.precio,
      precioUnitarioMin: barata.precioUnitario,
      ahorro,
      ahorroPct: cara.precio > 0 ? Math.round((ahorro / cara.precio) * 100) : 0,
      ofertas: conUnitario,
    });
  }

  grupos.sort((a, b) => a.precioMin - b.precioMin || a.nombre.localeCompare(b.nombre, 'es'));
  return grupos;
}

module.exports = { SUPERMERCADOS, soloHttp, convertir, agruparOfertas, normalizarEan };
