'use client'

import { useState } from 'react'

type Tab = 'train' | 'search' | 'routing'

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('train')

  return (
    <div className="flex h-screen bg-[#0A0A0A] text-[#F0EDEA] overflow-hidden">

      {/* Sidebar */}
      <aside className="w-64 border-r border-white/8 flex flex-col flex-shrink-0">

        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/8">
          <div className="text-xl tracking-tight" style={{ fontFamily: 'var(--font-dm-serif)' }}>
            Prop<span className="italic text-[#4AE3A0]">AI</span>
          </div>
          <div className="text-xs text-white/40 mt-0.5">UAE Investment Intelligence</div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavItem
            icon="✦"
            label="Train Agent"
            sub="Define AI criteria"
            active={activeTab === 'train'}
            onClick={() => setActiveTab('train')}
          />
          <NavItem
            icon="⌕"
            label="Search Deals"
            sub="Find UAE properties"
            active={activeTab === 'search'}
            onClick={() => setActiveTab('search')}
          />
          <NavItem
            icon="⇄"
            label="Route Investors"
            sub="Match deals to buyers"
            active={activeTab === 'routing'}
            onClick={() => setActiveTab('routing')}
          />
        </nav>

        {/* Bottom info */}
        <div className="px-4 py-4 border-t border-white/8">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#4AE3A0]"></div>
            <span className="text-xs text-white/40">UAE Market · Dubai</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col">

        {/* Top bar */}
        <header className="px-8 py-4 border-b border-white/8 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-lg font-medium tracking-tight">
              {activeTab === 'train' && 'Train Agent'}
              {activeTab === 'search' && 'Search Deals'}
              {activeTab === 'routing' && 'Route Investors'}
            </h1>
            <p className="text-xs text-white/40 mt-0.5">
              {activeTab === 'train' && 'Configure your AI investment analyst'}
              {activeTab === 'search' && 'Find and score UAE properties'}
              {activeTab === 'routing' && 'Match deals to the right investors'}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/30 bg-white/5 px-3 py-1.5 rounded-full border border-white/8">
            <span>🇦🇪</span>
            <span>UAE · AED</span>
          </div>
        </header>

        {/* Panel content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'train' && <TrainAgentPanel />}
          {activeTab === 'search' && <SearchDealsPanel />}
          {activeTab === 'routing' && <RouteInvestorsPanel />}
        </div>
      </main>
    </div>
  )
}

function NavItem({
  icon, label, sub, active, onClick
}: {
  icon: string
  label: string
  sub: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-150 group ${
        active
          ? 'bg-white/8 border border-white/10'
          : 'hover:bg-white/4 border border-transparent'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={`text-sm ${active ? 'text-[#4AE3A0]' : 'text-white/30 group-hover:text-white/50'}`}>
          {icon}
        </span>
        <div>
          <div className={`text-sm font-medium ${active ? 'text-white' : 'text-white/60'}`}>
            {label}
          </div>
          <div className="text-xs text-white/30 mt-0.5">{sub}</div>
        </div>
      </div>
    </button>
  )
}

function TrainAgentPanel() {
  const [criteria, setCriteria] = useState([
    { id: '1', text: 'Min gross yield 7%', type: 'must' },
    { id: '2', text: 'Freehold areas only', type: 'must' },
    { id: '3', text: 'Avoid off-plan risk', type: 'avoid' },
  ])
  const [newCriteria, setNewCriteria] = useState('')
  const [criteriaType, setCriteriaType] = useState('must')
  const [saved, setSaved] = useState(false)

  const addCriteria = () => {
    if (!newCriteria.trim()) return
    setCriteria([...criteria, { id: Date.now().toString(), text: newCriteria, type: criteriaType }])
    setNewCriteria('')
  }

  const removeCriteria = (id: string) => {
    setCriteria(criteria.filter(c => c.id !== id))
  }

const [agentName, setAgentName] = useState('UAE Investment Analyst')
const [instructions, setInstructions] = useState('You are a UAE real estate investment analyst specialising in Dubai residential and commercial properties. Focus on high-yield opportunities in freehold areas. Prioritise deals with strong rental demand, good transport links, and reputable developers. Always flag service charge risks and leasehold exposure. Consider Golden Visa eligibility for AED 2M+ properties as a key selling point.')

const handleSave = async () => {
  try {
    const response = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: agentName,
        instructions: instructions,
        criteria: criteria,
        data_sources: ['bayut', 'dld', 'news'],
      }),
    })
    if (!response.ok) throw new Error('Failed to save')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  } catch (err) {
    console.error(err)
    alert('Failed to save agent. Check console for errors.')
  }
}

  const typeColors: Record<string, string> = {
    must: 'bg-[#4AE3A0]/10 text-[#4AE3A0] border-[#4AE3A0]/20',
    nice: 'bg-blue-400/10 text-blue-300 border-blue-400/20',
    avoid: 'bg-red-400/10 text-red-300 border-red-400/20',
  }

  return (
    <div className="px-8 py-6 max-w-2xl">

      <div className="space-y-6">

        {/* Agent Name */}
        <div>
          <label className="text-xs font-medium text-white/40 uppercase tracking-wider block mb-2">
            Agent Name
          </label>
          <input
  type="text"
  value={agentName}
  onChange={e => setAgentName(e.target.value)}
  className="w-full bg-white/4 border border-white/8 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#4AE3A0]/40 transition-colors"
/>
        </div>

        {/* Instructions */}
        <div>
          <label className="text-xs font-medium text-white/40 uppercase tracking-wider block mb-2">
            Agent Instructions
          </label>
          <textarea
            rows={5}
            defaultValue="You are a UAE real estate investment analyst specialising in Dubai residential and commercial properties. Focus on high-yield opportunities in freehold areas. Prioritise deals with strong rental demand, good transport links, and reputable developers. Always flag service charge risks and leasehold exposure. Consider Golden Visa eligibility for AED 2M+ properties as a key selling point."
            className="w-full bg-white/4 border border-white/8 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#4AE3A0]/40 transition-colors resize-none leading-relaxed"
          />
          <p className="text-xs text-white/25 mt-1.5">
            This becomes the AI's system prompt. Be specific about UAE market focus, yield thresholds, and risk appetite.
          </p>
        </div>

        {/* Criteria */}
        <div>
          <label className="text-xs font-medium text-white/40 uppercase tracking-wider block mb-2">
            Investment Criteria
          </label>
          <div className="space-y-2 mb-3">
            {criteria.map(c => (
              <div
                key={c.id}
                className="flex items-center justify-between bg-white/4 border border-white/8 rounded-lg px-4 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${typeColors[c.type]}`}>
                    {c.type}
                  </span>
                  <span className="text-sm text-white/80">{c.text}</span>
                </div>
                <button
                  onClick={() => removeCriteria(c.id)}
                  className="text-white/20 hover:text-red-400 transition-colors text-lg leading-none"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Add criteria */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newCriteria}
              onChange={e => setNewCriteria(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCriteria()}
              placeholder="Add a criterion..."
              className="flex-1 bg-white/4 border border-white/8 rounded-lg px-4 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#4AE3A0]/40 transition-colors"
            />
            <select
              value={criteriaType}
              onChange={e => setCriteriaType(e.target.value)}
              className="bg-white/4 border border-white/8 rounded-lg px-3 py-2 text-sm text-white/60 focus:outline-none focus:border-[#4AE3A0]/40 transition-colors"
            >
              <option value="must">Must</option>
              <option value="nice">Nice</option>
              <option value="avoid">Avoid</option>
            </select>
            <button
              onClick={addCriteria}
              className="px-4 py-2 bg-white/8 border border-white/10 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/12 transition-all"
            >
              Add
            </button>
          </div>
        </div>

        {/* Data Sources */}
        <div>
          <label className="text-xs font-medium text-white/40 uppercase tracking-wider block mb-2">
            Data Sources
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'bayut', label: 'Bayut', icon: '🏠', on: true },
              { id: 'dld', label: 'Dubai Land Dept', icon: '📋', on: true },
              { id: 'news', label: 'Market News', icon: '📰', on: true },
              { id: 'rental', label: 'Rental Stats', icon: '📊', on: false },
            ].map(s => (
              <div key={s.id} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-colors ${s.on ? 'bg-[#4AE3A0]/5 border-[#4AE3A0]/20' : 'bg-white/4 border-white/8'}`}>
                <span>{s.icon}</span>
                <span className={`text-sm flex-1 ${s.on ? 'text-white/80' : 'text-white/30'}`}>{s.label}</span>
                <div className={`w-1.5 h-1.5 rounded-full ${s.on ? 'bg-[#4AE3A0]' : 'bg-white/15'}`}></div>
              </div>
            ))}
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          className={`w-full py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
            saved
              ? 'bg-[#4AE3A0] text-black'
              : 'bg-white/8 border border-white/10 text-white hover:bg-white/12'
          }`}
        >
          {saved ? '✓ Agent Saved' : 'Save Agent'}
        </button>
      </div>
    </div>
  )
}

function SearchDealsPanel() {
  return (
    <div className="px-8 py-6">
      <div className="max-w-2xl">
        <div className="bg-white/4 border border-white/8 rounded-xl p-8 text-center">
          <div className="text-3xl mb-3">🔍</div>
          <div className="text-base font-medium mb-2">Deal Search</div>
          <div className="text-sm text-white/40 leading-relaxed">
            Coming on Day 5 — search real Bayut listings across Dubai, Abu Dhabi and Sharjah. Your trained agent will score every deal instantly.
          </div>
        </div>
      </div>
    </div>
  )
}

function RouteInvestorsPanel() {
  return (
    <div className="px-8 py-6">
      <div className="max-w-2xl">
        <div className="bg-white/4 border border-white/8 rounded-xl p-8 text-center">
          <div className="text-3xl mb-3">⇄</div>
          <div className="text-base font-medium mb-2">Investor Routing</div>
          <div className="text-sm text-white/40 leading-relaxed">
            Coming on Day 6 — add investor profiles and the AI automatically matches them to scored deals with a one-click investment brief.
          </div>
        </div>
      </div>
    </div>
  )
}