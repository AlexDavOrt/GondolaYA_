/**
 * Lógica pura del carrito (sin React), así se puede probar con `npm test`.
 * Cada item: { id, nombre, marca, precio, supermercado, logo, imagen, url, cantidad,
 *              ean, medida, ts, ofertas: [{ supermercado, logo, nombre, precio, imagen, url }] }
 * `ofertas` son los precios del mismo producto en las demás cadenas (al momento de agregarlo):
 * con eso se compara la canasta completa y se puede pasar un producto a otra cadena.
 */
export const MAX_CANTIDAD = 99;
export const MAX_ITEMS = 100;

const limitar = (n) => Math.max(1, Math.min(MAX_CANTIDAD, Math.floor(Number(n)) || 1));
const soloHttp = (u) => (typeof u === 'string' && /^https?:\/\//i.test(u.trim()) ? u.trim() : null);
const logoValido = (l) => (typeof l === 'string' && /^\/?ass\/[\w-]+\.png$/.test(l) ? l : null);

/** Ofertas de otras cadenas: una por supermercado, con precio válido y enlaces http(s). */
function normalizarOfertas(lista) {
  if (!Array.isArray(lista)) return [];
  const vistas = new Set();
  const salida = [];
  for (const o of lista) {
    if (salida.length >= 8 || !o || typeof o !== 'object') continue;
    const precio = Number(o.precio);
    if (typeof o.supermercado !== 'string' || !o.supermercado || vistas.has(o.supermercado)) continue;
    if (typeof o.nombre !== 'string' || !o.nombre || !Number.isFinite(precio) || precio <= 0) continue;
    vistas.add(o.supermercado);
    salida.push({
      supermercado: o.supermercado,
      logo: logoValido(o.logo),
      nombre: o.nombre,
      precio,
      imagen: soloHttp(o.imagen),
      url: soloHttp(o.url),
    });
  }
  return salida;
}

/** Identifica un producto de un supermercado puntual (el mismo producto en dos cadenas son dos items). */
export function idProducto(p) {
  return `${p.supermercado}|${p.ean || p.url || p.nombre}`;
}

/**
 * `producto` es una oferta de un supermercado; `contexto` (opcional) trae lo del grupo:
 * { medida, ofertas } para poder comparar después contra las otras cadenas.
 */
export function itemDesdeProducto(p, contexto = {}) {
  return {
    id: idProducto(p),
    nombre: p.nombre,
    marca: p.marca || '',
    precio: p.precio,
    supermercado: p.supermercado,
    logo: p.logo || null,
    imagen: p.imagen || null,
    url: p.url || null,
    cantidad: 1,
    ean: p.ean || null,
    medida: contexto.medida || p.medida || '',
    ts: Date.now(),
    ofertas: normalizarOfertas(contexto.ofertas || []),
  };
}

/** Valida lo que viene de localStorage o del servidor: descarta basura y URLs que no sean http(s). */
export function normalizarItems(lista, { sinRepetidos = true } = {}) {
  if (!Array.isArray(lista)) return [];
  const vistos = new Set();
  const salida = [];
  for (const it of lista) {
    if (salida.length >= MAX_ITEMS) break;
    if (!it || typeof it !== 'object') continue;
    const precio = Number(it.precio);
    if (typeof it.id !== 'string' || !it.id || (sinRepetidos && vistos.has(it.id))) continue;
    if (typeof it.nombre !== 'string' || !it.nombre || typeof it.supermercado !== 'string' || !it.supermercado) continue;
    if (!Number.isFinite(precio) || precio <= 0) continue;
    vistos.add(it.id);
    salida.push({
      id: it.id,
      nombre: it.nombre,
      marca: typeof it.marca === 'string' ? it.marca : '',
      precio,
      supermercado: it.supermercado,
      logo: logoValido(it.logo),
      imagen: soloHttp(it.imagen),
      url: soloHttp(it.url),
      cantidad: limitar(it.cantidad),
      ean: typeof it.ean === 'string' && it.ean ? it.ean.slice(0, 30) : null,
      medida: typeof it.medida === 'string' ? it.medida.slice(0, 30) : '',
      ts: Number.isFinite(Number(it.ts)) && Number(it.ts) > 0 ? Math.floor(Number(it.ts)) : 0,
      ofertas: normalizarOfertas(it.ofertas),
    });
  }
  return salida;
}

/** Todas las ofertas de un item, incluida la de su propio supermercado (la que se guardó al agregarlo). */
export function ofertasDe(item) {
  const otras = (item.ofertas || []).filter((o) => o.supermercado !== item.supermercado);
  return [
    { supermercado: item.supermercado, logo: item.logo, nombre: item.nombre, precio: item.precio, imagen: item.imagen, url: item.url },
    ...otras,
  ];
}

const ofertaEn = (item, supermercado) => ofertasDe(item).find((o) => o.supermercado === supermercado) || null;

/** La oferta más barata; si hay empate, se queda donde ya está. */
function masBarata(item) {
  return ofertasDe(item).reduce((mejor, o) => (o.precio < mejor.precio ? o : mejor));
}

/** Pasa un item a otra oferta (otro supermercado) conservando la cantidad y los datos del producto. */
export function moverAOferta(item, oferta) {
  if (!oferta || oferta.supermercado === item.supermercado) return item;
  return {
    ...item,
    id: idProducto({ supermercado: oferta.supermercado, ean: item.ean, url: oferta.url, nombre: oferta.nombre }),
    nombre: oferta.nombre,
    precio: oferta.precio,
    supermercado: oferta.supermercado,
    logo: oferta.logo,
    imagen: oferta.imagen || item.imagen,
    url: oferta.url,
    // `ofertas` queda igual: ofertasDe() vuelve a incluir la oferta del supermercado anterior.
    ofertas: ofertasDe(item),
  };
}

/** Aplica `elegir(item)` a cada item (devuelve la oferta destino o null para dejarlo) y junta los que queden iguales. */
function reasignar(items, elegir) {
  const resultado = [];
  for (const it of items) {
    const movido = moverAOferta(it, elegir(it));
    const igual = resultado.find((r) => r.id === movido.id);
    if (igual) igual.cantidad = limitar(igual.cantidad + movido.cantidad);
    else resultado.push({ ...movido });
  }
  return resultado;
}

export function carritoReducer(items, accion) {
  switch (accion.tipo) {
    case 'agregar': {
      const nuevo = accion.item;
      if (items.some((i) => i.id === nuevo.id)) {
        return items.map((i) => (i.id === nuevo.id ? { ...i, cantidad: limitar(i.cantidad + 1) } : i));
      }
      if (items.length >= MAX_ITEMS) return items;
      return [...items, { ...nuevo, cantidad: 1 }];
    }
    case 'cambiar':
      // Si la cantidad llega a 0 el producto sale del carrito.
      return items
        .map((i) => (i.id === accion.id ? { ...i, cantidad: Math.min(MAX_CANTIDAD, i.cantidad + accion.delta) } : i))
        .filter((i) => i.cantidad > 0);
    case 'quitar':
      return items.filter((i) => i.id !== accion.id);
    case 'vaciar':
      return [];
    case 'actualizar':
      // Reemplaza los datos de un item (precio nuevo, ofertas nuevas) conservando su id y su cantidad.
      return items.map((i) => (i.id === accion.id ? { ...accion.item, id: i.id, cantidad: i.cantidad } : i));
    case 'cambiarTienda':
      return reasignar(items, (it) => (it.id === accion.id ? ofertaEn(it, accion.supermercado) : null));
    case 'reasignar':
      // tienda: nombre de un supermercado (pasa todo ahí si el producto está) o null (cada producto a su opción más barata).
      return reasignar(items, (it) => (accion.tienda ? ofertaEn(it, accion.tienda) : masBarata(it)));
    case 'fusionar': {
      // Suma lo que se agregó como invitado con lo que ya tenía la cuenta.
      let resultado = items;
      // Los repetidos se conservan a propósito: se suman uno por uno más abajo.
      for (const nuevo of normalizarItems(accion.items, { sinRepetidos: false })) {
        const existente = resultado.find((i) => i.id === nuevo.id);
        if (existente) {
          resultado = resultado.map((i) => (i.id === nuevo.id ? { ...i, cantidad: limitar(i.cantidad + nuevo.cantidad) } : i));
        } else if (resultado.length < MAX_ITEMS) {
          resultado = [...resultado, nuevo];
        }
      }
      return resultado;
    }
    case 'reemplazar':
      return normalizarItems(accion.items);
    default:
      return items;
  }
}

/** Totales en centavos para no arrastrar errores de decimales. */
export function calcularTotales(items) {
  let cantidad = 0;
  let centavos = 0;
  const porTienda = new Map();
  for (const it of items) {
    const c = Math.round(it.precio * 100) * it.cantidad;
    cantidad += it.cantidad;
    centavos += c;
    if (!porTienda.has(it.supermercado)) {
      porTienda.set(it.supermercado, { supermercado: it.supermercado, logo: it.logo, items: [], cantidad: 0, centavos: 0 });
    }
    const g = porTienda.get(it.supermercado);
    g.items.push(it);
    g.cantidad += it.cantidad;
    g.centavos += c;
  }
  const grupos = [...porTienda.values()].map((g) => ({ ...g, subtotal: g.centavos / 100 }));
  return { cantidad, total: centavos / 100, grupos };
}

/**
 * Compara la canasta completa en cada supermercado.
 *  - porTienda: para cada cadena, cuánto costaría comprar ahí lo que tiene (y qué productos no encuentra).
 *  - mejorMezcla: lo mínimo posible eligiendo, producto por producto, la cadena más barata.
 *  - actual: lo que cuesta el carrito tal como está armado.
 * Todo en centavos para evitar errores de decimales.
 */
export function compararCanasta(items) {
  const tiendas = new Map(); // nombre -> { supermercado, logo }
  let actualC = 0;
  let mezclaC = 0;
  for (const it of items) {
    actualC += Math.round(it.precio * 100) * it.cantidad;
    let min = Infinity;
    for (const o of ofertasDe(it)) {
      if (!tiendas.has(o.supermercado)) tiendas.set(o.supermercado, { supermercado: o.supermercado, logo: o.logo });
      min = Math.min(min, Math.round(o.precio * 100));
    }
    mezclaC += min * it.cantidad;
  }

  const porTienda = [...tiendas.values()].map((t) => {
    let centavos = 0;
    const faltan = [];
    for (const it of items) {
      const o = ofertaEn(it, t.supermercado);
      if (o) centavos += Math.round(o.precio * 100) * it.cantidad;
      else faltan.push(it.nombre);
    }
    return { ...t, total: centavos / 100, faltan, completa: faltan.length === 0 };
  });
  // Primero las que tienen todo (de más barata a más cara); después las que no, con menos faltantes primero.
  porTienda.sort((a, b) => (a.completa === b.completa
    ? (a.completa ? a.total - b.total : a.faltan.length - b.faltan.length || a.total - b.total)
    : a.completa ? -1 : 1));

  return { porTienda, actual: actualC / 100, mejorMezcla: mezclaC / 100 };
}

/** Cuánto se ahorra pasando este item a su oferta más barata (0 si ya está en la más barata). */
export function ahorroPosible(item) {
  const mejor = masBarata(item);
  if (mejor.supermercado === item.supermercado) return null;
  const centavos = (Math.round(item.precio * 100) - Math.round(mejor.precio * 100)) * item.cantidad;
  return centavos > 0 ? { oferta: mejor, ahorro: centavos / 100 } : null;
}

const eanNormalizado = (e) => {
  const limpio = String(e ?? '').replace(/\D/g, '').replace(/^0+/, '');
  return limpio.length >= 7 ? limpio : null;
};

/**
 * Con el resultado de una búsqueda nueva (`grupos`), devuelve el item con el precio de hoy
 * y las ofertas de todas las cadenas actualizadas. Devuelve null si ya no se encuentra
 * (por ejemplo, sin stock en esa cadena).
 */
export function itemActualizado(item, grupos, ahora = Date.now()) {
  const ean = eanNormalizado(item.ean);
  const grupo = (grupos || []).find((g) => (ean
    ? g.ofertas.some((o) => eanNormalizado(o.ean) === ean)
    : g.ofertas.some((o) => o.supermercado === item.supermercado && o.nombre === item.nombre)));
  if (!grupo) return null;
  const propia = grupo.ofertas.find((o) => o.supermercado === item.supermercado);
  if (!propia) return null;
  return {
    ...item,
    nombre: propia.nombre,
    precio: propia.precio,
    url: propia.url || item.url,
    imagen: propia.imagen || item.imagen,
    medida: grupo.medida || item.medida,
    ts: ahora,
    ofertas: normalizarOfertas(grupo.ofertas),
  };
}
