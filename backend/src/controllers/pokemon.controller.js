const axios = require('axios');

// Endpoint upstream único para que los controladores no dupliquen la URL de PokéAPI.
const POKEE_API_BASE = 'https://pokeapi.co/api/v2';
// Reutiliza promesas de recursos durante este proceso y evita descargas simultáneas duplicadas.
const localizedResourceCache = new Map();
// Relaciona cada variante regional con la generación y los juegos que habilitan sus evoluciones exclusivas.
const regionalEvolutionRules = {
  alola: { generation: 'generation-vii', versionGroups: ['sun-moon', 'ultra-sun-ultra-moon'] },
  galar: { generation: 'generation-viii', versionGroups: ['sword-shield', 'the-isle-of-armor', 'the-crown-tundra'] },
  hisui: { generation: 'generation-viii', versionGroups: ['legends-arceus'] },
  paldea: { generation: 'generation-ix', versionGroups: ['scarlet-violet'] }
};
// Prefiere los iconos actuales de tipos y conserva compatibilidad con los recursos de Sword/Shield.
const getTypeIcon = (typeData) => (
  typeData.sprites?.['generation-ix']?.['scarlet-violet']?.name_icon
  || typeData.sprites?.['generation-viii']?.['sword-shield']?.name_icon
  || null
);

const getLocalizedResource = async (url, language) => {
  // El idioma forma parte de la clave porque un mismo recurso puede tener varias etiquetas.
  const cacheKey = `${url}:${language}`;
  if (!localizedResourceCache.has(cacheKey)) {
    // Guarda también la solicitud en curso para que peticiones paralelas compartan el mismo resultado.
    localizedResourceCache.set(cacheKey, axios.get(url).then(({ data }) => data));
  }

  try {
    return await localizedResourceCache.get(cacheKey);
  } catch (error) {
    // Permite reintentar solicitudes fallidas en lugar de conservar un rechazo en caché.
    localizedResourceCache.delete(cacheKey);
    throw error;
  }
};

// Usa español regional antes del inglés cuando PokéAPI no incluye una traducción exacta para el idioma pedido.
const getLocalizedName = (names = [], language, fallback) => (
  names.find(({ language: entryLanguage }) => entryLanguage.name === language)?.name
  || (language === 'es' && names.find(({ language: entryLanguage }) => entryLanguage.name === 'es-419')?.name)
  || names.find(({ language: entryLanguage }) => entryLanguage.name === 'en')?.name
  || fallback
);

const getAbilityName = (abilityData, language, fallback) => {
  if (language === 'es' && abilityData.name === 'keen-eye') return 'Ojo Mental';
  return getLocalizedName(abilityData.names, language, fallback);
};

