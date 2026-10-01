import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { Toaster } from '@/app/components/ui/sonner'
import { TooltipProvider } from '@/app/components/ui/tooltip'
import { AppRoutes } from './router'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/app">
      <TooltipProvider delayDuration={200}>
        <AppRoutes />
        <Toaster position="top-center" />
      </TooltipProvider>
    </BrowserRouter>
  </StrictMode>,
)
