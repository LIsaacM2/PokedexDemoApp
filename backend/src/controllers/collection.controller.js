const axios = require('axios');
const User = require('../models/User');

const POKEE_API_BASE = 'https://pokeapi.co/api/v2';
// Reutiliza datos de especie y Pokémon entre lecturas de colecciones dentro del proceso.
const resourceCache = new Map();

const getResource = async (url) => {
  if (!resourceCache.has(url)) {
    resourceCache.set(url, axios.get(url).then(({ data }) => data));
  }
  try {
    return await resourceCache.get(url);
  } catch (error) {
    resourceCache.delete(url);
    throw error;
  }
};

const localizedName = (names = [], language, fallback) => (
  names.find(({ language: entryLanguage }) => entryLanguage.name === language)?.name
  || (language === 'es' && names.find(({ language: entryLanguage }) => entryLanguage.name === 'es-419')?.name)
  || names.find(({ language: entryLanguage }) => entryLanguage.name === 'en')?.name
  || fallback
);

// Resuelve los datos de PokéAPI para las referencias persistidas del usuario autenticado.
const getUserCollection = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('pokemonCollection');
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    const language = req.query.lang === 'en' ? 'en' : 'es';
    const results = await Promise.all(user.pokemonCollection.map(async (entry) => {
      const pokemon = await getResource(`${POKEE_API_BASE}/pokemon/${entry.pokemonId}/`);
      const species = await getResource(pokemon.species.url);
      const sprites = pokemon.sprites;
      return {
        id: entry.pokemonId,
        name: entry.pokemonName,
        displayName: localizedName(species.names, language, entry.pokemonName),
        types: pokemon.types.map(({ type }) => type.name),
        sprites: sprites.front_default
          || sprites.other?.['official-artwork']?.front_default
          || sprites.other?.home?.front_default
          || null,
        addedAt: entry.addedAt
      };
    }));

    return res.status(200).json({ count: results.length, results });
  } catch (error) {
    console.error('Error al obtener la colección:', error);
    return res.status(500).json({ message: 'No se pudo obtener la colección' });
  }
};

// Valida el id contra PokéAPI y evita duplicados antes de guardar la referencia en MongoDB.
const addPokemonToCollection = async (req, res) => {
  try {
    const pokemonId = Number.parseInt(req.body.pokemonId, 10);
    if (!Number.isInteger(pokemonId) || pokemonId < 1) {
      return res.status(400).json({ message: 'pokemonId debe ser un entero positivo' });
    }

    const pokemon = await axios.get(`${POKEE_API_BASE}/pokemon/${pokemonId}`);
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    if (user.pokemonCollection.some((entry) => entry.pokemonId === pokemon.data.id)) {
      return res.status(409).json({ message: 'Este Pokémon ya está en tu colección' });
    }

    user.pokemonCollection.push({ pokemonId: pokemon.data.id, pokemonName: pokemon.data.name });
    await user.save();

    return res.status(201).json({
      message: 'Pokémon agregado a la colección',
      pokemonId: pokemon.data.id,
      pokemonName: pokemon.data.name,
      count: user.pokemonCollection.length
    });
  } catch (error) {
    if (error.response?.status === 404) {
      return res.status(400).json({ message: 'No existe un Pokémon con ese id' });
    }
    console.error('Error al agregar Pokémon a la colección:', error);
    return res.status(500).json({ message: 'No se pudo agregar el Pokémon a la colección' });
  }
};

// Elimina solo la entrada indicada del usuario autenticado y conserva el resto de su colección.
const removePokemonFromCollection = async (req, res) => {
  try {
    const pokemonId = Number.parseInt(req.params.pokemonId, 10);
    if (!Number.isInteger(pokemonId) || pokemonId < 1) {
      return res.status(400).json({ message: 'pokemonId debe ser un entero positivo' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    const originalCount = user.pokemonCollection.length;
    user.pokemonCollection = user.pokemonCollection.filter((entry) => entry.pokemonId !== pokemonId);
    if (user.pokemonCollection.length === originalCount) {
      return res.status(404).json({ message: 'Este Pokémon no está en tu colección' });
    }

    await user.save();
    return res.status(200).json({ message: 'Pokémon eliminado de la colección', count: user.pokemonCollection.length });
  } catch (error) {
    console.error('Error al quitar Pokémon de la colección:', error);
    return res.status(500).json({ message: 'No se pudo quitar el Pokémon de la colección' });
  }
};

module.exports = { getUserCollection, addPokemonToCollection, removePokemonFromCollection };
