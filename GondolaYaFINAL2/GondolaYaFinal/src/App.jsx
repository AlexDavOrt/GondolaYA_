import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Footer from './components/Footer.jsx';
import Navbar from './components/Navbar.jsx';
import ScrollToHash from './components/ScrollToHash.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { CarritoProvider } from './context/CarritoContext.jsx';
import Carrito from './pages/Carrito.jsx';
import Fuentes from './pages/Fuentes.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import NotFound from './pages/NotFound.jsx';
import Privacidad from './pages/Privacidad.jsx';
import Resultados from './pages/Resultados.jsx';

/** El carrito se reinicia (con la fuente correcta) cada vez que alguien entra o sale de su cuenta. */
function ConCarrito({ children }) {
  const { token } = useAuth();
  return <CarritoProvider key={token || 'invitado'} token={token}>{children}</CarritoProvider>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ConCarrito>
          <ScrollToHash />
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/resultados" element={<Resultados />} />
            <Route path="/carrito" element={<Carrito />} />
            <Route path="/fuentes" element={<Fuentes />} />
            <Route path="/privacidad" element={<Privacidad />} />
            <Route path="/login" element={<Login modo="ingresar" />} />
            <Route path="/registro" element={<Login modo="registro" />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Footer />
        </ConCarrito>
      </AuthProvider>
    </BrowserRouter>
  );
}
