import { useState } from 'react';
import TarjetaUsuario from './components/TarjetaUsuario';
import TarjetaPokemon from './components/TarjetaPokemon';

interface Usuario {
  name: string;
  email: string;
  phone: string;
}

export default function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState<boolean>(false);
  const [mostrarPokemon, setMostrarPokemon] = useState<boolean>(false);
  const [cargandoPokemon, setCargandoPokemon] = useState<boolean>(false);

  const handleObtenerPokemon = async () => {
    setCargandoPokemon(true);
    await new Promise(resolve => setTimeout(resolve, 600));
    setMostrarPokemon(true);
    setCargandoPokemon(false);
  };

  const obtenerDatos = async () => {
    setCargando(true);
    try {
      const respuesta = await fetch('https://jsonplaceholder.typicode.com/users/1');
      const datos = await respuesta.json();
      setUsuario(datos);
    } catch (error) {
      console.error("Error al consumir la API", error);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="p-8 bg-slate-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-4 text-slate-800">Fundamentos de React</h1>

      <div className="flex flex-col items-start gap-4 mb-6">
        <button
          onClick={obtenerDatos}
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition-all cursor-pointer font-medium"
        >
          {cargando ? 'Consultando API...' : 'Obtener Usuario'}
        </button>

        <button
          onClick={handleObtenerPokemon}
          className="bg-rose-500 text-white px-4 py-2 rounded shadow hover:bg-rose-600 transition-all cursor-pointer font-medium flex items-center justify-center gap-2"
        >
          <span>{cargandoPokemon ? 'Consultando API...' : 'Obtener Pokémon'}</span>
        </button>
      </div>

      {usuario && (
        <div className="mt-4">
          <TarjetaUsuario nombre={usuario.name} correo={usuario.email} telefono={usuario.phone} />
        </div>
      )}

      {mostrarPokemon && (
        <TarjetaPokemon onClose={() => setMostrarPokemon(false)} />
      )}
    </div>
  );
}
