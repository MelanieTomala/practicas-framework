import { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

interface PokemonData {
  name: string;
  image: string;
  stats: { name: string; value: number }[];
  types: string[];
}

interface TarjetaPokemonProps {
  onClose: () => void;
}

const typeTranslations: Record<string, string> = {
  normal: 'normal',
  fighting: 'lucha',
  flying: 'volador',
  poison: 'veneno',
  ground: 'tierra',
  rock: 'roca',
  bug: 'bicho',
  ghost: 'fantasma',
  steel: 'acero',
  fire: 'fuego',
  water: 'agua',
  grass: 'planta',
  electric: 'eléctrico',
  psychic: 'psíquico',
  ice: 'hielo',
  dragon: 'dragón',
  dark: 'siniestro',
  fairy: 'hada',
  unknown: 'desconocido',
  shadow: 'sombra'
};

const statTranslations: Record<string, string> = {
  hp: 'vida',
  attack: 'ataque',
  defense: 'defensa',
  'special-attack': 'ataque esp.',
  'special-defense': 'defensa esp.',
  speed: 'velocidad'
};

const getStatColor = (value: number) => {
  if (value < 50) return 'bg-red-500';
  if (value < 80) return 'bg-orange-500';
  if (value < 110) return 'bg-green-400';
  return 'bg-green-600';
};

export default function TarjetaPokemon({ onClose }: TarjetaPokemonProps) {
  const [pokemon, setPokemon] = useState<PokemonData | null>(null);
  const [query, setQuery] = useState('');
  const [allPokemons, setAllPokemons] = useState<{ name: string, url: string }[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Nuevos estados para la clasificación por tipos
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [pokemonTypeMap, setPokemonTypeMap] = useState<Record<string, string[]>>({});
  const [loadingData, setLoadingData] = useState(true);

  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoadingData(true);
        // Cargar nombres de todos los pokémons
        const resNames = await fetch('https://pokeapi.co/api/v2/pokemon?limit=10000');
        const dataNames = await resNames.json();
        setAllPokemons(dataNames.results);

        // Cargar datos de todos los tipos para el mapa (excepto desconocido y sombra que no suelen tener)
        const typeNames = Object.keys(typeTranslations).filter(t => t !== 'unknown' && t !== 'shadow');
        const promises = typeNames.map(t => fetch(`https://pokeapi.co/api/v2/type/${t}`).then(res => res.json()));
        const results = await Promise.all(promises);

        const map: Record<string, string[]> = {};
        results.forEach(typeData => {
          const tName = typeData.name;
          typeData.pokemon.forEach((p: any) => {
            const pName = p.pokemon.name;
            if (!map[pName]) map[pName] = [];
            map[pName].push(tName);
          });
        });
        setPokemonTypeMap(map);
      } catch (err) {
        console.error("Error al cargar datos iniciales:", err);
      } finally {
        setLoadingData(false);
      }
    };

    loadInitialData();
    fetchPokemon('pikachu');
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (value.trim().length > 0) {
      const filtered = allPokemons
        .filter(p => p.name.toLowerCase().includes(value.toLowerCase()))
        .map(p => p.name)
        .slice(0, 6); // show up to 6 suggestions
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (name: string) => {
    setQuery(name);
    setShowSuggestions(false);
    fetchPokemon(name);
  };

  const fetchPokemon = async (name: string) => {
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    setShowSuggestions(false);

    try {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name.toLowerCase()}`);
      if (!res.ok) throw new Error('Pokémon no encontrado');
      const data = await res.json();

      setPokemon({
        name: data.name,
        image: data.sprites.other['official-artwork'].front_default || data.sprites.front_default,
        stats: data.stats.map((s: any) => ({
          name: statTranslations[s.stat.name] || s.stat.name,
          value: s.base_stat
        })),
        types: data.types.map((t: any) => typeTranslations[t.type.name] || t.type.name)
      });
    } catch (err: any) {
      setError(err.message);
      setPokemon(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      fetchPokemon(query);
    }
  };

  const getFilteredPokemonsList = () => {
    if (selectedCategory === 'todos') {
      return allPokemons.map(p => p.name).slice(0, 400); // Límite para no renderizar 10,000 nodos
    }
    if (selectedCategory === 'híbridos') {
      return Object.keys(pokemonTypeMap).filter(p => pokemonTypeMap[p].length > 1).slice(0, 400);
    }

    // Tipo específico
    const englishType = Object.keys(typeTranslations).find(k => typeTranslations[k] === selectedCategory);
    if (englishType) {
      return Object.keys(pokemonTypeMap).filter(p => pokemonTypeMap[p].includes(englishType)).slice(0, 400);
    }
    return [];
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[650px] overflow-hidden relative flex flex-col md:flex-row">

        {/* Left Sidebar - Dropdown and List */}
        <div className="w-full md:w-1/3 min-w-[250px] bg-slate-50 border-r border-slate-100 flex flex-col h-1/3 md:h-full">
          <div className="p-4 border-b border-slate-100 bg-white">
            <h3 className="font-bold text-slate-700 mb-2">Clasificación por tipo</h3>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 capitalize cursor-pointer font-medium shadow-sm"
            >
              <option value="todos">Todos</option>
              {Object.values(typeTranslations).filter(t => t !== 'desconocido' && t !== 'sombra').map(t => (
                <option key={t} value={t} className="capitalize">{t}</option>
              ))}
              <option value="híbridos">Híbridos (Múltiples tipos)</option>
            </select>
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1 custom-scrollbar">
            {loadingData ? (
              <div className="text-center text-slate-400 py-10 flex flex-col items-center gap-2">
                <Loader2 className="animate-spin" size={24} />
                <span className="text-sm font-medium animate-pulse">Cargando catálogo...</span>
              </div>
            ) : (
              getFilteredPokemonsList().map(name => (
                <button
                  key={name}
                  onClick={() => fetchPokemon(name)}
                  className={`text-left px-3 py-2 rounded-lg capitalize transition-colors text-sm font-medium ${pokemon?.name === name ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-200 text-slate-600'}`}
                >
                  {name.replace('-', ' ')}
                </button>
              ))
            )}

            {!loadingData && getFilteredPokemonsList().length === 0 && (
              <div className="text-center text-slate-400 py-10 text-sm">
                No se encontraron Pokémon.
              </div>
            )}
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col relative bg-white h-2/3 md:h-full">
          {/* Header with Close Button */}
          <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-xl font-bold text-slate-800">Pokédex</h2>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-4 bg-white z-50 relative" ref={wrapperRef}>
            <div className="relative shadow-sm rounded-xl">
              <input
                type="text"
                value={query}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                onFocus={() => query.trim().length > 0 && setShowSuggestions(true)}
                placeholder="Buscar Pokémon (ej. charizard)..."
                className="w-full pl-10 pr-24 py-3 bg-slate-100 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400 text-slate-700"
              />
              <Search className="absolute left-3 top-3.5 text-slate-400" size={20} />

              <button
                onClick={() => fetchPokemon(query)}
                className="absolute right-2 top-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                Buscar
              </button>
            </div>

            {/* Autocomplete Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-20 left-4 right-4 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                {suggestions.map((sug) => (
                  <button
                    key={sug}
                    onClick={() => handleSelectSuggestion(sug)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 text-slate-700 capitalize transition-colors border-b border-slate-50 last:border-0 cursor-pointer"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details Area */}
          <div className="p-6 bg-slate-100 flex-1 flex flex-col items-center overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center text-blue-500 gap-3 my-auto py-8">
                <Loader2 className="animate-spin" size={32} />
                <p className="text-sm font-medium animate-pulse">Buscando Pokémon...</p>
              </div>
            ) : error ? (
              <div className="text-center text-rose-500 bg-rose-50 p-6 rounded-2xl border border-rose-100 max-w-xs my-auto">
                <p className="font-semibold text-lg">{error}</p>
                <p className="text-sm mt-2 text-rose-400">Intenta con otro nombre o verifica tu conexión.</p>
              </div>
            ) : pokemon ? (
              <div className="w-full max-w-sm mx-auto my-auto flex flex-col items-center animate-in zoom-in-95 duration-500 z-10 relative">
                {/* Contorno de carta coleccionable - color más sólido para que se vea claramente en los 4 lados */}
                <div className="relative w-full rounded-2xl p-3 bg-gradient-to-br from-yellow-400 via-amber-400 to-yellow-500 border border-yellow-500/40 shadow-[0_10px_40px_rgba(0,0,0,0.1)] group hover:shadow-[0_15px_50px_rgba(0,0,0,0.15)] transition-all duration-500 hover:-translate-y-2">

                  {/* Brillo holográfico al hacer hover */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/70 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 transform -translate-x-full group-hover:translate-x-full z-20 pointer-events-none rounded-2xl" style={{ transitionDuration: '1.5s' }}></div>

                  {/* Contenido Interno (Idéntico al original) */}
                  <div className="bg-slate-50 w-full rounded-xl p-6 relative overflow-hidden flex flex-col items-center shadow-inner">
                    <div className="relative w-48 h-48 mb-6 drop-shadow-xl">
                      <div className="absolute inset-0 bg-blue-200/50 rounded-full blur-3xl -z-10"></div>
                      <img
                        src={pokemon.image}
                        alt={pokemon.name}
                        className="w-full h-full object-contain hover:scale-110 transition-transform duration-300"
                      />
                    </div>

                    <h3 className="text-3xl font-bold text-slate-800 capitalize mb-2">{pokemon.name}</h3>

                    <div className="flex gap-2 mb-6">
                      {pokemon.types.map(t => (
                        <span key={t} className="px-4 py-1 bg-white shadow-sm border border-slate-200 text-slate-700 text-xs font-bold uppercase rounded-full tracking-wider">
                          {t}
                        </span>
                      ))}
                    </div>

                    <div className="w-full space-y-3 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Estadísticas Base</h4>
                      {pokemon.stats.map(stat => (
                        <div key={stat.name} className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-slate-600 capitalize w-24 truncate">
                            {stat.name.replace('-', ' ')}
                          </span>
                          <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                            <div
                              className={`h-full ${getStatColor(stat.value)} rounded-full transition-all duration-1000 ease-out`}
                              style={{ width: `${Math.min((stat.value / 255) * 100, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-bold text-slate-700 w-8 text-right">
                            {stat.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-400 flex flex-col items-center my-auto py-8">
                <Search size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-medium text-lg text-slate-500">Busca o selecciona un Pokémon</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