// Convierte cada detalle de evolución de PokéAPI en condiciones legibles para la ficha.
const getEvolutionConditions = async (details, language, regionalSuffix) => {
  // Las etiquetas se mantienen en el backend para enviar condiciones listas para presentar.
  const labels = language === 'es'
    ? {
        level: 'Nivel', item: 'Usar objeto', heldItem: 'Llevar objeto', trade: 'Intercambiar',
        tradeFor: 'Intercambiar por', happiness: 'Amistad mínima', beauty: 'Belleza mínima',
        affection: 'Afecto mínimo', time: 'Momento', gender: 'Sexo', move: 'Conocer movimiento',
        moveType: 'Conocer movimiento de tipo', location: 'Ubicación', partySpecies: 'Tener en el equipo',
        partyType: 'Tener en el equipo un Pokémon de tipo', physicalStats: 'Relación de estadísticas físicas',
        rain: 'Con lluvia', upsideDown: 'Consola invertida', multiplayer: 'Multijugador',
        trigger: { 'level-up': 'Subir de nivel', trade: 'Intercambio', 'use-item': 'Usar objeto',
          shed: 'Dejar un espacio libre en el equipo', spin: 'Girar con un objeto equipado',
          'tower-of-darkness': 'Completar la Torre de la Oscuridad', 'tower-of-waters': 'Completar la Torre de las Aguas' },
        times: { day: 'Día', night: 'Noche', dusk: 'Atardecer' },
        genders: { 1: 'Hembra', 2: 'Macho' }, physical: { '-1': 'Ataque menor que Defensa', 0: 'Ataque igual a Defensa', 1: 'Ataque mayor que Defensa' }
      }
    : {
        level: 'Level', item: 'Use item', heldItem: 'Hold item', trade: 'Trade', tradeFor: 'Trade for',
        happiness: 'Minimum friendship', beauty: 'Minimum beauty', affection: 'Minimum affection',
        time: 'Time', gender: 'Gender', move: 'Know move', moveType: 'Know a move of type',
        location: 'Location', partySpecies: 'Have in party', partyType: 'Have a Pokémon of type in party',
        physicalStats: 'Physical stat relation', rain: 'During rain', upsideDown: 'Console upside down',
        multiplayer: 'Multiplayer',
        trigger: { 'level-up': 'Level up', trade: 'Trade', 'use-item': 'Use item', shed: 'Shed',
          spin: 'Spin while holding an item', 'tower-of-darkness': 'Complete the Tower of Darkness',
          'tower-of-waters': 'Complete the Tower of Waters' },
        times: { day: 'Day', night: 'Night', dusk: 'Dusk' },
        genders: { 1: 'Female', 2: 'Male' }, physical: { '-1': 'Attack lower than Defense', 0: 'Attack equal to Defense', 1: 'Attack higher than Defense' }
      };

  // PokéAPI mezcla requisitos de varios juegos dentro de la misma transición evolutiva.
  const galarConditions = details.filter(({ item }) => item?.name.startsWith('galarica-'));
  // Las condiciones galarica no deben aparecer en la evolución de la forma de Kanto.
  const relevantDetails = galarConditions.length > 0
    ? regionalSuffix === 'galar' ? galarConditions : details.filter(({ item }) => !item?.name.startsWith('galarica-'))
    : details;
  const formattedConditions = await Promise.all(relevantDetails.map(async (detail) => {
    const conditions = [];
    const addResourceCondition = async (property, label, resource = detail[property]) => {
      if (!resource) return;
      const localizedResource = await getLocalizedResource(resource.url, language);
      conditions.push(`${label}: ${getLocalizedName(localizedResource.names, language, resource.name.replaceAll('-', ' '))}`);
    };

    if (detail.trigger?.name && !(detail.trigger.name === 'use-item' && detail.item)) {
      conditions.push(labels.trigger[detail.trigger.name] || detail.trigger.name.replaceAll('-', ' '));
    }
    if (detail.min_level) conditions.push(`${labels.level} ${detail.min_level}`);
    if (detail.gender) conditions.push(labels.genders[detail.gender] || `${labels.gender} ${detail.gender}`);
    if (detail.min_happiness) conditions.push(`${labels.happiness}: ${detail.min_happiness}`);
    if (detail.min_beauty) conditions.push(`${labels.beauty}: ${detail.min_beauty}`);
    if (detail.min_affection) conditions.push(`${labels.affection}: ${detail.min_affection}`);
    if (detail.time_of_day) conditions.push(`${labels.time}: ${labels.times[detail.time_of_day] || detail.time_of_day}`);
    if (detail.relative_physical_stats !== null) {
      conditions.push(labels.physical[detail.relative_physical_stats] || `${labels.physicalStats}: ${detail.relative_physical_stats}`);
    }
    if (detail.needs_overworld_rain) conditions.push(labels.rain);
    if (detail.turn_upside_down) conditions.push(labels.upsideDown);
    if (detail.needs_multiplayer) conditions.push(labels.multiplayer);

    await Promise.all([
      addResourceCondition('item', labels.item),
      addResourceCondition('held_item', labels.heldItem),
      addResourceCondition('trade_species', labels.tradeFor),
      addResourceCondition('known_move', labels.move),
      addResourceCondition('known_move_type', labels.moveType),
      addResourceCondition('location', labels.location),
      addResourceCondition('party_species', labels.partySpecies),
      addResourceCondition('party_type', labels.partyType)
    ]);

    return [...new Set(conditions)];
  }));

  return [...new Map(formattedConditions.map((conditions) => [conditions.join('|'), conditions])).values()];
};

const getRegionalEvolutionSuffix = (sourceSpecies, targetSpecies, details) => {
  // La fuente debe tener esa variedad y la transición pertenecer a la generación y juegos regionales.
  for (const [suffix, rule] of Object.entries(regionalEvolutionRules)) {
    const hasRegionalSource = sourceSpecies.varieties.some(({ pokemon }) => pokemon.name === `${sourceSpecies.name}-${suffix}`);
    const targetWasIntroducedInRegion = targetSpecies.generation.name === rule.generation;
    const detailsAreRegionSpecific = details.length > 0
      && details.every(({ version_group }) => rule.versionGroups.includes(version_group?.name));

    if (hasRegionalSource && targetWasIntroducedInRegion && detailsAreRegionSpecific) return suffix;
  }
  return null;
};

