import { SOL_USD } from '../lib/constants'
import { ago, kwh, usdc } from '../lib/format'
import { short } from '../lib/sig'
import { useNow } from '../lib/useNow'
import { useStore } from '../store'
import { MapPanel } from '../components/MapPanel'
import { Button } from '../components/Ui'

export function Overview() {
  const { state, dispatch } = useStore()
  const now = useNow()
  const live = state.nodes.filter((node) => node.status !== 'offline').length

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-lime">Solana network</div>
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Charge in public.
            <br />
            Settle in a stream.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-mist sm:text-base">
            Private chargers become nodes. Drivers pay USDC for the energy they use, second by second. Node shares let anyone own a piece of that flow.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => dispatch({ type: 'NAV', view: 'charge' })}>Start charging</Button>
          <Button variant="ghost" onClick={() => dispatch({ type: 'NAV', view: 'nodes' })}>
            Own a node
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Nodes live" value={String(live)} hint="Sites and home chargers" />
        <Stat label="Energy today" value={`${state.energyMwh.toFixed(2)} MWh`} hint="Delivered on the network" />
        <Stat label="USDC streamed" value={Math.round(state.streamedUsdc).toLocaleString('en-US')} hint="Settled to nodes today" />
        <Stat label="Settlement" value={`${state.latencyMs} ms`} hint={`Median on Solana · SOL $${SOL_USD}`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.75fr)]">
        <MapPanel
          className="h-[420px]"
          nodes={state.nodes}
          selectedId={state.selectedNodeId}
          onSelect={(id) => {
            dispatch({ type: 'SELECT', id })
            dispatch({ type: 'NAV', view: 'charge' })
          }}
        />
        <section className="card flex h-[420px] flex-col p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold">Streaming now</h2>
            <span className="text-[11px] uppercase tracking-[0.14em] text-mist">Settled sessions</span>
          </div>
          <ul className="min-h-0 flex-1 space-y-1 overflow-auto">
            {state.tape.map((event) => (
              <li key={event.id} className="row-in">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2 text-left hover:bg-white/5"
                  onClick={() => {
                    dispatch({ type: 'SELECT', id: event.nodeId })
                    dispatch({ type: 'NAV', view: 'charge' })
                  }}
                >
                  <span>
                    <span className="block text-sm font-semibold">{event.nodeName}</span>
                    <span className="mt-0.5 block text-[11px] text-mist">
                      {kwh(event.kwh)} kWh · {ago(event.at, now)} · {short(event.sig)}
                    </span>
                  </span>
                  <span className="num text-sm text-lime">+{usdc(event.usdc)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Feature
          title="Stream payments"
          body="A session has no invoice. USDC moves while the cable is live and stops when you unplug."
          action="Find a charger"
          onClick={() => dispatch({ type: 'NAV', view: 'charge' })}
        />
        <Feature
          title="Own a node"
          body="Each charger is a tokenized asset. Buy shares and take that fraction of what it streams."
          action="Browse nodes"
          onClick={() => dispatch({ type: 'NAV', view: 'nodes' })}
        />
        <Feature
          title="Host a charger"
          body="Set the rate, float as many shares as you want, and keep the rest. A driveway can join the network."
          action="List a charger"
          onClick={() => dispatch({ type: 'NAV', view: 'host' })}
        />
      </div>
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="card px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mist">{label}</div>
      <div className="num mt-1 text-2xl text-paper">{value}</div>
      <div className="mt-1 text-xs text-mist">{hint}</div>
    </div>
  )
}

function Feature({ title, body, action, onClick }: { title: string; body: string; action: string; onClick: () => void }) {
  return (
    <article className="card flex flex-col p-4">
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-mist">{body}</p>
      <button type="button" onClick={onClick} className="mt-4 text-left text-sm font-semibold text-lime">
        {action} →
      </button>
    </article>
  )
}
