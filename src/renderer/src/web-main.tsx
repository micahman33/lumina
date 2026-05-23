import { webApiMock } from './web-api-mock'

// Install the browser-compatible API mock before anything touches window.api
;(window as Window & { api: typeof webApiMock }).api = webApiMock

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import { App } from './App'

const root = document.getElementById('root')!
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
)
