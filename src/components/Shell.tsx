import { useEffect, useState } from 'react'
import { SOL_USD } from '../lib/constants'
import { cx } from '../lib/cx'
import { sol, usdc } from '../lib/format'
import { short } from '../lib/sig'
import { useStore } from '../store'
import type { View } from '../types'
import { Logo } from './Ui'
import { WalletModal } from './WalletModal'
import { Overview } from '../views/Overview'
import { Charge } from '../views/Charge'
import { Session } from '../views/Session'
import { Receipt } from '../views/Receipt'
import { Nodes } from '../views/Nodes'
import { Host } from '../views/Host'
import { Portfolio } from '../views/Portfolio'

const NAV: { id: View; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'charge', label: 'Charge' },
  { id: 'nodes', label: 'Nodes' },
  { id: 'host', label: 'Host' },
  { id: 'portfolio', label: 'Portfolio' },
]

function Page() {
  const { state } = useStore()
  switch (state.view) {
    case 'overview':
      return <Overview />
    case 'charge':
      return <Charge />
    case 'session':
      return <Session />
    case 'receipt':
      return <Receipt />
    case 'nodes':
      return <Nodes />
    case 'host':
      return <Host />
    case 'portfolio':
      return <Portfolio />
  }
}

function navActive(view: View, id: View) {
  if (view === id) return true
  if ((view === 'session' || view === 'receipt') && id === 'charge') return true
  return false
}

export function Shell() {
  const { state, dispatch } = useStore()
  const [menu, setMenu] = useState(false)
  const sessionNode = state.nodes.find((node) => node.id === state.session?.nodeId)

  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(false)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [menu])

  return (
    <div className="relative min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#070b12]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1240px] items-center gap-3 px-5 py-3">
          <button type="button" className="flex items-center gap-2.5" onClick={() => dispatch({ type: 'NAV', view: 'overview' })}>
            <Logo />
            <span className="font-display text-lg font-semibold tracking-tight">ChargeNet</span>
          </button>
          <nav className="ml-2 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-current={navActive(state.view, item.id) ? 'page' : undefined}
                onClick={() => dispatch({ type: 'NAV', view: item.id })}
                className={cx(
                  'rounded-full px-3 py-1.5 text-sm font-semibold',
                  navActive(state.view, item.id) ? 'bg-white/10 text-paper' : 'text-mist hover:text-paper',
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="hidden items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-mist xl:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime opacity-60" />
              <span className="relative h-2 w-2 rounded-full bg-lime" />
            </span>
            Solana · SOL ${SOL_USD}
          </div>
          {state.wallet ? (
            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3"
                onClick={(event) => {
                  event.stopPropagation()
                  setMenu((open) => !open)
                }}
              >
                <span className="h-8 w-8 rounded-full bg-gradient-to-br from-lime to-[#1e4f93]" />
                <span className="hidden text-left sm:block">
                  <span className="num block text-[11px] leading-tight">{short(state.wallet.address, 4, 4)}</span>
                  <span className={cx('num block text-[11px] leading-tight', state.session?.active ? 'text-lime' : 'text-mist')}>
                    {sol(state.wallet.sol)} SOL · {usdc(state.wallet.usdc, state.session?.active ? 3 : 2)} USDC
                  </span>
                </span>
              </button>
              {menu && (
                <div className="absolute right-0 top-12 z-40 w-64 rounded-2xl border border-white/10 bg-[#121822] p-3 shadow-2xl">
                  <div className="num break-all text-[11px] text-mist">{state.wallet.address}</div>
                  <div className="num mt-3 text-sm">{sol(state.wallet.sol)} SOL</div>
                  <div className="num text-sm text-lime">{usdc(state.wallet.usdc, 2)} USDC</div>
                  <button
                    type="button"
                    className="mt-3 w-full rounded-full border border-white/10 px-3 py-2 text-sm"
                    onClick={(event) => {
                      event.stopPropagation()
                      navigator.clipboard?.writeText(state.wallet?.address ?? '').then(
                        () => dispatch({ type: 'TOAST', text: 'Address copied' }),
                        () => dispatch({ type: 'TOAST', text: 'Copy is unavailable in this browser' }),
                      )
                      setMenu(false)
                    }}
                  >
                    Copy address
                  </button>
                  <button
                    type="button"
                    className="mt-2 w-full rounded-full px-3 py-2 text-sm text-mist hover:text-paper"
                    onClick={(event) => {
                      event.stopPropagation()
                      setMenu(false)
                      dispatch({ type: 'DISCONNECT' })
                    }}
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="rounded-full bg-lime px-4 py-2 text-sm font-semibold text-ink"
              onClick={() => dispatch({ type: 'OPEN_WALLET', pending: null })}
            >
              Connect wallet
            </button>
          )}
        </div>
      </header>

      {state.session?.active && state.view !== 'session' && (
        <div className="mx-auto mt-4 max-w-[1240px] px-5">
          <button
            type="button"
            onClick={() => dispatch({ type: 'NAV', view: 'session' })}
            className="flex w-full items-center justify-between rounded-full border border-lime/30 bg-lime/10 px-4 py-2 text-sm"
          >
            <span>Session live · {sessionNode?.name}</span>
            <span className="num text-lime">{usdc(state.session.spent, 4)} USDC</span>
          </button>
        </div>
      )}

      <main className="mx-auto max-w-[1240px] px-5 py-6">
        <div key={state.view} className="view-in">
          <Page />
        </div>
      </main>

      <footer className="mx-auto max-w-[1240px] px-5 pb-8 text-center text-[11px] text-white/35">
        ChargeNet demo · Simulated Solana balances and settlements · No real funds move
      </footer>

      <div className="pointer-events-none fixed bottom-5 left-1/2 z-50 flex w-[min(92vw,420px)] -translate-x-1/2 flex-col gap-2">
        {state.toasts.slice(0, 3).map((toast) => (
          <div key={toast.id} className="pointer-events-auto rounded-full border border-white/10 bg-[#161b26]/95 px-4 py-2 text-center text-sm shadow-lg backdrop-blur">
            {toast.text}
          </div>
        ))}
      </div>
      <WalletModal />
    </div>
  )
}
