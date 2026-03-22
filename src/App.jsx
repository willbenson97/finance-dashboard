import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Layout/Sidebar'
import NetWorthTracker from './components/NetWorth/NetWorthTracker'
import PortfolioAnalyzer from './components/Portfolio/PortfolioAnalyzer'
import BudgetTracker from './components/Budget/BudgetTracker'
import WealthProgression from './components/WealthProgression/WealthProgression'
import FIPlanner from './components/FIPlanner/FIPlanner'

export default function App() {
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
        </Routes>
      </main>
    </div>
  )
}