// Proyecta la cadena de especies sobre sus variedades elegibles sin insertar Mega/Gigamax como evoluciones.
const getEvolutionChain = async (species, language, selectedPokemonName) => {
  // La API entrega una cadena por especie; el backend la ajusta a la forma consultada.
  const chainData = await getLocalizedResource(species.evolution_chain.url, language);
  // Mega y Gigamax describen transformaciones de combate, no reemplazos de la especie base en su cadena.
  const isTransformation = /-(mega(?:-[xy])?|gmax)$/.test(selectedPokemonName);
  // Se usa el sufijo para buscar la variedad equivalente en cada etapa de la línea regional.
  const formSuffix = selectedPokemonName.startsWith(`${species.name}-`)
    ? selectedPokemonName.slice(species.name.length + 1)
    : null;
  // PokeAPI codifica hembra como 1 y macho como 2 en evolution_details.
  const selectedGender = selectedPokemonName.endsWith('-male') ? 2
    : selectedPokemonName.endsWith('-female') ? 1
      : null;
  const selectedSpeciesIsRoot = chainData.chain.species.name === species.name;

  const formatNode = async (node, preferredPokemonName) => {
    const nodeSpecies = await getLocalizedResource(node.species.url, language);
    const nodeName = node.species?.name || nodeSpecies.name;
    const matchingForm = !isTransformation && formSuffix
      && nodeSpecies.varieties?.find(({ pokemon }) => pokemon?.name === `${nodeName}-${formSuffix}`);
    const defaultVariety = nodeSpecies.varieties?.find(({ is_default }) => is_default)?.pokemon?.name || nodeName;
    // Las formas Mega/Gigamax conservan la forma base en la cadena, aunque la ficha muestre la transformación.
    const pokemonName = preferredPokemonName
      || (selectedSpeciesIsRoot && nodeName === species.name && !isTransformation
      ? selectedPokemonName
      : matchingForm?.pokemon?.name || defaultVariety);
    let pokemonData;
    try {
      pokemonData = await getLocalizedResource(`${POKEE_API_BASE}/pokemon/${pokemonName}/`, language);
    } catch (error) {
      if (pokemonName === nodeName) throw error;
      pokemonData = await getLocalizedResource(`${POKEE_API_BASE}/pokemon/${nodeName}/`, language);
    }
    const form = pokemonData.forms?.[0]
      ? await getLocalizedResource(pokemonData.forms[0].url, language)
      : null;
    // Se inspecciona el destino y el grupo de versiones antes de decidir si una rama aplica.
    const evolutionCandidates = await Promise.all(node.evolves_to.map(async (nextNode) => {
      const nextSpecies = await getLocalizedResource(nextNode.species.url, language);
      return {
        nextNode,
        nextSpecies,
        requiredSuffix: getRegionalEvolutionSuffix(nodeSpecies, nextSpecies, nextNode.evolution_details)
      };
    }));
    // Si hay una rama exclusiva para la región de la forma seleccionada, se omiten las ramas incompatibles.
    const hasMatchingRegionalBranch = formSuffix
      && evolutionCandidates.some(({ requiredSuffix }) => requiredSuffix === formSuffix);
    const evolvesTo = (await Promise.all(evolutionCandidates.flatMap(({ nextNode, nextSpecies, requiredSuffix }) => {
      if (requiredSuffix && formSuffix !== requiredSuffix) return null;
      if (hasMatchingRegionalBranch && !requiredSuffix) return null;

      // Cuando los detalles exigen sexos distintos, se crean rutas independientes para cada forma.
      const genderValues = [...new Set(nextNode.evolution_details.map(({ gender }) => gender).filter(Boolean))].sort();
      const splitsByGender = genderValues.length > 1;
      const genderBranches = splitsByGender
        ? genderValues.filter((gender) => nextSpecies.name !== species.name || !selectedGender || gender === selectedGender)
        : [genderValues[0] || null];

      return genderBranches.map(async (gender) => {
        const genderName = gender === 1 ? 'female' : gender === 2 ? 'male' : null;
        const genderPokemon = genderName
          ? nextSpecies.varieties.find(({ pokemon }) => pokemon.name === `${nextSpecies.name}-${genderName}`)?.pokemon.name
          : null;
        const preferredPokemonName = genderPokemon || (genderName ? `${nextSpecies.name}-${genderName}` : null);
        const branchDetails = splitsByGender
          ? nextNode.evolution_details.filter((detail) => detail.gender === gender)
          : nextNode.evolution_details;

        return {
          conditions: await getEvolutionConditions(branchDetails, language, formSuffix),
          pokemon: await formatNode(nextNode, preferredPokemonName)
        };
      });
    }))).filter(Boolean);

    return {
      name: nodeName,
      pokemonName: pokemonData.name,
      displayName: getLocalizedName(form?.names || nodeSpecies.names, language, nodeSpecies.name),
      sprite: getSprite(pokemonData.sprites),
      evolvesTo
    };
  };

  return formatNode(chainData.chain);
};

