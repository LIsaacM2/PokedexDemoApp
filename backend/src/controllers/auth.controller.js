const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Debe coincidir con la lista de requisitos que muestra el formulario de registro.
const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_\-+=[\]\/]).{8,}$/;

// Firma tokens con el id de MongoDB; el cliente los presenta en las rutas protegidas.
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

const registerUser = async (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'El nombre es obligatorio' });
    }

    if (typeof username !== 'string' || !/^[a-zA-Z0-9._-]{3,30}$/.test(username.trim())) {
      return res.status(400).json({ message: 'El usuario debe tener entre 3 y 30 caracteres (letras, números, punto, guion o guion bajo)' });
    }

    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ message: 'El correo electrónico es obligatorio' });
    }

    if (typeof password !== 'string' || !passwordRegex.test(password)) {
      return res.status(400).json({
        message: 'La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un símbolo especial (ej. ., !, @, #)'
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET no está configurado');
      return res.status(500).json({ message: 'Error en la configuración del servidor' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim().toLowerCase();
    const userExists = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }]
    });
    if (userExists) {
      return res.status(409).json({ message: 'El correo o nombre de usuario ya está registrado' });
    }

    const user = await User.create({
      name: name.trim(),
      username: normalizedUsername,
      email: normalizedEmail,
      password
    });

    return res.status(201).json({
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      token: generateToken(user._id)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'El correo o nombre de usuario ya está registrado' });
    }
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ message: error.message });
    }
    console.error('Error al registrar usuario:', error);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
};

const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (typeof username !== 'string' || !username.trim() || typeof password !== 'string') {
      return res.status(400).json({ message: 'Usuario y contraseña son obligatorios' });
    }
    const user = await User.findOne({ username: username.trim().toLowerCase() });

    if (user && (await user.matchPassword(password))) {
      return res.status(200).json({
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
    }
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
};

const logoutUser = (req, res) => {
  res.status(200).json({ message: 'Sesión cerrada exitosamente' });
};

module.exports = { registerUser, loginUser, logoutUser };