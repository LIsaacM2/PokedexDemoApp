# PokéDex

Aplicación web responsiva para explorar Pokémon y mantener una colección personal por usuario. El backend usa MongoDB para las cuentas y la colección; los datos detallados de Pokémon se consultan a través de PokéAPI.

## Requisitos

- Node.js 20.19+ o 22.12+.
- MongoDB local o una instancia accesible mediante `MONGO_URI`.
- Acceso a internet para consultar PokéAPI y cargar sprites.
- Docker Engine o Docker Desktop con Docker Compose v2 para el modo contenedorizado.

## Instalación y ejecución

Desde la raíz del proyecto, crea la configuración local del backend:

```powershell
Copy-Item backend/.env.example backend/.env
```

Asegúrate de que MongoDB esté activo y configura `MONGO_URI` y `JWT_SECRET` en `backend/.env`. Para cualquier entorno compartido o desplegado, sustituye el secreto de ejemplo por uno privado y aleatorio.

En una terminal, instala y ejecuta el backend:

```powershell
cd backend
npm install
npm run seed:demo
npm run dev
```

En otra terminal, instala y ejecuta el frontend:

```powershell
cd frontend
npm install
npm run dev
```

Vite muestra la URL local al iniciar, normalmente `http://localhost:5173`. El backend escucha en el puerto `5000` de forma predeterminada.

La aplicación de frontend puede compilarse y revisarse con:

```powershell
cd frontend
npm run lint
npm run build
```

## Docker

Compose levanta el frontend, el backend y MongoDB. El frontend se sirve con Nginx y reenvía `/api` y `/auth` al backend dentro de la red de Docker.

```powershell
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$bytes = New-Object byte[] 32
$rng.GetBytes($bytes)
$env:JWT_SECRET = [Convert]::ToBase64String($bytes)
$rng.Dispose()
Remove-Variable rng, bytes
docker compose up --build -d
docker compose exec backend npm run seed:demo
```

- Frontend: `http://localhost:5173`.
- Backend: `http://localhost:3000` (acceso directo; el navegador usa el proxy same-origin de Nginx).
- MongoDB: `mongodb://localhost:27017/pokedex_db`.
- Los datos de MongoDB se conservan en el volumen `mongo_data`.
- Para detener los servicios: `docker compose down`. Para borrar también los datos persistidos: `docker compose down -v`.

`JWT_SECRET` es obligatorio y se genera en la sesión actual de PowerShell; mantén esa sesión abierta para futuras operaciones Compose que necesiten interpolarlo. El secreto no se guarda en el repositorio ni se copia a las imágenes. La imagen del frontend compila `VITE_API_BASE_URL=/`, y Nginx enruta esas llamadas al backend. Compose espera que MongoDB y el backend estén saludables antes de iniciar el servicio dependiente.

## Cuenta de demostración

`npm run seed:demo` crea, si aún no existe, un usuario local con una colección inicial de Pikachu y Charizard. También agrega esas entradas si el usuario demo ya existía; no borra el resto de la colección.

- Usuario: `ash`
- Contraseña: `PokedexDemo123!`

Estos valores solo son credenciales locales de demostración. No las uses en producción. Puedes cambiarlas con `DEMO_NAME`, `DEMO_USERNAME`, `DEMO_EMAIL` y `DEMO_PASSWORD` en `backend/.env`. El script de seed se niega a ejecutarse cuando `NODE_ENV=production`.

## Funcionalidades

- Registro, inicio de sesión con nombre de usuario y cierre de sesión en el cliente.
- Contraseñas validadas y almacenadas con bcrypt; JWT para proteger los endpoints de Pokémon y colección.
- Lista de diez Pokémon por página, búsqueda con sugerencias y filtros por tipo, habilidad y generación.
- Detalles localizados en español o inglés, formas, sprites shiny, estadísticas, habilidades, relaciones de tipo y cadena evolutiva.
- Colección personal persistida por cuenta en MongoDB, con acciones para agregar o quitar Pokémon.
- Interfaz responsiva desarrollada con React, Vite y Tailwind CSS.

## Tecnologías y decisiones

- **Node.js y Express:** exponen una API separada por rutas, controladores y middleware, y sirven como proxy de PokéAPI.
- **MongoDB y Mongoose:** persisten las cuentas y la colección por usuario con un esquema validado.
- **JWT y bcryptjs:** protegen rutas y almacenan contraseñas mediante hash.
- **React y Vite:** permiten una interfaz por componentes con servidor de desarrollo y build de producción.
- **Tailwind CSS:** mantiene los estilos de la interfaz responsivos y consistentes.
- **Axios:** centraliza las solicitudes al backend y adjunta el token automáticamente.

## API

Los endpoints de Pokémon y colección requieren `Authorization: Bearer <token>`. El token se obtiene al registrarse o iniciar sesión.

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/auth/register` | Registra `name`, `username`, `email` y `password`. |
| `POST` | `/auth/login` | Inicia sesión con `username` y `password`. |
| `POST` | `/auth/logout` | Confirma el cierre de sesión; el cliente elimina el JWT. |
| `GET` | `/api/pokemon?limit=10&offset=0` | Lista Pokémon paginados. Acepta `type`, `ability`, `generation` y `lang`. |
| `GET` | `/api/pokemon/search?name=pikachu&lang=es` | Busca un Pokémon por nombre o forma. |
| `GET` | `/api/pokemon/:id?lang=en` | Obtiene detalles por número de Pokédex. |
| `GET` | `/api/pokemon/filters?lang=es` | Devuelve opciones localizadas de filtros. |
| `GET` | `/api/pokemon/collection?lang=es` | Devuelve la colección del usuario autenticado. |
| `POST` | `/api/pokemon/collection` | Agrega `{ "pokemonId": 25 }` a la colección. |
| `DELETE` | `/api/pokemon/collection/:pokemonId` | Quita un Pokémon de la colección. |

## Estructura

```text
backend/
  src/config/       conexión a MongoDB
  src/controllers/  autenticación, Pokémon y colección
  src/middleware/  protección JWT
  src/models/       esquema de usuario y colección embebida
  src/routes/       rutas Express
  src/scripts/      seed de demostración
frontend/
  src/components/   tarjeta y ficha de Pokémon
  src/pages/        login y Pokédex
  src/services/     cliente HTTP con JWT
```

## Persistencia y alcance

MongoDB almacena usuarios y, dentro de cada usuario, las entradas de `pokemonCollection` (`pokemonId`, nombre canónico y fecha de agregado). Los datos descriptivos, tipos, estadísticas, formas y sprites se consultan a PokéAPI y no se duplican en la base de datos. El caché de recursos de PokéAPI vive en memoria del proceso; se pierde al reiniciar el backend. En cargas mayores conviene espaciar las consultas para respetar el límite de PokeAPI.

El cierre de sesión es stateless: elimina el token del navegador, pero no revoca tokens ya emitidos. El repositorio no incluye actualmente pruebas automatizadas ni despliegue; las pruebas se pueden ejecutar manualmente contra MongoDB y PokéAPI.

## Seguridad antes de compartir

No subas archivos `.env`; conserva en Git únicamente plantillas sin credenciales, como `backend/.env.example`. Si un secreto llegó al repositorio, primero rótalo en el servicio que lo valida (JWT, MongoDB u otro), luego deja de rastrear el `.env` y mantenlo ignorado localmente. Borrar el archivo de la última versión no elimina copias de commits anteriores; reescribir el historial es una operación adicional que debe coordinarse con quienes hayan clonado el repositorio.
