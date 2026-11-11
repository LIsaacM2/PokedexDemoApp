const express = require('express');
const router = express.Router();
const { getPokemons, getPokemonFilters, searchPokemonByName, getPokemonById } = require('../controllers/pokemon.controller');
const { getUserCollection, addPokemonToCollection, removePokemonFromCollection } = require('../controllers/collection.controller');
const { protect } = require('../middleware/auth.middleware');

// Todas las rutas de Pokémon y colección requieren una sesión autenticada.
router.get('/', protect, getPokemons);
router.get('/search', protect, searchPokemonByName);
router.get('/filters', protect, getPokemonFilters);
router.get('/collection', protect, getUserCollection);
router.post('/collection', protect, addPokemonToCollection);
router.delete('/collection/:pokemonId', protect, removePokemonFromCollection);
router.get('/:id', protect, getPokemonById);

module.exports = router;