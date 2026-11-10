import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import PokemonCard from '../components/PokemonCard';
import PokemonModal from '../components/PokemonModal';
import pokedexIcon from '../assets/pokedexIcon.png';

const generationOrder = [
  'generation-i', 'generation-ii', 'generation-iii', 'generation-iv', 'generation-v',
  'generation-vi', 'generation-vii', 'generation-viii', 'generation-ix'
];

export default function Dashboard({ user, onLogout }) {
  const [pokemons, setPokemons] = useState([]);
  const [collection, setCollection] = useState([]);
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ types: [], abilities: [], generations: [] });
  const [typeFilter, setTypeFilter] = useState('');
  const [abilityFilter, setAbilityFilter] = useState('');
  const [generationFilter, setGenerationFilter] = useState('');
  const [language] = useState(() => localStorage.getItem('pokedex-language') === 'en' ? 'en' : 'es');
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [showCollection, setShowCollection] = useState(false);
  const [loading, setLoading] = useState(false);
  const [collectionUpdating, setCollectionUpdating] = useState(false);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  
  const [offset, setOffset] = useState(0);
  const [pageInput, setPageInput] = useState('1');
  const pokemonListRef = useRef(null);
  const limit = 10;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const text = language === 'es'
    ? {
        hello: 'Hola,', logout: 'Cerrar sesión', searchPlaceholder: 'Buscar Pokémon por nombre...', search: 'Buscar',
        type: 'Tipo', allTypes: 'Todos los tipos', ability: 'Habilidad', allAbilities: 'Todas las habilidades',
        generation: 'Generación', allGenerations: 'Todas las generaciones', language: 'Idioma',
        loading: 'Cargando Pokémon...', noResults: 'No hay Pokémon que coincidan con esos filtros.',
        first: 'Primera', previous: '◀ Anterior', next: 'Siguiente ▶', last: 'Última', page: 'Página', go: 'Ir',
        showing: 'Mostrando', of: 'de', listError: 'Error al obtener la lista de Pokémon',
        filterError: 'No se pudieron cargar las sugerencias y filtros', notFound: 'Pokémon no encontrado',
        detailError: 'No se pudieron cargar los detalles', collection: 'Mi colección',
        browse: 'Explorar Pokémon', collectionEmpty: 'Aún no has agregado Pokémon a tu colección.',
        addCollection: 'No se pudo agregar el Pokémon', removeCollection: 'No se pudo quitar el Pokémon'
      }
    : {
        hello: 'Hello,', logout: 'Log out', searchPlaceholder: 'Search Pokémon by name...', search: 'Search',
        type: 'Type', allTypes: 'All types', ability: 'Ability', allAbilities: 'All abilities',
        generation: 'Generation', allGenerations: 'All generations', language: 'Language',
        loading: 'Loading Pokémon...', noResults: 'No Pokémon match those filters.',
        first: 'First', previous: '◀ Previous', next: 'Next ▶', last: 'Last', page: 'Page', go: 'Go',
        showing: 'Showing', of: 'of', listError: 'Could not load the Pokémon list',
        filterError: 'Could not load suggestions and filters', notFound: 'Pokémon not found',
        detailError: 'Could not load Pokémon details', collection: 'My collection',
        browse: 'Browse Pokémon', collectionEmpty: 'You have not added Pokémon to your collection yet.',
        addCollection: 'Could not add Pokémon', removeCollection: 'Could not remove Pokémon'
      };

  useEffect(() => {
    let cancelled = false;

    const fetchPokemons = async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
        if (typeFilter) params.set('type', typeFilter);
        if (abilityFilter) params.set('ability', abilityFilter);
        if (generationFilter) params.set('generation', generationFilter);
        params.set('lang', language);
        const response = await api.get(`/api/pokemon?${params.toString()}`);
        if (cancelled) return;

        const basicList = response.data.results.map((pokemon, index) => {
          const id = Number(pokemon.url?.split('/').filter(Boolean).pop()) || offset + index + 1;
          return {
            name: pokemon.name,
            displayName: pokemon.displayName || pokemon.name,
            id,
            types: pokemon.types || [],
            sprites: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
          };
        });
        setPokemons(basicList);
        setTotal(response.data.count ?? offset + basicList.length);
      } catch {
        if (!cancelled) setError(language === 'es' ? 'Error al obtener la lista de Pokémon' : 'Could not load the Pokémon list');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPokemons();
    return () => { cancelled = true; };
  }, [offset, typeFilter, abilityFilter, generationFilter, language]);

  useEffect(() => {
    let cancelled = false;

    const loadSearchAndFilterOptions = async () => {
      try {
        const [pokemonResponse, filtersResponse] = await Promise.all([
          api.get('/api/pokemon?limit=2000&offset=0'),
          api.get(`/api/pokemon/filters?lang=${language}`)
        ]);
        if (cancelled) return;
        setSuggestions(pokemonResponse.data.results.map((pokemon) => pokemon.name));
        const sortOptions = (options) => [...options]
          .sort((first, second) => first.label.localeCompare(second.label, language))
          .map((option) => ({ ...option, label: option.label.charAt(0).toLocaleUpperCase(language) + option.label.slice(1) }));
        setFilterOptions({
          types: sortOptions(filtersResponse.data.types),
          abilities: sortOptions(filtersResponse.data.abilities),
          generations: [...filtersResponse.data.generations]
            .sort((first, second) => generationOrder.indexOf(first.name) - generationOrder.indexOf(second.name))
            .map((option) => ({
              ...option,
              label: option.label.charAt(0).toLocaleUpperCase(language) + option.label.slice(1)
            }))
        });
      } catch {
        if (!cancelled) setError(language === 'es' ? 'No se pudieron cargar las sugerencias y filtros' : 'Could not load suggestions and filters');
      }
    };

    loadSearchAndFilterOptions();
    return () => { cancelled = true; };
  }, [language]);

  useEffect(() => {
    let cancelled = false;
    api.get(`/api/pokemon/collection?lang=${language}`)
      .then(({ data }) => { if (!cancelled) setCollection(data.results); })
      .catch(() => { if (!cancelled) setError(language === 'es' ? 'No se pudo cargar tu colección' : 'Could not load your collection'); });
    return () => { cancelled = true; };
  }, [language]);

  const handleSelectPokemon = async (nameOrId, selectedLanguage = language) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ name: nameOrId, lang: selectedLanguage });
      const response = await api.get(`/api/pokemon/search?${params.toString()}`);
      const pokemon = response.data;
      const pokemonIndex = suggestions.indexOf(pokemon.name);
      const targetPage = pokemonIndex < 0 ? 1 : Math.floor(pokemonIndex / limit) + 1;
      setSelectedPokemon(pokemon);
      setSearch('');
      setTypeFilter('');
      setAbilityFilter('');
      setGenerationFilter('');
      setOffset((targetPage - 1) * limit);
      setPageInput(String(targetPage));
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    } catch {
      setError(text.detailError);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    if (!search.trim()) {
      setSelectedPokemon(null);
      return;
    }
    await handleSelectPokemon(search.trim().toLowerCase());
  };

  const handleLanguageChange = (event) => {
    localStorage.setItem('pokedex-language', event.target.value);
    window.location.reload();
  };

  const handleToggleCollection = async (pokemon) => {
    const alreadySaved = collection.some((entry) => entry.id === pokemon.id);
    setCollectionUpdating(true);
    setError('');
    try {
      if (alreadySaved) {
        await api.delete(`/api/pokemon/collection/${pokemon.id}`);
      } else {
        await api.post('/api/pokemon/collection', { pokemonId: pokemon.id });
      }
      const { data } = await api.get(`/api/pokemon/collection?lang=${language}`);
      setCollection(data.results);
    } catch {
      setError(alreadySaved ? text.removeCollection : text.addCollection);
    } finally {
      setCollectionUpdating(false);
    }
  };

  const goToPage = (page) => {
    const targetPage = Math.min(Math.max(page, 1), totalPages);
    setPageInput(String(targetPage));
    setOffset((targetPage - 1) * limit);
  };

  const handlePageSubmit = (event) => {
    event.preventDefault();
    const requestedPage = Number.parseInt(pageInput, 10);
    goToPage(Number.isNaN(requestedPage) ? 1 : requestedPage);
  };

  return (
    <div className="pokedex-background min-h-screen text-white pb-12">
      <header className="bg-slate-800 border-b border-slate-700 py-4 px-6 flex justify-between items-center gap-6 sticky top-0 z-40">
        <h1 className="text-xl font-bold text-red-500 flex items-center gap-2 m-0">
          <img src={pokedexIcon} alt="" className="h-9 w-11 object-contain" />
          PokéDex App
        </h1>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-sm text-slate-300 whitespace-nowrap">{text.hello} <strong className="text-white">{user?.name}</strong></span>
          <button 
            onClick={onLogout}
            className="bg-slate-700 hover:bg-red-600 transition text-xs px-3 py-2 rounded-lg border border-white font-semibold cursor-pointer whitespace-nowrap"
          >
            {text.logout}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 mt-8">
        <form onSubmit={handleSearch} className="flex gap-2 mb-8">
          <input 
            type="text" 
            placeholder={text.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            list="pokemon-suggestions"
            className="search-input flex-1 p-3 rounded-xl bg-slate-800 border border-white text-white focus:outline-none focus:border-red-500"
          />
          <datalist id="pokemon-suggestions">
            {suggestions.map((name) => <option key={name} value={name.charAt(0).toLocaleUpperCase(language) + name.slice(1)} />)}
          </datalist>
          <button type="submit" className="bg-red-600 hover:bg-red-700 px-6 rounded-xl font-bold transition cursor-pointer">
            {text.search}
          </button>
        </form>

        <div className="search-filters grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <label className="flex flex-col gap-2 text-xs text-slate-400">
            {text.type}
            <select
              value={typeFilter}
              onChange={(event) => { setTypeFilter(event.target.value); goToPage(1); }}
              className="search-filter w-full p-3 rounded-xl bg-slate-800 border border-white text-white focus:outline-none focus:border-red-500"
            >
              <option value="">{text.allTypes}</option>
              {filterOptions.types.map((type) => <option key={type.name} value={type.name}>{type.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-xs text-slate-400">
            {text.ability}
            <select
              value={abilityFilter}
              onChange={(event) => { setAbilityFilter(event.target.value); goToPage(1); }}
              className="search-filter w-full p-3 rounded-xl bg-slate-800 border border-white text-white focus:outline-none focus:border-red-500"
            >
              <option value="">{text.allAbilities}</option>
              {filterOptions.abilities.map((ability) => <option key={ability.name} value={ability.name}>{ability.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-xs text-slate-400">
            {text.generation}
            <select
              value={generationFilter}
              onChange={(event) => { setGenerationFilter(event.target.value); goToPage(1); }}
              className="search-filter w-full p-3 rounded-xl bg-slate-800 border border-white text-white focus:outline-none focus:border-red-500"
            >
              <option value="">{text.allGenerations}</option>
              {filterOptions.generations.map((generation) => <option key={generation.name} value={generation.name}>{generation.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-xs text-slate-400">
            {text.language}
            <select
              value={language}
              onChange={handleLanguageChange}
              className="search-filter w-full p-3 rounded-xl bg-slate-800 border border-white text-white focus:outline-none focus:border-red-500"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </label>
        </div>

        <div className="flex justify-end mb-5">
          <button
            type="button"
            onClick={() => setShowCollection((current) => !current)}
            className="rounded border border-white px-4 py-2 text-sm font-bold hover:bg-slate-700 cursor-pointer"
          >
            {showCollection ? text.browse : `${text.collection} (${collection.length})`}
          </button>
        </div>

        <PokemonModal
          key={selectedPokemon?.id}
          pokemon={selectedPokemon}
          language={language}
          onClose={() => setSelectedPokemon(null)}
          onSelectForm={(name) => handleSelectPokemon(name)}
          onSelectEvolution={(name) => handleSelectPokemon(name)}
          isInCollection={collection.some((entry) => entry.id === selectedPokemon?.id)}
          collectionUpdating={collectionUpdating}
          onToggleCollection={handleToggleCollection}
        />

        {error && <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-4 rounded-xl mb-6 text-center">{error}</div>}

        {loading ? (
          <div className="text-center py-12 text-slate-400 animate-pulse">{text.loading}</div>
        ) : (
          <div ref={pokemonListRef} className="pokemon-grid">
            {(showCollection ? collection : pokemons).map((pokemon) => (
              <PokemonCard key={pokemon.name} pokemon={pokemon} displayName={pokemon.displayName} onSelect={handleSelectPokemon} />
            ))}
          </div>
        )}

        {!loading && (showCollection ? collection.length : pokemons.length) === 0 && !error && (
          <p className="text-center py-10 text-slate-400">{showCollection ? text.collectionEmpty : text.noResults}</p>
        )}

        {!showCollection && <div className="pagination-controls mt-8 bg-slate-800 border border-slate-700 p-4 rounded-xl">
          <button 
            disabled={offset === 0}
            onClick={() => goToPage(1)}
            className="border border-white bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-sm px-4 py-2 rounded-lg font-bold cursor-pointer"
          >
            {text.first}
          </button>
          <button 
            disabled={offset === 0}
            onClick={() => goToPage(Math.floor(offset / limit))}
            className="border border-white bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-sm px-4 py-2 rounded-lg font-bold cursor-pointer"
          >
            {text.previous}
          </button>
          <form onSubmit={handlePageSubmit} className="flex flex-shrink-0 items-center gap-2 text-xs text-slate-300">
            <label htmlFor="page-number">{text.page}</label>
            <input
              id="page-number"
              type="number"
              min="1"
              max={totalPages}
              value={pageInput}
              onChange={(event) => setPageInput(event.target.value)}
              className="w-16 p-2 rounded bg-slate-900 border border-slate-600 text-white text-center"
            />
            <span>de {totalPages}</span>
            <button type="submit" className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded font-bold cursor-pointer">
              {text.go}
            </button>
          </form>
          <button 
            disabled={offset + limit >= total}
            onClick={() => goToPage(Math.floor(offset / limit) + 2)}
            className="border border-white bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-sm px-4 py-2 rounded-lg font-bold cursor-pointer"
          >
            {text.next}
          </button>
          <button 
            disabled={offset + limit >= total}
            onClick={() => goToPage(totalPages)}
            className="border border-white bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-sm px-4 py-2 rounded-lg font-bold cursor-pointer"
          >
            {text.last}
          </button>
        </div>}
        {!showCollection && <p className="text-xs text-slate-400 text-center mt-2">
          {text.showing} {total ? offset + 1 : 0} - {Math.min(offset + limit, total)} {text.of} {total}
        </p>}
      </main>

    </div>
  );
}