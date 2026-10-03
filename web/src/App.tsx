import { BrowserRouter } from 'react-router-dom';
import { ProveedorSesion } from './componentes/ProveedorSesion';
import { RutasAplicacion } from './RutasAplicacion';

function App() {
  return (
    <BrowserRouter>
      <ProveedorSesion>
        <RutasAplicacion />
      </ProveedorSesion>
    </BrowserRouter>
  );
}

export default App;
