const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Configurar variables de entorno
dotenv.config();

// Conectar a la Base de Datos MongoDB
connectDB();

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());

// Definición de Rutas
app.use('/auth', require('./routes/auth.routes'));
app.use('/api/pokemon', require('./routes/pokemon.routes'));

// Ruta de prueba raíz
app.get('/', (req, res) => {
  res.send('API de PokéDex funcionando correctamente 🚀');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});