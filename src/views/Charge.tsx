import { useMemo, useState } from 'react'
import { MapPanel } from '../components/MapPanel'
import { Button, Chip, PageHeader, StatusDot, statusLabel } from '../components/Ui'
import { perMinute } from '../lib/econ'
import { cx } from '../lib/cx'
import { usdc } from '../lib/format'
import { useStore } from '../store'
import type { ChargeNode } from '../types'

type Filter = 'all' | 'available' | 'fast' | 'home'

export function Charge() {
  const { state, dispatch } = useStore()
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const selected = state.nodes.find((node) => node.id === state.selectedNodeId) ?? state.nodes[0]

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.nodes
      .filter((node) => {
        if (filter === 'available' && node.status !== 'available') return false
        if (filter === 'fast' && node.kind !== 'DC Fast') return false
        if (filter === 'home' && node.origin !== 'private') return false
        if (!q) return true
        return `${node.name} ${node.district} ${node.host}`.toLowerCase().includes(q)
      })
      .sort((a, b) => a.distanceMi - b.distanceMi)
  }, [filter, query, state.nodes])

  return (
    <div>
      <PageHeader
        eyebrow="Driver"
        title="Find a charger"
        lede="Open a session at any live node. USDC streams at the posted rate for as long as the cable is connected."
      />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.8fr)]">
        <MapPanel
          className="h-[520px] lg:h-[680px]"
          nodes={state.nodes}
          selectedId={selected?.id ?? null}
          onSelect={(id) => dispatch({ type: 'SELECT', id })}
        />
        <div className="flex flex-col gap-3 lg:h-[680px]">
          {selected && <Detail node={selected} />}
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search chargers"
            className="w-full rounded-full border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-lime/60"
          />
          <div className="flex flex-wrap gap-2">
            <Chip active={filter === 'all'} onClick={() => setFilter('all')}>All</Chip>
            <Chip active={filter === 'available'} onClick={() => setFilter('available')}>Available</Chip>
            <Chip active={filter === 'fast'} onClick={() => setFilter('fast')}>DC Fast</Chip>
            <Chip active={filter === 'home'} onClick={() => setFilter('home')}>Home nodes</Chip>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-auto pr-1">
            {visible.length === 0 && <p className="px-1 text-sm text-mist">No chargers match that filter.</p>}
            {visible.map((node) => (
              <button
                key={node.id}
                type="button"
                onClick={() => dispatch({ type: 'SELECT', id: node.id })}
                className={cx(
                  'w-full rounded-2xl border px-3 py-2.5 text-left',
                  node.id === selected?.id ? 'border-lime/50 bg-lime/10' : 'border-white/10 hover:border-white/20',
                )}
              >
                <span className="flex items-center justify-between gap-3">
                  <span>
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <StatusDot status={node.status} />
                      {node.name}
                      {node.origin === 'private' && (
                        <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-mist">
                          Home
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-[11px] text-mist">
                      {node.district} · {node.distanceMi.toFixed(1)} mi · {node.kw} kW · {node.connector}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="num block text-sm">{node.price.toFixed(2)}</span>
                    <span className="block text-[10px] uppercase tracking-wide text-mist">USDC/kWh</span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Detail({ node }: { node: ChargeNode }) {
  const { state, dispatch } = useStore()
  const liveHere = state.session?.active && state.session.nodeId === node.id
  const blocked = state.session?.active && !liveHere
  const rate = perMinute(node)
  let label = 'Start session'
  if (!state.wallet && node.status === 'available' && !blocked) label = 'Connect and start'
  if (liveHere) label = 'Return to session'
  if (blocked) label = 'Session in progress'
  if (!state.session?.active && node.status === 'charging') label = 'Charger in use'
  if (!state.session?.active && node.status === 'offline') label = 'Offline'

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mist">{node.district}</div>
          <h2 className="font-display text-2xl font-semibold leading-tight">{node.name}</h2>
          <p className="mt-1 text-xs text-mist">
            {node.host} · {node.rating.toFixed(1)} · {statusLabel(node.status)}
          </p>
        </div>
        <div className="text-right">
          <div className="num text-xl">{node.price.toFixed(2)}</div>
          <div className="text-[10px] uppercase tracking-wide text-mist">USDC / kWh</div>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <Mini k="Power" v={`${node.kw} kW`} />
        <Mini k="Plug" v={node.connector} />
        <Mini k="Uptime" v={`${node.uptime.toFixed(1)}%`} />
      </dl>
      <p className="mt-3 text-xs text-mist">About {usdc(rate)} USDC per minute at {node.kw} kW.</p>
      <Button
        className="mt-3 w-full"
        disabled={blocked || (!liveHere && node.status !== 'available')}
        onClick={() => {
          if (liveHere) {
            dispatch({ type: 'NAV', view: 'session' })
            return
          }
          dispatch({ type: 'START', id: node.id })
        }}
      >
        {label}
      </Button>
    </div>
  )
}

function Mini({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl bg-black/25 px-2 py-2">
      <div className="text-[10px] uppercase tracking-wide text-mist">{k}</div>
      <div className="num mt-0.5 text-sm">{v}</div>
    </div>
  )
}
