import PublicPortfolio from './PublicPortfolio'
import AdminApp from './admin/AdminApp'

function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path.startsWith('/admin')) return <AdminApp />
  return <PublicPortfolio />
}

export default App
