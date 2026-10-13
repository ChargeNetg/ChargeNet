import { useEffect, useMemo, useState } from 'react'
import { SOL_USD } from '../lib/constants'
import { aprLabel, defaultShares, sharePrice, trailingApr, yourShares } from '../lib/econ'
import { cx } from '../lib/cx'
import { sol, usd, usdc } from '../lib/format'
import { useStore } from '../store'
import type { ChargeNode } from '../types'
import { Button, Chip, Modal, PageHeader, SplitBar, statusLabel } from '../components/Ui'

type Filter = 'all' | 'fast' | 'level2' | 'home' | 'sale'

export function Nodes() {
  const { state, dispatch } = useStore()
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const buyNode = state.nodes.find((node) => node.id === state.buyNodeId) ?? null

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.nodes
      .filter((node) => {
        if (filter === 'fast' && node.kind !== 'DC Fast') return false
        if (filter === 'level2' && node.kind !== 'Level 2') return false
        if (filter === 'home' && node.origin !== 'private') return false
        if (filter === 'sale' && node.available < 1) return false
        if (!q) return true
        return `${node.name} ${node.district} ${node.host}`.toLowerCase().includes(q)
      })
      .sort((a, b) => (trailingApr(b) ?? -1) - (trailingApr(a) ?? -1))
  }, [filter, query, state.nodes])

  return (
    <div>
      <PageHeader
        eyebrow="Assets"
        title="Node market"
        lede="Every charger is a tokenized asset on Solana. A share is a claim on the USDC that charger streams."
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search nodes"
          className="w-full rounded-full border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-lime/60 sm:w-64"
        />
        <Chip active={filter === 'all'} onClick={() => setFilter('all')}>All</Chip>
        <Chip active={filter === 'fast'} onClick={() => setFilter('fast')}>DC Fast</Chip>
        <Chip active={filter === 'level2'} onClick={() => setFilter('level2')}>Level 2</Chip>
        <Chip active={filter === 'home'} onClick={() => setFilter('home')}>Home</Chip>
        <Chip active={filter === 'sale'} onClick={() => setFilter('sale')}>For sale</Chip>
      </div>
      {visible.length === 0 && <p className="text-sm text-mist">No nodes match that filter.</p>}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((node) => {
          const owned = yourShares(state.holdings, node.id)
          return (
            <button
              key={node.id}
              type="button"
              onClick={() => dispatch({ type: 'OPEN_BUY', id: node.id })}
              className="card p-4 text-left hover:border-white/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-mist">
                    {node.district} · {node.kind}
                    {node.origin === 'private' ? ' · Home' : ''}
                    {node.userOperated ? ' · Yours' : ''}
                  </div>
                  <h2 className="mt-1 font-display text-2xl font-semibold leading-tight">{node.name}</h2>
                </div>
                <div className="text-right">
                  <div className="num text-xl text-lime">{aprLabel(node)}</div>
                  <div className="text-[10px] uppercase tracking-wide text-mist">Trailing yield</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <Mini k="Per share" v={`${sol(sharePrice(node))} SOL`} />
                <Mini k="30d flow / share" v={`${usdc(node.yield30d / 100)} USDC`} />
              </div>
              <div className="mt-4">
                <SplitBar you={owned} operator={node.operatorShares} holders={node.investorShares} sale={node.available} />
              </div>
              <div className="mt-3 text-xs text-mist">
                {node.available > 0 ? `${node.available} shares for sale` : 'Fully allocated'} · {statusLabel(node.status)}
              </div>
            </button>
          )
        })}
      </div>
      {buyNode && <BuyDialog node={buyNode} />}
    </div>
  )
}

function BuyDialog({ node }: { node: ChargeNode }) {
  const { state, dispatch } = useStore()
  const owned = yourShares(state.holdings, node.id)
  const [shares, setShares] = useState(() => defaultShares(node))

  useEffect(() => {
    setShares(defaultShares(node))
  }, [node])

  const price = sharePrice(node) * shares
  const affordable = !state.wallet || state.wallet.sol + 1e-9 >= price
  const canBuy = node.available > 0 && !node.userOperated && shares > 0 && affordable

  return (
    <Modal title={node.name} wide onClose={() => dispatch({ type: 'CLOSE_BUY' })}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-lime">{node.id}</div>
      <h2 className="mt-1 font-display text-3xl font-semibold">{node.name}</h2>
      <p className="mt-1 text-sm text-mist">
        {node.host} · {node.district} · {node.kw} kW {node.connector} · {statusLabel(node.status)}
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <Mini k="Full node" v={`${node.priceSol} SOL`} />
        <Mini k="Trailing yield" v={aprLabel(node)} />
        <Mini k="30d flow" v={`${usdc(node.yield30d, 0)} USDC`} />
      </div>
      <p className="mt-2 text-[11px] text-mist">
        Full node value about {usd(node.priceSol * SOL_USD)} at SOL ${SOL_USD}. Yield is the last 30 days of streamed revenue, annualized.
      </p>
      <div className="mt-4">
        <SplitBar
          you={owned}
          operator={node.operatorShares}
          holders={node.investorShares}
          sale={node.available}
          youLabel={node.userOperated ? 'You · operator' : 'You'}
        />
      </div>
      {node.available > 0 && (
        <p className="mt-2 text-[11px] text-mist">Until a share is sold, its flow stays with the operator.</p>
      )}

      {node.userOperated ? (
        <p className="mt-4 text-sm">You operate this node and keep {owned} shares.</p>
      ) : node.available < 1 ? (
        <p className="mt-4 text-sm text-mist">Every share of this node is already held.</p>
      ) : (
        <>
          <div className="mt-5 flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-mist">Shares to buy</div>
              <div className="num text-4xl">{shares}</div>
            </div>
            <div className="flex gap-2">
              <button type="button" className="h-10 w-10 rounded-full border border-white/15 text-lg" onClick={() => setShares((n) => Math.max(1, n - 1))}>
                −
              </button>
              <button
                type="button"
                className="h-10 w-10 rounded-full border border-white/15 text-lg"
                onClick={() => setShares((n) => Math.min(node.available, n + 1))}
              >
                +
              </button>
            </div>
          </div>
          <input
            className="mt-3 w-full accent-lime"
            type="range"
            min={1}
            max={node.available}
            value={shares}
            onChange={(event) => setShares(Number(event.target.value))}
          />
          <p className="mt-3 text-sm text-mist">
            These shares are {shares}% of the node. On a 10 USDC session they receive {usdc((shares / 100) * 10)} USDC.
          </p>
          {owned > 0 && <p className="mt-1 text-xs text-lime">You already hold {owned} shares.</p>}
          <div className="mt-4 flex items-end justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-mist">Cost</div>
              <div className="num text-2xl">{sol(price)} SOL</div>
              <div className="text-xs text-mist">{usd(price * SOL_USD)}</div>
            </div>
            <div className="text-right text-xs text-mist">
              <div>Wallet</div>
              <div className={cx('num text-sm', affordable ? 'text-paper' : 'text-red-300')}>
                {state.wallet ? `${sol(state.wallet.sol)} SOL` : 'Not connected'}
              </div>
            </div>
          </div>
        </>
      )}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        {canBuy && (
          <Button
            className="flex-1"
            onClick={() => dispatch({ type: 'BUY', id: node.id, shares })}
          >
            {state.wallet ? `Buy ${shares} shares` : 'Connect and buy'}
          </Button>
        )}
        <Button variant="ghost" className="flex-1" onClick={() => dispatch({ type: 'CLOSE_BUY' })}>
          Close
        </Button>
      </div>
    </Modal>
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
