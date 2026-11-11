import { useState } from 'react';

const capitalizeFirst = (value) => value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
const formatName = (value) => value.split('-').map(capitalizeFirst).join(' ');

// Aplana un árbol ramificado en rutas para mostrar cada evolución como una fila independiente.
const collectEvolutionPaths = (node, nodes = [], conditions = []) => {
  const pathNodes = [...nodes, node];
  if (!node.evolvesTo.length) return [{ nodes: pathNodes, conditions }];

  return node.evolvesTo.flatMap((evolution) => (
    collectEvolutionPaths(evolution.pokemon, pathNodes, [...conditions, evolution.conditions])
  ));
};

function EvolutionPath({ path, language, onSelectEvolution }) {
  return (
    <li className="evolution-path">
      {path.nodes.map((node, index) => (
        <div key={node.name} className="evolution-path-stage">
          <button
            type="button"
            onClick={() => onSelectEvolution(node.pokemonName || node.name)}
            title={language === 'es' ? `Ver datos de ${capitalizeFirst(node.displayName || node.pokemonName)}` : `View ${capitalizeFirst(node.displayName || node.pokemonName)} details`}
            className="flex flex-col items-center rounded-lg border border-transparent px-2 py-1 text-center hover:border-red-500 cursor-pointer"
          >
            {node.sprite && <img src={node.sprite} alt="" className="pokemon-sprite h-16 w-16" />}
            <strong className="text-sm">{capitalizeFirst(node.displayName || node.pokemonName)}</strong>
          </button>
          {index < path.nodes.length - 1 && (
            <div className="evolution-transition">
              <span className="evolution-condition text-xs text-slate-400">
                {path.conditions[index]?.length > 0
                  ? path.conditions[index].map((conditionSet) => conditionSet.join(' · ')).join(' / ')
                  : language === 'es' ? 'Condición especial' : 'Special condition'}
              </span>
              <span aria-hidden="true" className="text-red-400">→</span>
            </div>
          )}
        </div>
      ))}
    </li>
  );
}

