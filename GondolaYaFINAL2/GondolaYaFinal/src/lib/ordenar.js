/**
 * Orden y filtros de la lista de resultados (lógica pura, se prueba con `npm test`).
 * Cada grupo es un producto con sus ofertas en distintas cadenas (ver lib/catalogo.js).
 */
export const ORDENES = [
  { id: 'unitario', texto: 'Mejor precio por unidad' },
  { id: 'precio', texto: 'Menor precio' },
  { id: 'ahorro', texto: 'Mayor diferencia entre cadenas' },
];

/** El tipo de medida más común entre los productos (para no mezclar litros con kilos). */
export function tipoDominante(grupos) {
  const cuenta = {};
  for (const g of grupos) {
    if (g.tipoMedida && g.precioUnitarioMin != null) cuenta[g.tipoMedida] = (cuenta[g.tipoMedida] || 0) + 1;
  }
  let mejor = null;
  for (const [tipo, n] of Object.entries(cuenta)) if (!mejor || n > cuenta[mejor]) mejor = tipo;
  return mejor;
}

const porPrecio = (a, b) => a.precioMin - b.precioMin || a.nombre.localeCompare(b.nombre, 'es');

export function ordenarGrupos(grupos, orden) {
  const copia = [...grupos];
  if (orden === 'ahorro') {
    return copia.sort((a, b) => b.ahorro - a.ahorro || porPrecio(a, b));
  }
  if (orden === 'unitario') {
    const tipo = tipoDominante(copia);
    if (tipo) {
      const comparables = copia.filter((g) => g.tipoMedida === tipo && g.precioUnitarioMin != null)
        .sort((a, b) => a.precioUnitarioMin - b.precioUnitarioMin || porPrecio(a, b));
      const resto = copia.filter((g) => !(g.tipoMedida === tipo && g.precioUnitarioMin != null)).sort(porPrecio);
      return [...comparables, ...resto];
    }
  }
  return copia.sort(porPrecio);
}

export function filtrarGrupos(grupos, { soloComparables = false } = {}) {
  return soloComparables ? grupos.filter((g) => g.ofertas.length > 1) : grupos;
}

/** Texto del destacado de arriba según el orden elegido. */
export function resumenMejor(grupos, orden, formato) {
  if (grupos.length === 0) return null;
  const g = grupos[0];
  const oferta = g.ofertas[0];
  if (orden === 'ahorro') {
    if (g.ahorro <= 0) return null;
    return {
      etiqueta: 'Mayor diferencia entre cadenas',
      valor: formato.precio(g.ahorro),
      detalle: `${g.nombre}: va de ${formato.precio(g.precioMax)} a ${formato.precio(g.precioMin)} según la cadena`,
    };
  }
  if (orden === 'unitario' && g.precioUnitarioMin != null && g.tipoMedida === tipoDominante(grupos)) {
    return {
      etiqueta: `Mejor precio por ${formato.unidad(g.unidad)}`,
      valor: formato.unitario(g.precioUnitarioMin, g.unidad),
      detalle: `${oferta.nombre} en ${oferta.supermercado} (${formato.precio(oferta.precio)})`,
    };
  }
  const barato = [...grupos].sort(porPrecio)[0];
  return {
    etiqueta: 'Precio más barato',
    valor: formato.precio(barato.precioMin),
    detalle: `${barato.ofertas[0].nombre} en ${barato.ofertas[0].supermercado}`,
  };
}
