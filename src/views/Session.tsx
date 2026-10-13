import { START_SOC } from '../lib/constants'
import { perMinute, socFromKwh, yourShares } from '../lib/econ'
import { ago, duration, kwh, usdc } from '../lib/format'
import { short } from '../lib/sig'
import { useNow } from '../lib/useNow'
import { useStore } from '../store'
import { Button } from '../components/Ui'
import type { SessionLog } from '../types'

export function Session() {
  const { state, dispatch } = useStore()
  const now = useNow(500)
  const session = state.session
  const node = state.nodes.find((item) => item.id === session?.nodeId)

  if (!session?.active || !node) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <h1 className="font-display text-3xl font-semibold">No live session</h1>
        <p className="mt-2 text-sm text-mist">Pick a charger to open a streamed payment.</p>
        <Button className="mt-5" onClick={() => dispatch({ type: 'NAV', view: 'charge' })}>
          Find a charger
        </Button>
      </div>
    )
  }

  const soc = socFromKwh(session.kwh)
  const yours = yourShares(state.holdings, node.id)
  const radius = 92
  const circ = 2 * Math.PI * radius

  return (
    <div className="card relative overflow-hidden p-5 sm:p-8">
      <div className="sheen" />
      <div className="grid items-center gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="flex flex-col items-center">
          <div className="relative h-64 w-64">
            <div className="gauge-glow absolute inset-4 rounded-full" />
            <svg viewBox="0 0 220 220" className="h-full w-full">
              <circle cx="110" cy="110" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
              <circle
                cx="110"
                cy="110"
                r={radius}
                fill="none"
                stroke="#3aa0ff"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={circ * (1 - soc / 100)}
                transform="rotate(-90 110 110)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="num text-5xl">{soc.toFixed(1)}%</div>
              <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-mist">State of charge</div>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-mist">
            Plugged in at {START_SOC}% · {kwh(session.kwh)} kWh added · 75 kWh pack
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-lime">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime opacity-70" />
              <span className="relative h-2 w-2 rounded-full bg-lime" />
            </span>
            Live session
          </div>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">{node.name}</h1>
          <p className="mt-1 text-sm text-mist">
            {node.district} · {node.connector} · {node.kw} kW · {node.host}
          </p>
          <div className="num mt-6 text-5xl text-lime sm:text-6xl">{usdc(session.spent, 4)}</div>
          <div className="text-sm text-mist">USDC streamed to this node</div>
          <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Cell k="Elapsed" v={duration(session.elapsed)} />
            <Cell k="Output" v={`${session.power.toFixed(0)} kW`} />
            <Cell k="Rate" v={`${usdc(perMinute(node))} / min`} />
            <Cell k="Settlements" v={String(session.logs.length)} />
          </dl>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-3">
            <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-mist">
              <span>Settlement stream</span>
              <span>USDC · EPjF…Dt1v</span>
            </div>
            {session.pending > 0.0001 && (
              <div className="flex items-center justify-between border-b border-white/5 py-2 text-sm text-mist">
                <span>Settling {usdc(session.pending, 4)} USDC</span>
                <span>now</span>
              </div>
            )}
            <ul>
              {session.logs.slice(0, 5).map((log) => (
                <li key={log.id} className="row-in flex items-start justify-between gap-3 border-b border-white/5 py-2 last:border-0">
                  <span>
                    <span className="num block text-sm text-lime">+{usdc(log.amount, 4)} USDC</span>
                    <span className="mt-0.5 block text-[11px] text-mist">{splitLine(log)}</span>
                  </span>
                  <span className="text-right">
                    <span className="block text-[11px] text-mist">{ago(log.at, now)}</span>
                    <span className="num block text-[11px] text-white/35">{short(log.sig)}</span>
                  </span>
                </li>
              ))}
              {session.logs.length === 0 && session.pending <= 0.0001 && (
                <li className="py-3 text-sm text-mist">Waiting for the first settlement.</li>
              )}
            </ul>
            {node.available > 0 && (
              <p className="pt-2 text-[11px] text-mist">Unsold shares still pay the operator.</p>
            )}
            {yours > 0 && (
              <p className="pt-1 text-[11px] text-lime">You hold {yours} shares of this node.</p>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => dispatch({ type: 'END' })}>End session</Button>
            <Button variant="ghost" onClick={() => dispatch({ type: 'NAV', view: 'charge' })}>
              Back to map
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-mist">Leaving this screen does not stop the stream.</p>
        </div>
      </div>
    </div>
  )
}

function splitLine(log: SessionLog) {
  const parts: string[] = []
  if (log.you > 0.0001) parts.push(`You ${usdc(log.you, 4)}`)
  if (log.others > 0.0001) parts.push(`Holders ${usdc(log.others, 4)}`)
  if (log.operator > 0.0001) parts.push(`Operator ${usdc(log.operator, 4)}`)
  return parts.join(' · ')
}

function Cell({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl bg-black/25 px-2 py-2">
      <div className="text-[10px] uppercase tracking-wide text-mist">{k}</div>
      <div className="num mt-0.5 text-sm">{v}</div>
    </div>
  )
}
