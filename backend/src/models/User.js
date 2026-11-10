const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const collectionEntrySchema = new mongoose.Schema({
  pokemonId: { type: Number, required: true },
  pokemonName: { type: String, required: true, lowercase: true, trim: true },
  addedAt: { type: Date, default: Date.now }
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true, sparse: true, lowercase: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  pokemonCollection: { type: [collectionEntrySchema], default: [] }
}, { timestamps: true });

// Encriptar contraseña antes de guardar
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Método para comparar contraseñas
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);