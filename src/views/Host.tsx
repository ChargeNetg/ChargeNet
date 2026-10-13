import { useState } from 'react'
import { SOL_USD } from '../lib/constants'
import { capitalization, connectorFor, kindFor } from '../lib/econ'
import { usd, usdc } from '../lib/format'
import { useStore } from '../store'
import { Button, PageHeader, SplitBar } from '../components/Ui'

const POWERS = [7.4, 11, 22, 50, 150]

export function Host() {
  const { dispatch } = useStore()
  const [name, setName] = useState('Cedar Lane charger')
  const [area, setArea] = useState('Cedar Lane')
  const [kw, setKw] = useState(11)
  const [rate, setRate] = useState('0.26')
  const [floatShares, setFloatShares] = useState(40)
  const keep = 100 - floatShares
  const price = Number(rate)
  const cap = capitalization(kw)

  return (
    <div>
      <PageHeader
        eyebrow="Host"
        title="List a charger"
        lede="Turn a private charger into a public node. You set the driver rate, float shares to the network, and keep the rest of the flow."
      />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
        <form
          className="card space-y-4 p-5"
          onSubmit={(event) => {
            event.preventDefault()
            const parsed = Number(rate)
            if (!name.trim() || !area.trim()) {
              dispatch({ type: 'TOAST', text: 'Name the charger and its street' })
              return
            }
            if (!Number.isFinite(parsed) || parsed < 0.05 || parsed > 2) {
              dispatch({ type: 'TOAST', text: 'Set a driver rate between 0.05 and 2.00 USDC' })
              return
            }
            dispatch({
              type: 'PUBLISH',
              draft: { name, area, kw, price: parsed, floatShares },
            })
          }}
        >
          <label className="block text-sm">
            <span className="mb-1 block text-mist">Charger name</span>
            <input className={field} value={name} onChange={(event) => setName(event.target.value)} maxLength={48} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-mist">Street or place</span>
            <input className={field} value={area} onChange={(event) => setArea(event.target.value)} maxLength={48} />
          </label>
          <div>
            <div className="mb-2 text-sm text-mist">Power</div>
            <div className="flex flex-wrap gap-2">
              {POWERS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setKw(value)}
                  className={
                    value === kw
                      ? 'rounded-full bg-lime px-3 py-1.5 text-xs font-semibold text-ink'
                      : 'rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold text-mist'
                  }
                >
                  {value} kW
                </button>
              ))}
            </div>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-mist">Driver rate, USDC per kWh</span>
            <input
              className={field}
              inputMode="decimal"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
            />
          </label>
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-mist">Shares floated</span>
              <span className="num">
                {floatShares} floated · {keep} kept
              </span>
            </div>
            <input
              className="mt-2 w-full accent-lime"
              type="range"
              min={0}
              max={80}
              value={floatShares}
              onChange={(event) => setFloatShares(Number(event.target.value))}
            />
            <p className="mt-2 text-xs text-mist">You keep at least 20%. Floated shares join the holder pool in this demo.</p>
          </div>
          <Button type="submit" className="w-full">
            Publish node
          </Button>
        </form>

        <aside className="card p-5 lg:sticky lg:top-24">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-lime">Preview</div>
          <h2 className="mt-2 font-display text-3xl font-semibold">{name || 'Untitled charger'}</h2>
          <p className="mt-1 text-sm text-mist">
            {area || 'Location'} · {kindFor(kw)} · {connectorFor(kw)} · You
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <Mini k="Driver rate" v={Number.isFinite(price) ? `${price.toFixed(2)} USDC` : '—'} />
            <Mini k="Node value" v={`${cap} SOL`} />
          </div>
          <p className="mt-2 text-xs text-mist">About {usd(cap * SOL_USD)} at SOL ${SOL_USD}.</p>
          <div className="mt-4">
            <SplitBar you={keep} operator={0} holders={floatShares} sale={0} youLabel="You · operator" />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-mist">
            Drivers pay {Number.isFinite(price) ? usdc(price) : '—'} USDC per kWh. You earn {keep}% of every session. Holders earn the other {floatShares}%.
          </p>
          <p className="mt-3 text-xs text-mist">Publishing mints the node into your portfolio. No SOL leaves the wallet.</p>
        </aside>
      </div>
    </div>
  )
}

const field = 'w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm outline-none focus:border-lime/70'

function Mini({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl bg-black/25 px-2 py-2">
      <div className="text-[10px] uppercase tracking-wide text-mist">{k}</div>
      <div className="num mt-0.5 text-sm">{v}</div>
    </div>
  )
}
