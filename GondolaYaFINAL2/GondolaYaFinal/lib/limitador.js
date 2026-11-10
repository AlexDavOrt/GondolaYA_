'use strict';

/**
 * Límite simple de pedidos por IP (en memoria). Protege al servidor, y de paso a los
 * supermercados, de que alguien dispare búsquedas sin parar.
 * Devuelve un middleware de Express.
 */
function crearLimitador({ max = 40, ventanaMs = 60 * 1000, ahora = Date.now } = {}) {
  const visitas = new Map(); // ip -> { desde, cuenta }

  return function limitador(req, res, next) {
    const t = ahora();
    const ip = req.ip || (req.socket && req.socket.remoteAddress) || 'desconocida';

    if (visitas.size > 5000) {
      for (const [clave, v] of visitas) if (t - v.desde >= ventanaMs) visitas.delete(clave);
    }

    let v = visitas.get(ip);
    if (!v || t - v.desde >= ventanaMs) {
      v = { desde: t, cuenta: 0 };
      visitas.set(ip, v);
    }
    v.cuenta += 1;

    if (v.cuenta > max) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((v.desde + ventanaMs - t) / 1000))));
      return res.status(429).json({ error: 'Hiciste muchas búsquedas seguidas. Esperá un minuto y probá de nuevo.' });
    }
    return next();
  };
}

module.exports = { crearLimitador };
