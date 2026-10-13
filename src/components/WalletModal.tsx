import { useEffect, useState } from 'react'
import { useStore } from '../store'

const WALLETS = [
  { id: 'phantom', name: 'Phantom', color: '#ab9ff2' },
  { id: 'solflare', name: 'Solflare', color: '#fc7227' },
  { id: 'backpack', name: 'Backpack', color: '#e33e3f' },
]

export function WalletModal() {
  const { state, dispatch } = useStore()
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    if (!busy) return
    const id = window.setTimeout(() => dispatch({ type: 'CONNECT' }), 680)
    return () => window.clearTimeout(id)
  }, [busy, dispatch])

  useEffect(() => {
    if (!state.walletOpen) setBusy(null)
  }, [state.walletOpen])

  if (!state.walletOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={() => dispatch({ type: 'CLOSE_WALLET' })}
    >
      <div
        className="card w-full max-w-md p-5"
        role="dialog"
        aria-modal="true"
        aria-label="Connect wallet"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-lime">Solana</div>
        <h2 className="mt-2 font-display text-2xl font-semibold">Connect a wallet</h2>
        <p className="mt-2 text-sm leading-relaxed text-mist">
          Pick a wallet to use the simulated account. Nothing is signed and no transaction is broadcast.
        </p>
        <div className="mt-4 space-y-2">
          {WALLETS.map((wallet) => (
            <button
              key={wallet.id}
              type="button"
              disabled={busy !== null}
              onClick={() => setBusy(wallet.id)}
              className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-left hover:border-white/25 disabled:opacity-60"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-ink" style={{ background: wallet.color }}>
                {wallet.name.slice(0, 1)}
              </span>
              <span className="flex-1">
                <span className="block font-semibold">{wallet.name}</span>
                <span className="block text-xs text-mist">{busy === wallet.id ? 'Connecting…' : 'Simulated'}</span>
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="mt-4 text-sm text-mist hover:text-paper"
          onClick={() => dispatch({ type: 'CLOSE_WALLET' })}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
