import { Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import LoginPage from './components/Auth/LoginPage'
import Sidebar from './components/Layout/Sidebar'
import NetWorthTracker from './components/NetWorth/NetWorthTracker'
import PortfolioAnalyzer from './components/Portfolio/PortfolioAnalyzer'
import BudgetTracker from './components/Budget/BudgetTracker'
import WealthProgression from './components/WealthProgression/WealthProgression'
import FIPlanner from './components/FIPlanner/FIPlanner'
import PropertyPurchasesPage from './components/Properties/PropertyPurchasesPage'
import CoinvestPage from './components/CoInvest/CoinvestPage'

function Dashboard() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <Routes>
          <Route path="/" element={<NetWorthTracker />} />
          <Route path="/portfolio" element={<PortfolioAnalyzer />} />
          <Route path="/budget" element={<BudgetTracker />} />
          <Route path="/wealth-progression" element={<WealthProgression />} />
          <Route path="/retirement-planning" element={<FIPlanner />} />
          <Route path="/property-purchases" element={<PropertyPurchasesPage />} />
          <Route path="/co-investments" element={<CoinvestPage />} />
        </Routes>
      </main>
    </div>
  )
}

function AppRoutes() {
  const { session } = useAuth()

  // Still loading session from Supabase
  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted animate-pulse text-sm">Loading…</div>
      </div>
    )
  }

  if (!session) return <LoginPage />

  return <Dashboard />
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
