require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

const demoCollection = [
  { pokemonId: 25, pokemonName: 'pikachu' },
  { pokemonId: 6, pokemonName: 'charizard' }
];

const seedDemoUser = async () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('El seed demo no se debe ejecutar en producción');
  }

  const name = process.env.DEMO_NAME || 'Ash Ketchum';
  const username = (process.env.DEMO_USERNAME || 'ash').toLowerCase();
  const email = (process.env.DEMO_EMAIL || 'ash@example.com').toLowerCase();
  const password = process.env.DEMO_PASSWORD || 'PokedexDemo123!';

  await connectDB();

  const rawUser = await User.collection.findOne({ username });
  let user = await User.findOne({ username });
  if (!user) {
    user = await User.create({ name, username, email, password, pokemonCollection: demoCollection });
    console.log(`Usuario demo creado: ${username}`);
    return;
  }

  const previousEntries = Array.isArray(rawUser?.collection) ? rawUser.collection : [];
  const entries = new Map(
    [...user.pokemonCollection, ...previousEntries, ...demoCollection]
      .map((entry) => [entry.pokemonId, { pokemonId: entry.pokemonId, pokemonName: entry.pokemonName }])
  );
  user.pokemonCollection = [...entries.values()];
  if (previousEntries.length > 0) {
    await User.collection.updateOne({ _id: rawUser._id }, { $unset: { collection: '' } });
  }

  await user.save();
  console.log(`Datos demo verificados para: ${username}`);
};

seedDemoUser()
  .catch((error) => {
    console.error(`No se pudo crear el usuario demo: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
