import { START_SOC } from '../lib/constants'
import { socFromKwh, yourShares } from '../lib/econ'
import { duration, kwh, usdc } from '../lib/format'
import { short } from '../lib/sig'
import { useStore } from '../store'
import { Button } from '../components/Ui'

export function Receipt() {
  const { state, dispatch } = useStore()
  const receipt = state.receipt
  const node = state.nodes.find((item) => item.id === receipt?.nodeId)
  if (!receipt) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <h1 className="font-display text-3xl font-semibold">No receipt yet</h1>
        <Button className="mt-5" onClick={() => dispatch({ type: 'NAV', view: 'charge' })}>
          Find a charger
        </Button>
      </div>
    )
  }

  const end = socFromKwh(receipt.kwh)
  const owns = yourShares(state.holdings, receipt.nodeId)
  const canBuy = Boolean(node && node.available > 0 && !node.userOperated)

  return (
    <div className="mx-auto max-w-lg">
      <div className="card p-6 sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lime text-ink">
          <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden>
            <path d="M5 12.5 9.2 17 19 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="mt-4 text-center font-display text-3xl font-semibold">Session settled</h1>
        <p className="mt-2 text-center text-sm text-mist">
          {receipt.nodeName} · charge moved from {START_SOC}% to {end.toFixed(0)}%
        </p>
        <div className="num mt-6 text-center text-5xl text-lime">{usdc(receipt.spent)}</div>
        <div className="text-center text-xs uppercase tracking-[0.16em] text-mist">USDC streamed</div>

        <dl className="mt-6 space-y-2 text-sm">
          <Row k="Energy" v={`${kwh(receipt.kwh)} kWh`} />
          <Row k="Time on cable" v={duration(receipt.elapsed)} />
          <Row k="Rated power" v={`${receipt.kw} kW`} />
          <Row k="Price" v={`${receipt.price.toFixed(2)} USDC / kWh`} />
          <Row k="Settlements" v={String(receipt.settlements)} />
          <div className="h-px bg-white/10" />
          {receipt.operator > 0.0001 && <Row k={receipt.host} v={`${usdc(receipt.operator)} USDC`} />}
          {receipt.others > 0.0001 && <Row k="Other holders" v={`${usdc(receipt.others)} USDC`} />}
          {receipt.you > 0.0001 && <Row k="Your share" v={`${usdc(receipt.you)} USDC`} />}
          {owns === 0 && <p className="text-xs text-mist">You do not hold this node yet.</p>}
          <div className="h-px bg-white/10" />
          <div className="flex items-center justify-between gap-3 text-xs text-mist">
            <span>Closing signature</span>
            <span className="num">{short(receipt.sig, 6, 6)}</span>
          </div>
        </dl>

        <div className="mt-6 flex flex-col gap-2">
          {canBuy && (
            <Button onClick={() => dispatch({ type: 'OPEN_BUY', id: receipt.nodeId })}>Own shares in this node</Button>
          )}
          {owns > 0 && (
            <Button variant={canBuy ? 'ghost' : 'primary'} onClick={() => dispatch({ type: 'NAV', view: 'portfolio' })}>
              View portfolio
            </Button>
          )}
          <Button variant="ghost" onClick={() => dispatch({ type: 'DISMISS_RECEIPT' })}>
            Back to chargers
          </Button>
        </div>
      </div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-mist">{k}</dt>
      <dd className="num">{v}</dd>
    </div>
  )
}
