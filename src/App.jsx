import PublicPortfolio from './PublicPortfolio'
import AdminApp from './admin/AdminApp'

function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  const recoveryParams = new URLSearchParams(window.location.hash.slice(1))
  const queryParams = new URLSearchParams(window.location.search)
  const recoveryCallback = recoveryParams.get('type') === 'recovery'
    || recoveryParams.has('error_code')
    || queryParams.has('error_code')
  const recoveryQuery = queryParams.get('mode') === 'recovery'
  if (path.startsWith('/admin') || recoveryCallback || recoveryQuery) return <AdminApp />
  return <PublicPortfolio />
}

export default App