// Añade nombre traducido y tipos canónicos sin cargar el detalle completo de cada resultado.
const formatPokemonReferences = async (references, language) => Promise.all(references.map(async (reference) => {
  if (reference.url.includes('/pokemon-species/')) {
    const species = await getLocalizedResource(reference.url, language);
    const pokemonResponse = await axios.get(`${POKEE_API_BASE}/pokemon/${species.id}/`);
    return {
      ...reference,
      displayName: getLocalizedName(species.names, language, reference.name),
      types: pokemonResponse.data.types.map(({ type }) => type.name)
    };
  }

  const pokemonResponse = await axios.get(reference.url);
  const species = await getLocalizedResource(pokemonResponse.data.species.url, language);
  return {
    ...reference,
    displayName: getLocalizedName(species.names, language, reference.name),
    types: pokemonResponse.data.types.map(({ type }) => type.name)
  };
}));

// Elige un sprite disponible con fallback ordenado entre sprite frontal y arte oficial.
const getSprite = (sprites, shiny = false) => {
  // Respeta el orden de preferencia para elegir una imagen disponible en los distintos juegos.
  const key = shiny ? 'front_shiny' : 'front_default';
  return sprites[key]
    || sprites.other?.['official-artwork']?.[key]
    || sprites.other?.home?.[key]
    || null;
};

