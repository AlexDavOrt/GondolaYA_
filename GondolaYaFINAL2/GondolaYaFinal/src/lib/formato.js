/** Formato de precios: $1.720 / $1.850,50 */
export function precioTexto(n) {
  const esEntero = Math.round(n * 100) % 100 === 0;
  const partes = (esEntero ? Math.round(n).toString() : n.toFixed(2)).split('.');
  partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return '$' + partes.join(',');
}

/** Los logos llegan como "ass/dia.png"; con rutas de React hay que usarlos desde la raíz. */
export function rutaLogo(logo) {
  return logo ? '/' + String(logo).replace(/^\/+/, '') : '';
}

/** Normaliza lo que escribe la persona antes de buscar. */
export function limpiarTermino(texto) {
  return String(texto ?? '').trim().replace(/\s+/g, ' ').slice(0, 80);
}

/** "por litro", "por kg", "por unidad" */
export function nombreUnidad(unidad) {
  return unidad === 'L' ? 'litro' : unidad === 'kg' ? 'kg' : 'unidad';
}

/** $1.720/L */
export function precioUnitarioTexto(valor, unidad) {
  return `${precioTexto(valor)}/${unidad === 'un' ? 'un.' : unidad}`;
}

/** "hace 3 horas", "hace 2 días" a partir de un timestamp en ms. */
export function haceCuanto(ts, ahora = Date.now()) {
  const min = Math.max(0, Math.round((ahora - ts) / 60000));
  if (min < 2) return 'hace un momento';
  if (min < 60) return `hace ${min} minutos`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} ${h === 1 ? 'hora' : 'horas'}`;
  const d = Math.round(h / 24);
  return `hace ${d} ${d === 1 ? 'día' : 'días'}`;
}
