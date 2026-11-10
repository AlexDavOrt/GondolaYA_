function Svg({ className, strokeWidth = 2, children, ...resto }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...resto}
    >
      {children}
    </svg>
  );
}

export const IconoCheck = (p) => <Svg strokeWidth={2.2} {...p}><path d="M20 6L9 17l-5-5" /></Svg>;
export const IconoBuscar = (p) => <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" /></Svg>;
export const IconoFlecha = (p) => <Svg strokeWidth={2.4} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>;
export const IconoInfo = (p) => <Svg strokeWidth={2.2} {...p}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></Svg>;
export const IconoRayo = (p) => <Svg strokeWidth={2.2} {...p}><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" /></Svg>;
export const IconoPantalla = (p) => <Svg {...p}><path d="M9 17H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-4M9 17v4M15 17v4M9 21h6" /></Svg>;
export const IconoCarrito = (p) => <Svg {...p}><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" /></Svg>;
export const IconoBasura = (p) => <Svg {...p}><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6" /></Svg>;
export const IconoMas = (p) => <Svg strokeWidth={2.4} {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const IconoMenos = (p) => <Svg strokeWidth={2.4} {...p}><path d="M5 12h14" /></Svg>;
export const IconoExterno = (p) => <Svg {...p}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></Svg>;
export const IconoCopiar = (p) => <Svg {...p}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></Svg>;
