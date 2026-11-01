import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import './styles/index.css'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { AppRoutes } from '@/app/routes'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider><AppRoutes /></AuthProvider>
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
