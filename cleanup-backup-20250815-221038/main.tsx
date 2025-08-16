import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import Web3Provider from './providers/Web3Provider'
import './styles/globals.css'
import './styles/sota-glassmorphism.css'
import './styles/elite-trading.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Web3Provider>
      <App />
    </Web3Provider>
  </React.StrictMode>
)