const formatPokemon = async (data, language = 'es') => {
  // Agrupa la especie y habilidades porque ambas aportan datos localizados a la ficha.
  const [speciesResponse, abilities] = await Promise.all([
    getLocalizedResource(data.species.url, language),
    Promise.all(data.abilities.map(async ({ ability, is_hidden }) => {
      const abilityData = await getLocalizedResource(ability.url, language);
      const effect = abilityData.effect_entries.find(({ language: entryLanguage }) => entryLanguage.name === language);
      const localizedFlavor = abilityData.flavor_text_entries.find(({ language: entryLanguage }) => entryLanguage.name === language)
        || (language === 'es' && abilityData.flavor_text_entries.find(({ language: entryLanguage }) => entryLanguage.name === 'es-419'));
      const englishEffect = abilityData.effect_entries.find(({ language: entryLanguage }) => entryLanguage.name === 'en');
      const englishFlavor = abilityData.flavor_text_entries.find(({ language: entryLanguage }) => entryLanguage.name === 'en');

      return {
        name: getAbilityName(abilityData, language, ability.name),
        isHidden: is_hidden,
        effect: effect?.short_effect
          || effect?.effect
          || localizedFlavor?.flavor_text.replace(/[\n\f]+/g, ' ')
          || englishEffect?.short_effect
          || englishEffect?.effect
          || englishFlavor?.flavor_text.replace(/[\n\f]+/g, ' ')
          || ''
      };
    }))
  ]);

  // La especie aporta traducciones y variedades; el recurso Pokémon aporta stats y sprite.
  const species = speciesResponse;
  const defaultVariety = species.varieties.find(({ is_default }) => is_default)?.pokemon;
  const defaultPokemonData = defaultVariety && defaultVariety.name !== data.name
    ? await getLocalizedResource(defaultVariety.url, language)
    : data;
  // Algunas formas no tienen arte propio en PokéAPI; se usa el sprite por defecto en ese caso.
  const fallbackSprite = getSprite(defaultPokemonData.sprites);
  const fallbackShinySprite = getSprite(defaultPokemonData.sprites, true);
  const alternatives = await Promise.all(
    species.varieties
      .filter(({ pokemon }) => pokemon.name !== data.name)
      .map(async ({ pokemon }) => {
        const { data: variant } = await axios.get(pokemon.url);
        const statsChanged = variant.stats.some((stat, index) => stat.base_stat !== data.stats[index]?.base_stat);
        const formData = variant.forms?.[0]
          ? await getLocalizedResource(variant.forms[0].url, language)
          : null;
        const variantSprite = getSprite(variant.sprites);
        const variantShinySprite = getSprite(variant.sprites, true);

        return {
          name: variant.name,
          displayName: formData
            ? getLocalizedName(formData.names, language, variant.name.replaceAll('-', ' '))
            : variant.name.replaceAll('-', ' '),
          sprites: variantSprite || fallbackSprite,
          shinySprite: variantShinySprite || fallbackShinySprite,
          spriteIsFallback: !variantSprite,
          statsChanged
        };
      })
  );

  const typeData = await Promise.all(data.types.map(({ type }) => getLocalizedResource(type.url, language)));
  const [localizedTypes, localizedStats, localizedGeneration, evolutionChain] = await Promise.all([
    Promise.all(data.types.map(async ({ type }, index) => ({
      name: getLocalizedName(typeData[index].names, language, type.name),
      icon: getTypeIcon(typeData[index])
    }))),
    Promise.all(data.stats.map(async ({ stat, base_stat }) => {
      const statData = await getLocalizedResource(stat.url, language);
      return {
        name: getLocalizedName(statData.names, language, stat.name),
        value: base_stat
      };
    })),
    getLocalizedResource(species.generation.url, language),
    getEvolutionChain(species, language, data.name)
  ]);

  // Combina relaciones defensivas de todos los tipos para calcular multiplicadores duales.
  const incomingTypeReferences = new Map();
  for (const type of typeData) {
    for (const relation of ['double_damage_from', 'half_damage_from', 'no_damage_from']) {
      for (const incomingType of type.damage_relations[relation]) {
        incomingTypeReferences.set(incomingType.name, incomingType);
      }
    }
  }

  const defensiveMatchups = await Promise.all([...incomingTypeReferences.values()].map(async (incomingType) => {
    const multiplier = typeData.reduce((total, type) => {
      const relations = type.damage_relations;
      if (relations.no_damage_from.some(({ name }) => name === incomingType.name)) return total * 0;
      if (relations.double_damage_from.some(({ name }) => name === incomingType.name)) return total * 2;
      if (relations.half_damage_from.some(({ name }) => name === incomingType.name)) return total * 0.5;
      return total;
    }, 1);
    const localizedType = await getLocalizedResource(incomingType.url, language);
    return {
      name: getLocalizedName(localizedType.names, language, incomingType.name),
      icon: getTypeIcon(localizedType),
      multiplier
    };
  }));

  const effectiveTypeReferences = new Map();
  for (const type of typeData) {
    for (const effectiveType of type.damage_relations.double_damage_to) {
      effectiveTypeReferences.set(effectiveType.name, effectiveType);
    }
  }
  const effectiveAgainst = await Promise.all([...effectiveTypeReferences.values()].map(async (effectiveType) => {
    const localizedType = await getLocalizedResource(effectiveType.url, language);
    return {
      name: getLocalizedName(localizedType.names, language, effectiveType.name),
      icon: getTypeIcon(localizedType)
    };
  }));

  const genderRate = species.gender_rate;
  const gender = genderRate === -1
    ? { genderless: true }
    : { female: genderRate * 12.5, male: 100 - genderRate * 12.5 };

  return {
    id: data.id,
    name: data.name,
    displayName: getLocalizedName(species.names, language, data.name),
    sprites: getSprite(data.sprites) || fallbackSprite,
    shinySprite: getSprite(data.sprites, true) || fallbackShinySprite,
    spriteIsFallback: !getSprite(data.sprites),
    types: localizedTypes,
    stats: localizedStats,
    height: data.height,
    weight: data.weight,
    generation: getLocalizedName(localizedGeneration.names, language, species.generation.name),
    gender,
    abilities,
    evolutionChain,
    typeMatchups: {
      weaknesses: defensiveMatchups.filter(({ multiplier }) => multiplier > 1),
      resistances: defensiveMatchups.filter(({ multiplier }) => multiplier > 0 && multiplier < 1),
      immunities: defensiveMatchups.filter(({ multiplier }) => multiplier === 0),
      effectiveAgainst
    },
    alternatives
  };
};

