'use strict';

/**
 * Detecta cuánto trae un producto a partir de su nombre ("Leche 1 L", "Gaseosa 6 x 330 ml",
 * "Arroz 500g", "Cerveza 473 ml x6") y calcula el precio por unidad de medida:
 *   peso    -> precio por kg
 *   volumen -> precio por litro
 *   unidad  -> precio por unidad (packs de latas, rollos, sobres, etc.)
 * Si no se puede saber con seguridad, devuelve null (mejor no mostrar nada que mostrar algo falso).
 */

const NUM = '(\\d+(?:[.,]\\d+)?)';
const UNIDAD_MEDIDA = '(kgs?|kilos?|gramos?|grs?|g|litros?|lts?|l|ml|cc|cm3)';
const UNIDAD_CONTEO = '(?:un|u|uni|unid|unidad|unidades|rollos?|sobres?|saquitos?|bolsitas?|pastillas?|capsulas?|c[aá]psulas?|sachets?|lonchas?|fetas?)';

const RE_MEDIDA = new RegExp(`${NUM}\\s*${UNIDAD_MEDIDA}(?![a-záéíóúñ0-9])`, 'i');
const RE_PACK_ANTES = new RegExp(`(?<![\\d.,])(\\d{1,3})\\s*[x×]\\s*${NUM}\\s*${UNIDAD_MEDIDA}(?![a-záéíóúñ0-9])`, 'i');
const RE_PACK_DESPUES = new RegExp(`${NUM}\\s*${UNIDAD_MEDIDA}\\s*[x×]\\s*(\\d{1,3})(?![\\d.,]|\\s*${UNIDAD_MEDIDA}(?![a-záéíóúñ0-9]))`, 'i');
const RE_PACK_PALABRA = /\b(?:pack|combo|caja)\s*(?:de\s*|x\s*)?(\d{1,3})\b(?!\s*[.,]?\d*\s*(?:kg|g|gr|ml|l|lt|cc))/i;
const RE_CONTEO = new RegExp(`(?:[x×]\\s*)?(?<![\\d.,])(\\d{1,4})\\s*${UNIDAD_CONTEO}(?![a-záéíóúñ0-9])`, 'i');

const aNumero = (s) => Number(String(s).replace(',', '.'));

function convertirMedida(valor, unidad) {
  const u = unidad.toLowerCase();
  if (/^(kg|kgs|kilo|kilos)$/.test(u)) return { tipo: 'peso', base: valor * 1000 };
  if (/^(g|gr|grs|gramo|gramos)$/.test(u)) return { tipo: 'peso', base: valor };
  if (/^(l|lt|lts|litro|litros)$/.test(u)) return { tipo: 'volumen', base: valor * 1000 };
  return { tipo: 'volumen', base: valor }; // ml, cc, cm3
}

const redondear = (n) => Math.round(n * 100) / 100;

function etiquetaMedida(tipo, base) {
  if (tipo === 'peso') {
    return base >= 1000 ? `${formatearNumero(base / 1000)} kg` : `${formatearNumero(base)} g`;
  }
  if (tipo === 'volumen') {
    return base >= 1000 ? `${formatearNumero(base / 1000)} L` : `${formatearNumero(base)} ml`;
  }
  return base === 1 ? '1 un.' : `${formatearNumero(base)} un.`;
}

function formatearNumero(n) {
  const r = Math.round(n * 100) / 100;
  return String(r).replace('.', ',');
}

/** @returns {{tipo:'peso'|'volumen'|'unidad', base:number, etiqueta:string, pack:number}|null} base en g, ml o unidades */
function parsearCantidad(texto) {
  if (typeof texto !== 'string' || !texto.trim()) return null;
  const t = texto.replace(/\s+/g, ' ');

  let tipo = null;
  let base = null;
  let pack = 1;

  let m = t.match(RE_PACK_ANTES);
  if (m) {
    const c = convertirMedida(aNumero(m[2]), m[3]);
    pack = Number(m[1]);
    tipo = c.tipo;
    base = c.base * pack;
  } else if ((m = t.match(RE_PACK_DESPUES))) {
    const c = convertirMedida(aNumero(m[1]), m[2]);
    pack = Number(m[3]);
    tipo = c.tipo;
    base = c.base * pack;
  } else if ((m = t.match(RE_MEDIDA))) {
    const c = convertirMedida(aNumero(m[1]), m[2]);
    tipo = c.tipo;
    base = c.base;
    const p = t.match(RE_PACK_PALABRA);
    if (p && Number(p[1]) > 1) { pack = Number(p[1]); base *= pack; }
  } else if ((m = t.match(RE_CONTEO))) {
    tipo = 'unidad';
    base = Number(m[1]);
  }

  if (!tipo || !Number.isFinite(base) || base <= 0) return null;
  // Descarta cifras absurdas (probablemente otra cosa del nombre).
  if (tipo === 'peso' && base > 50000) return null;
  if (tipo === 'volumen' && base > 50000) return null;
  if (tipo === 'unidad' && base > 5000) return null;

  base = redondear(base);
  const etiqueta = pack > 1 && tipo !== 'unidad'
    ? `${pack} × ${etiquetaMedida(tipo, base / pack)}`
    : etiquetaMedida(tipo, base);
  return { tipo, base, pack, etiqueta };
}

const UNIDAD_PRECIO = { peso: 'kg', volumen: 'L', unidad: 'un' };

/** Precio por kg / litro / unidad (o null si no hay medida). */
function precioUnitario(precio, cantidad) {
  if (!cantidad || !(precio > 0)) return null;
  const divisor = cantidad.tipo === 'unidad' ? cantidad.base : cantidad.base / 1000;
  return redondear(precio / divisor);
}

module.exports = { parsearCantidad, precioUnitario, etiquetaMedida, UNIDAD_PRECIO };
