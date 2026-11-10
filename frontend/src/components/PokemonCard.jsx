const typeColors = {
  normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C',
  grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1',
  ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A',
  rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705746',
  steel: '#B7B7CE', fairy: '#D685AD'
};

export default function PokemonCard({ pokemon, onSelect, displayName, highlighted }) {
  const colors = (pokemon.types || []).slice(0, 2).map((type) => typeColors[type] || '#475569');
  const backgroundStyle = colors.length > 1
    ? { backgroundImage: `linear-gradient(135deg, ${colors[0]} 0%, ${colors[0]} 50%, ${colors[1]} 50%, ${colors[1]} 100%)` }
    : { backgroundColor: colors[0] || '#1e293b' };

  return (
    <div 
      onClick={() => onSelect(pokemon.name)}
      style={backgroundStyle}
      className={`border ${highlighted ? 'border-red-500 ring-2 ring-red-500/40' : 'border-white/30'} hover:border-white rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition transform hover:-translate-y-1 shadow-lg group`}
    >
      <div className="w-24 h-24 bg-slate-900/50 rounded-full flex items-center justify-center mb-3 group-hover:scale-105 transition">
        {pokemon.sprites ? (
          <img src={pokemon.sprites} alt={pokemon.name} className="pokemon-sprite w-20 h-20" />
        ) : (
          <span className="text-4xl">❓</span>
        )}
      </div>
      <span className="text-xs text-white font-mono font-bold drop-shadow">#{pokemon.id || '---'}</span>
      <h3 className="text-lg font-bold capitalize text-white group-hover:text-red-400 transition">
        {displayName || pokemon.displayName || pokemon.name}
      </h3>
    </div>
  );
}