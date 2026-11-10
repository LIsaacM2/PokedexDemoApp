import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import pokedexIcon from './assets/pokedexIcon.png'
import './index.css'
import App from './App.jsx'

document.title = 'PokéDex'
const favicon = document.querySelector('link[rel="icon"]') || document.createElement('link')
favicon.rel = 'icon'
favicon.type = 'image/png'
favicon.href = pokedexIcon
if (!favicon.parentNode) document.head.appendChild(favicon)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
