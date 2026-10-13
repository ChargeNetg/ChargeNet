import { aprLabel, yourShares } from '../lib/econ'
import { duration, kwh, usdc } from '../lib/format'
import { useStore } from '../store'
import { Button, PageHeader } from '../components/Ui'

export function Portfolio() {
  const { state, dispatch } = useStore()

  if (!state.wallet) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-lime">Portfolio</div>
        <h1 className="mt-2 font-display text-3xl font-semibold">Hold a node to earn its stream</h1>
        <p className="mt-2 text-sm text-mist">Connect a wallet, then buy shares or list a charger you already own.</p>
        <Button className="mt-5" onClick={() => dispatch({ type: 'OPEN_WALLET', pending: null })}>
          Connect wallet
        </Button>
      </div>
    )
  }

  const hasYield = state.holdings.some((holding) => {
    const node = state.nodes.find((item) => item.id === holding.nodeId)
    return Boolean(node && node.yield30d > 0)
  })
  const sessionNode = state.nodes.find((node) => node.id === state.session?.nodeId)
  const liveCut = Boolean(
    state.session?.active && sessionNode && sessionNode.yield30d <= 0 && yourShares(state.holdings, sessionNode.id) > 0,
  )

  return (
    <div>
      <PageHeader
        eyebrow="Portfolio"
        title="Your nodes"
        lede="Shares pay you from the USDC each charger streams. Claim sends that balance back to your wallet."
      />

      <section className="card flex flex-wrap items-end justify-between gap-4 p-5">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mist">Unclaimed</div>
          <div className="num mt-1 text-5xl text-lime">{usdc(state.claimable, 4)}</div>
          <div className="text-sm text-mist">USDC</div>
          <p className="mt-2 max-w-md text-xs text-mist">
            {liveCut
              ? 'Your cut of the live session is accruing here.'
              : hasYield
                ? 'Timing in this preview is compressed so the stream is visible.'
                : 'Flow shows up here after a paid session on a node you hold.'}
          </p>
        </div>
        <div className="text-right">
          <div className="num text-sm text-mist">{usdc(state.wallet.usdc)} USDC in wallet</div>
          <Button className="mt-3" disabled={state.claimable < 0.01} onClick={() => dispatch({ type: 'CLAIM' })}>
            {state.claimable < 0.01 ? 'Accruing' : `Claim ${usdc(state.claimable)} USDC`}
          </Button>
        </div>
      </section>

      {state.holdings.length === 0 ? (
        <div className="card mt-4 p-6">
          <h2 className="font-display text-2xl font-semibold">No shares yet</h2>
          <p className="mt-2 max-w-lg text-sm text-mist">
            Buy a fraction of a public charger, or publish one you host. Either way the position lands here.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => dispatch({ type: 'NAV', view: 'nodes' })}>Browse nodes</Button>
            <Button variant="ghost" onClick={() => dispatch({ type: 'NAV', view: 'host' })}>
              List a charger
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {state.holdings.map((holding) => {
            const node = state.nodes.find((item) => item.id === holding.nodeId)
            if (!node) return null
            const flow = (node.yield30d * holding.shares) / 100
            return (
              <article key={holding.nodeId} className="card relative overflow-hidden p-4">
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.16em] text-lime">
                  <span>{holding.operator ? 'Operator share' : 'Node share'}</span>
                  <span className="num text-mist">{node.id}</span>
                </div>
                <h2 className="mt-3 font-display text-2xl font-semibold">{node.name}</h2>
                <p className="text-sm text-mist">{node.district}</p>
                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-mist">Shares</div>
                    <div className="num text-4xl">{holding.shares}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] uppercase tracking-wide text-mist">30d to you</div>
                    <div className="num text-lg">{node.yield30d > 0 ? `${usdc(flow)} USDC` : 'New'}</div>
                    <div className="text-[11px] text-mist">{aprLabel(node)} trailing</div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="mt-4 w-full"
                  onClick={() => {
                    dispatch({ type: 'SELECT', id: node.id })
                    dispatch({ type: 'NAV', view: 'charge' })
                  }}
                >
                  Open on the map
                </Button>
              </article>
            )
          })}
        </div>
      )}

      {state.history.length > 0 && (
        <section className="mt-6">
          <h2 className="font-display text-2xl font-semibold">Your sessions</h2>
          <ul className="mt-3 space-y-2">
            {state.history.map((receipt) => (
              <li key={receipt.id} className="card flex items-center justify-between gap-3 px-4 py-3">
                <span>
                  <span className="block font-semibold">{receipt.nodeName}</span>
                  <span className="text-xs text-mist">
                    {kwh(receipt.kwh)} kWh · {duration(receipt.elapsed)}
                    {receipt.you > 0.0001 ? ` · your cut ${usdc(receipt.you)} USDC` : ''}
                  </span>
                </span>
                <span className="num text-lime">{usdc(receipt.spent)} USDC</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