export default function PokemonModal({ pokemon, onClose, onSelectForm, onSelectEvolution, isInCollection = false, collectionUpdating = false, onToggleCollection, language = 'es' }) {
  // Estado visual local de la forma shiny y del panel de habilidad expandido.
  const [isShiny, setIsShiny] = useState(false);
  const [expandedAbility, setExpandedAbility] = useState(null);

  if (!pokemon) return null;

  const text = language === 'es'
    ? {
        close: 'Cerrar detalles', normal: 'Mostrar forma normal', shiny: 'Mostrar forma variocolor',
        viewNormal: 'Ver forma normal', viewShiny: 'Ver forma variocolor', type: 'Tipo',
        addCollection: 'Agregar a mi colección', removeCollection: 'Quitar de mi colección', saving: 'Guardando…',
        height: 'Altura', weight: 'Peso', stats: 'Estadísticas básicas', abilities: 'Habilidades',
        ability: 'Habilidad', hiddenAbility: 'Habilidad oculta', gender: 'Porcentaje de sexo',
        genderless: 'Sin género', male: 'Macho', female: 'Hembra', generation: 'Generación',
        alternative: 'Forma alternativa', evolution: 'Cadena evolutiva', matchups: 'Relaciones de tipo', weaknesses: 'Débil contra',
        resistances: 'Resistente a', immunities: 'Inmune a', effectiveAgainst: 'Eficaz contra'
      }
    : {
        close: 'Close details', normal: 'Show normal form', shiny: 'Show shiny form',
        viewNormal: 'View normal form', viewShiny: 'View shiny form', type: 'Type',
        addCollection: 'Add to my collection', removeCollection: 'Remove from my collection', saving: 'Saving…',
        height: 'Height', weight: 'Weight', stats: 'Base stats', abilities: 'Abilities',
        ability: 'Ability', hiddenAbility: 'Hidden ability', gender: 'Gender ratio',
        genderless: 'Genderless', male: 'Male', female: 'Female', generation: 'Generation',
        alternative: 'Alternate form', evolution: 'Evolution chain', matchups: 'Type matchups', weaknesses: 'Weak to',
        resistances: 'Resistant to', immunities: 'Immune to', effectiveAgainst: 'Effective against'
      };
  const baseAbilityCount = pokemon.abilities?.filter((ability) => !(typeof ability === 'string') && !ability.isHidden).length || 0;
  let baseAbilityNumber = 0;

  const activeSprite = isShiny
    ? pokemon.shinySprite || pokemon.sprites
    : pokemon.sprites;

  const toggleShiny = () => {
    if (pokemon.shinySprite) setIsShiny((current) => !current);
  };

  return (
    <section className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-8 relative text-white shadow-xl" aria-label={`${language === 'es' ? 'Detalles de' : 'Details for'} ${pokemon.displayName || pokemon.name}`}>
        <button 
          onClick={onClose}
          aria-label={text.close}
          className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl font-bold cursor-pointer"
        >
          ✕
        </button>

        <div className="grid gap-6 md:grid-cols-[minmax(180px,0.7fr)_1.3fr] items-start">
          <div className="flex flex-col items-center border-b md:border-b-0 md:border-r border-slate-700 pb-4 md:pb-0 md:pr-6">
            <button
              type="button"
              onClick={toggleShiny}
              disabled={!pokemon.shinySprite}
              title={isShiny ? text.normal : text.shiny}
              aria-label={isShiny ? text.normal : text.shiny}
              className="rounded-full cursor-pointer disabled:cursor-default"
            >
              <img src={activeSprite} alt={capitalizeFirst(pokemon.displayName || pokemon.name)} className="pokemon-sprite w-32 h-32" />
            </button>
            {pokemon.spriteIsFallback && (
              <span className="mb-1 text-[10px] text-slate-400">
                {language === 'es' ? 'PokeAPI no ofrece imagen de esta forma; se muestra la base.' : 'No form sprite available; showing the base form.'}
              </span>
            )}
            <button
              type="button"
              onClick={toggleShiny}
              disabled={!pokemon.shinySprite}
              className="mb-2 text-xs text-red-300 underline underline-offset-2 disabled:text-slate-500 disabled:no-underline"
            >
              {isShiny ? text.viewNormal : text.viewShiny}
            </button>
            <span className="text-xs font-mono text-red-400">#{pokemon.id}</span>
            <h2 className="text-2xl font-bold mt-1">{pokemon.displayName || capitalizeFirst(pokemon.name)}</h2>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              <strong className="text-sm">{text.type}: </strong>
              {pokemon.types?.map((type) => (
                <img
                  key={type.name}
                  src={type.icon}
                  alt={type.name}
                  title={type.name}
                  className="h-7 w-auto max-w-24 object-contain"
                />
              ))}
            </div>
            {pokemon.alternatives?.length > 0 && (
              <div className="mt-5 w-full">
                <h4 className="text-xs uppercase text-slate-400 font-bold mb-2">{text.alternative}:</h4>
                <div className="flex flex-wrap justify-center gap-3">
                  {pokemon.alternatives.map((alternative) => {
                    const displayName = capitalizeFirst(alternative.displayName || formatName(alternative.name));
                    const fallbackNote = language === 'es' ? ' (imagen de la forma base)' : ' (base-form image)';
                    return (
                      <button
                        key={alternative.name}
                        type="button"
                        title={`${language === 'es' ? `Ver datos de ${displayName}` : `View ${displayName} details`}${alternative.spriteIsFallback ? fallbackNote : ''}`}
                        onClick={() => onSelectForm(alternative.name)}
                        className="flex flex-col items-center rounded-lg border border-slate-700 hover:border-red-500 p-2 cursor-pointer"
                      >
                        <img
                          src={alternative.sprites}
                          alt={alternative.spriteIsFallback ? `${displayName}${fallbackNote}` : displayName}
                          className="pokemon-sprite w-16 h-16"
                        />
                        <span className="max-w-24 text-[10px] text-slate-300">{displayName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => onToggleCollection(pokemon)}
              disabled={collectionUpdating}
              className="mt-4 rounded border border-white px-4 py-2 text-sm font-bold hover:bg-slate-700 disabled:opacity-60 cursor-pointer"
            >
              {collectionUpdating ? text.saving : isInCollection ? text.removeCollection : text.addCollection}
            </button>
          </div>

          <div>
            <div className="grid grid-cols-2 gap-4 text-sm mb-5 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
              <div>
                <strong className="text-slate-400 text-xs">{text.height}: </strong>
                <span className="font-semibold">{pokemon.height / 10} m</span>
              </div>
              <div>
                <strong className="text-slate-400 text-xs">{text.weight}: </strong>
                <span className="font-semibold">{pokemon.weight / 10} kg</span>
              </div>
            </div>

            <div className="mb-5">
              <h4 className="text-xs uppercase text-slate-400 font-bold mb-2">{text.stats}:</h4>
              <div className="space-y-2">
                {pokemon.stats?.map((stat) => (
                  <div key={stat.name} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-300"><strong>{capitalizeFirst(stat.name)}:</strong> {stat.value}</span>
                    <div className="w-1/2 bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-700">
                      <div 
                        className="bg-red-500 h-full rounded-full" 
                        style={{ width: `${Math.min(stat.value, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs uppercase text-slate-400 font-bold mb-2">{text.abilities}:</h4>
              <div className="flex flex-wrap gap-2">
                {pokemon.abilities?.map((ability) => {
                  const abilityData = typeof ability === 'string' ? { name: ability } : ability;
                  if (!abilityData.isHidden) baseAbilityNumber += 1;
                  const label = abilityData.isHidden
                    ? text.hiddenAbility
                    : baseAbilityCount > 1 ? `${text.ability} ${baseAbilityNumber}` : text.ability;
                  const effect = abilityData.effect || (language === 'es' ? 'Descripción no disponible.' : 'Description unavailable.');
                  const isExpanded = expandedAbility === abilityData.name;

                  return (
                    <button
                      key={abilityData.name}
                      type="button"
                      onClick={() => setExpandedAbility(isExpanded ? null : abilityData.name)}
                      aria-expanded={isExpanded}
                      className="bg-slate-900/70 border border-slate-700 rounded-lg px-3 py-2 text-left cursor-pointer hover:border-red-500"
                    >
                      <strong className="block text-[10px] text-slate-400">{label}:</strong>
                      <span className="text-sm font-semibold">{capitalizeFirst(abilityData.name)}</span>
                      {isExpanded && <span className="mt-2 block max-w-sm text-xs font-normal text-slate-300">{effect}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5">
              <h4 className="text-xs uppercase text-slate-400 font-bold mb-2">{text.gender}:</h4>
              {pokemon.gender?.genderless ? (
                <p className="text-sm"><strong>{text.genderless}</strong></p>
              ) : (
                <p className="text-sm">
                  <strong>{text.male}:</strong> {pokemon.gender?.male ?? 0}% <span className="mx-2 text-slate-500">|</span>
                  <strong>{text.female}:</strong> {pokemon.gender?.female ?? 0}%
                </p>
              )}
            </div>

            <p className="mt-4 text-sm"><strong>{text.generation}:</strong> {pokemon.generation}</p>

            {pokemon.typeMatchups && (
              <div className="mt-5 space-y-3">
                <h4 className="text-xs uppercase text-slate-400 font-bold">{text.matchups}:</h4>
                {[
                  ['weaknesses', text.weaknesses],
                  ['resistances', text.resistances],
                  ['immunities', text.immunities]
                ].map(([key, label]) => pokemon.typeMatchups[key]?.length > 0 && (
                  <div key={key} className="text-sm">
                    <strong>{label}:</strong>
                    <span className={`mt-2 flex w-full flex-wrap gap-2 ${pokemon.typeMatchups[key].length <= 5 ? 'justify-center' : 'justify-start'}`}>
                      {pokemon.typeMatchups[key].map((type) => (
                        <img
                          key={type.name}
                          src={type.icon}
                          alt={type.name}
                          title={`${type.name}${type.multiplier > 1 ? ` ×${type.multiplier}` : ''}`}
                          className="h-7 w-auto max-w-24 object-contain"
                        />
                      ))}
                    </span>
                  </div>
                ))}
                {pokemon.typeMatchups.effectiveAgainst?.length > 0 && (
                  <div className="text-sm">
                    <strong>{text.effectiveAgainst}:</strong>
                    <span className={`mt-2 flex w-full flex-wrap gap-2 ${pokemon.typeMatchups.effectiveAgainst.length <= 5 ? 'justify-center' : 'justify-start'}`}>
                      {pokemon.typeMatchups.effectiveAgainst.map((type) => (
                        <img
                          key={type.name}
                          src={type.icon}
                          alt={type.name}
                          title={type.name}
                          className="h-7 w-auto max-w-24 object-contain"
                        />
                      ))}
                    </span>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
        {pokemon.evolutionChain && (
          <div className="evolution-section mt-6 border-t border-slate-700 pt-5">
            <h4 className="text-xs uppercase text-slate-400 font-bold mb-3">{text.evolution}:</h4>
            <ul className="evolution-tree">
              {collectEvolutionPaths(pokemon.evolutionChain).map((path) => (
                <EvolutionPath
                  key={path.nodes.map((node) => node.name).join('-')}
                  path={path}
                  language={language}
                  onSelectEvolution={onSelectEvolution}
                />
              ))}
            </ul>
          </div>
        )}
    </section>
  );
}