const getPokemonReferences = async (resource) => {
  const response = await axios.get(`${POKEE_API_BASE}/${resource}`);
  const references = response.data.pokemon || response.data.pokemon_species;
  return references.map((entry) => entry.pokemon || entry);
};

// Lista paginada o intersección paginada de los filtros activos, manteniendo el formato esperado por React.
const getPokemons = async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(Number.parseInt(req.query.limit, 10) || 10, 2000));
    const offset = Math.max(0, Number.parseInt(req.query.offset, 10) || 0);
    const { type, ability, generation, lang = 'es' } = req.query;

    if (type || ability || generation) {
      const referenceLists = await Promise.all([
        type ? getPokemonReferences(`type/${encodeURIComponent(type)}`) : null,
        ability ? getPokemonReferences(`ability/${encodeURIComponent(ability)}`) : null,
        generation ? getPokemonReferences(`generation/${encodeURIComponent(generation)}`) : null
      ].filter(Boolean));
      const matchingSets = referenceLists.map((references) => new Set(references.map(({ name }) => name)));
      const references = referenceLists[0].filter(({ name }) => matchingSets.every((set) => set.has(name)));
      const getId = ({ url }) => Number(url.split('/').filter(Boolean).pop());
      references.sort((first, second) => getId(first) - getId(second));

      let results = references.slice(offset, offset + limit);
      if (limit <= 100) {
        results = await formatPokemonReferences(results, lang);
      }

      return res.status(200).json({
        count: references.length,
        results
      });
    }

    const response = await axios.get(`${POKEE_API_BASE}/pokemon`, {
      params: { limit, offset }
    });
    let results = response.data.results;
    if (limit <= 100) {
      results = await formatPokemonReferences(results, lang);
    }
    res.status(200).json({ ...response.data, results });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los Pokémon', error: error.message });
  }
};

const getPokemonFilters = async (req, res) => {
  try {
    const language = req.query.lang === 'en' ? 'en' : 'es';
    const [typesResponse, abilitiesResponse, generationsResponse] = await Promise.all([
      axios.get(`${POKEE_API_BASE}/type`),
      axios.get(`${POKEE_API_BASE}/ability`, { params: { limit: 1000 } }),
      axios.get(`${POKEE_API_BASE}/generation`)
    ]);

    const [types, generations] = await Promise.all([
      Promise.all(typesResponse.data.results
        .filter(({ name }) => name !== 'unknown' && name !== 'stellar')
        .map(async (type) => {
        const typeData = await getLocalizedResource(type.url, language);
        return { name: type.name, label: getLocalizedName(typeData.names, language, type.name) };
      })),
      Promise.all(generationsResponse.data.results.map(async (generation) => {
        const generationData = await getLocalizedResource(generation.url, language);
        return { name: generation.name, label: getLocalizedName(generationData.names, language, generation.name) };
      }))
    ]);

    const abilityReferences = abilitiesResponse.data.results;
    const abilities = [];
    // Limita la concurrencia para no saturar el límite por IP de PokéAPI.
    for (let index = 0; index < abilityReferences.length; index += 20) {
      const batch = abilityReferences.slice(index, index + 20);
      const localizedAbilities = await Promise.all(batch.map(async ({ name, url }) => {
        const abilityData = await getLocalizedResource(url, language);
        return { name, label: getAbilityName(abilityData, language, name.replaceAll('-', ' ')) };
      }));
      abilities.push(...localizedAbilities);
    }

    res.status(200).json({
      types,
      abilities,
      generations
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los filtros', error: error.message });
  }
};

const searchPokemonByName = async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res.status(400).json({ message: 'Se requiere el parámetro name' });
    }
    const response = await axios.get(`${POKEE_API_BASE}/pokemon/${name.toLowerCase()}`);
    
    const language = req.query.lang === 'en' ? 'en' : 'es';
    res.status(200).json(await formatPokemon(response.data, language));
  } catch (error) {
    console.error('Error al buscar Pokémon:', error);
    res.status(404).json({ message: 'Pokémon no encontrado', error: error.message });
  }
};

const getPokemonById = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await axios.get(`${POKEE_API_BASE}/pokemon/${id}`);
    
    const language = req.query.lang === 'en' ? 'en' : 'es';
    res.status(200).json(await formatPokemon(response.data, language));
  } catch (error) {
    res.status(404).json({ message: 'Pokémon no encontrado', error: error.message });
  }
};

module.exports = { getPokemons, getPokemonFilters, searchPokemonByName, getPokemonById };