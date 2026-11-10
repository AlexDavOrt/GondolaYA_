import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Al navegar: si la URL trae #seccion baja hasta ella; si no, vuelve arriba de la página. */
export default function ScrollToHash() {
  const { pathname, hash, key } = useLocation();
  useEffect(() => {
    if (hash) {
      let id = hash.slice(1);
      try { id = decodeURIComponent(id); } catch (_) { /* hash inválido: se usa tal cual */ }
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView();
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, hash, key]);
  return null;
}
