import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { GamificationProvider } from './contexts/GamificationContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { LanguageProvider } from './contexts/LanguageContext'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <NotificationProvider>
                <GamificationProvider>
                  <App />
                </GamificationProvider>
              </NotificationProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
)
