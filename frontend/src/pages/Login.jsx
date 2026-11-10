import { useState } from 'react';
import { Check, Circle } from 'lucide-react';
import api from '../services/api';
import pokedexIcon from '../assets/pokedexIcon.png';
import registeringAnimation from '../assets/registeringAnimation.gif';

const passwordRequirements = [
  { label: 'Al menos 8 caracteres', test: (value) => value.length >= 8 },
  { label: 'Una letra mayúscula', test: (value) => /[A-Z]/.test(value) },
  { label: 'Un número', test: (value) => /\d/.test(value) },
  { label: 'Un símbolo especial', test: (value) => /[!@#$%^&*(),.?":{}|<>_\-+=[\]\x2f]/.test(value) }
];

export default function Login({ onLoginSuccess }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showRegistrationSuccess, setShowRegistrationSuccess] = useState(false);

  // Regex para validar los requisitos de la contraseña
  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_\-+=[\]\x2f]).{8,}$/;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validar contraseña antes de enviar si está en modo registro
    if (isRegistering && !passwordRegex.test(password)) {
      setError('La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un signo especial (ej. ., !, @, #).');
      return;
    }

    try {
      if (isRegistering) {
        await api.post('/auth/register', { name, username, email, password });
        setSuccess('¡Cuenta creada con éxito! Ya puedes iniciar sesión.');
        setIsRegistering(false);
        setPassword('');
        setShowRegistrationSuccess(true);
      } else {
        const response = await api.post('/auth/login', { username, password });
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data));
        onLoginSuccess(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error en el servidor. Inténtalo de nuevo.');
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
    setSuccess('');
  };

  return (
    <div className="pokedex-background min-h-screen flex items-center justify-center text-white p-4">
      <div className="bg-slate-800 p-8 rounded-xl shadow-lg w-96 border border-slate-700">
        <h2 className="flex items-center justify-center gap-3 text-2xl font-bold mb-6 text-center text-red-500">
          <img src={pokedexIcon} alt="" className="h-10 w-12 object-contain" />
          {isRegistering ? 'Crear Cuenta' : 'PokéDex Login'}
        </h2>

        {error && <div className="bg-red-500/25 border border-red-500/50 text-red-300 p-3 rounded mb-4 text-xs leading-relaxed">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <div className="space-y-1">
              <label htmlFor="full-name" className="block text-sm">Nombre completo</label>
              <input 
                id="full-name"
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                className="block w-full p-2.5 rounded bg-slate-900 border border-slate-700 focus:outline-none focus:border-red-500"
                placeholder="Ej. Ash Ketchum"
                required={isRegistering}
              />
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="username" className="block text-sm">Usuario</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="block w-full p-2.5 rounded bg-slate-900 border border-slate-700 focus:outline-none focus:border-red-500"
              placeholder="Tu nombre de usuario"
              autoComplete="username"
              required
            />
          </div>

          {isRegistering && (
            <div className="space-y-1">
              <label htmlFor="email" className="block text-sm">Correo electrónico</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full p-2.5 rounded bg-slate-900 border border-slate-700 focus:outline-none focus:border-red-500"
                placeholder="tu@email.com"
                autoComplete="email"
                required
              />
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="password" className="block text-sm">Contraseña</label>
            <input 
              id="password"
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full p-2.5 rounded bg-slate-900 border border-slate-700 focus:outline-none focus:border-red-500"
              placeholder="••••••••"
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              required 
            />
            {isRegistering && (
              <ul className="mt-2 space-y-1" aria-live="polite">
                {passwordRequirements.map(({ label, test }) => {
                  const isComplete = test(password);
                  const RequirementIcon = isComplete ? Check : Circle;
                  return (
                    <li key={label} className={`flex items-center gap-2 text-[11px] ${isComplete ? 'text-green-400' : 'text-slate-400'}`}>
                      <RequirementIcon size={13} aria-hidden="true" />
                      {label}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex gap-4 pt-2">
            <button 
              type="submit" 
              className={`flex-1 transition p-2.5 rounded font-bold cursor-pointer ${
                !isRegistering 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              }`}
            >
              {isRegistering ? 'Confirmar Registro' : 'Entrar'}
            </button>

            <button 
              type="button" 
              onClick={toggleMode}
              className={`flex-1 border transition p-2.5 rounded font-bold cursor-pointer ${
                isRegistering 
                  ? 'border-slate-600 text-slate-400 hover:bg-slate-700' 
                  : 'border-red-500 text-red-400 hover:bg-red-500/10'
              }`}
            >
              {isRegistering ? 'Volver al Login' : 'Registrarse'}
            </button>
          </div>
        </form>
      </div>
      {showRegistrationSuccess && (
        <div className="registration-success-overlay" role="dialog" aria-modal="true" aria-labelledby="registration-success-title">
          <img src={registeringAnimation} alt="Animación de captura exitosa" className="registration-success-animation" />
          <h2 id="registration-success-title" className="mt-4 text-2xl font-bold text-white">¡Captura exitosa!</h2>
          <p className="mt-2 text-center text-slate-200">{success}</p>
          <button
            type="button"
            onClick={() => { setShowRegistrationSuccess(false); setSuccess(''); }}
            className="mt-6 rounded bg-red-600 px-6 py-3 font-bold text-white hover:bg-red-700 cursor-pointer"
          >
            Continuar
          </button>
        </div>
      )}
    </div>
  );
}