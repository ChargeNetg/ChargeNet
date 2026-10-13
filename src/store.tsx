import { createContext, useContext, useEffect, useReducer, useRef, type Dispatch, type ReactNode } from 'react'
import { initialTape, NODES } from './data'
import { DEMO_ADDRESS, DEMO_SOL, DEMO_USDC, FLOW_KWH_PER_SEC, PACK_KWH, START_SOC } from './lib/constants'
import {
  capitalization,
  connectorFor,
  kindFor,
  revenueSplit,
  sharePrice,
  socFromKwh,
  yieldPerSec,
  yourShares,
} from './lib/econ'
import { usdc } from './lib/format'
import { fakeSig } from './lib/sig'
import type {
  ChargeNode,
  Draft,
  Holding,
  Receipt,
  Session,
  SessionLog,
  TapeEvent,
  View,
  Wallet,
} from './types'

export type Pending =
  | { type: 'start'; nodeId: string }
  | { type: 'buy'; nodeId: string; shares: number }
  | { type: 'host'; draft: Draft }
  | null

export type State = {
  view: View
  wallet: Wallet | null
  nodes: ChargeNode[]
  selectedNodeId: string
  session: Session | null
  receipt: Receipt | null
  holdings: Holding[]
  claimable: number
  history: Receipt[]
  tape: TapeEvent[]
  toasts: { id: string; text: string }[]
  walletOpen: boolean
  pending: Pending
  buyNodeId: string | null
  streamedUsdc: number
  energyMwh: number
  latencyMs: number
}

type Action =
  | { type: 'NAV'; view: View }
  | { type: 'SELECT'; id: string }
  | { type: 'OPEN_WALLET'; pending: Pending }
  | { type: 'CLOSE_WALLET' }
  | { type: 'CONNECT' }
  | { type: 'DISCONNECT' }
  | { type: 'START'; id: string }
  | { type: 'TICK'; dkwh: number; flush: boolean; sig: string; at: number }
  | { type: 'END' }
  | { type: 'DISMISS_RECEIPT' }
  | { type: 'OPEN_BUY'; id: string }
  | { type: 'CLOSE_BUY' }
  | { type: 'BUY'; id: string; shares: number }
  | { type: 'PUBLISH'; draft: Draft }
  | { type: 'CLAIM' }
  | { type: 'ACCRUE'; amount: number }
  | { type: 'TAPE'; event: TapeEvent }
  | { type: 'DISMISS_TOAST'; id: string }
  | { type: 'TOAST'; text: string }

const Ctx = createContext<{ state: State; dispatch: Dispatch<Action> } | null>(null)

function createState(): State {
  return {
    view: 'overview',
    wallet: null,
    nodes: NODES.map((node) => ({ ...node })),
    selectedNodeId: 'cn-1847',
    session: null,
    receipt: null,
    holdings: [],
    claimable: 0,
    history: [],
    tape: initialTape(),
    toasts: [],
    walletOpen: false,
    pending: null,
    buyNodeId: null,
    streamedUsdc: 58420,
    energyMwh: 142.86,
    latencyMs: 428,
  }
}

function withToast(state: State, text: string): State {
  return { ...state, toasts: [...state.toasts, { id: crypto.randomUUID(), text }] }
}

function randomTape(nodes: ChargeNode[], exclude?: string): TapeEvent {
  const pool = nodes.filter((node) => node.status !== 'offline' && node.id !== exclude)
  const node = pool[Math.floor(Math.random() * pool.length)] ?? nodes[0]
  const energy = Math.round((8 + Math.random() * 24) * 10) / 10
  return {
    id: crypto.randomUUID(),
    nodeId: node.id,
    nodeName: node.name,
    kwh: energy,
    usdc: Math.round(energy * node.price * 100) / 100,
    sig: fakeSig(),
    at: Date.now(),
  }
}

function applyStart(state: State, nodeId: string): State {
  const node = state.nodes.find((item) => item.id === nodeId)
  if (!node || !state.wallet) return state
  if (state.session?.active) return withToast({ ...state, view: 'session' }, 'End the current session first')
  if (node.status !== 'available') return withToast(state, 'That charger is not available')
  return {
    ...state,
    pending: null,
    walletOpen: false,
    view: 'session',
    selectedNodeId: nodeId,
    nodes: state.nodes.map((item) => (item.id === nodeId ? { ...item, status: 'charging' as const } : item)),
    session: {
      nodeId,
      kwh: 0,
      spent: 0,
      elapsed: 0,
      pending: 0,
      power: node.kw,
      logs: [],
      active: true,
    },
  }
}

function applyBuy(state: State, nodeId: string, shares: number): State {
  const node = state.nodes.find((item) => item.id === nodeId)
  if (!node || !state.wallet) return state
  const count = Math.round(shares)
  if (count < 1 || count > node.available) return withToast(state, 'Those shares are no longer available')
  const cost = sharePrice(node) * count
  if (state.wallet.sol < cost - 1e-9) return withToast(state, 'Not enough SOL in this wallet')
  const existing = state.holdings.find((holding) => holding.nodeId === nodeId)
  const holdings = existing
    ? state.holdings.map((holding) =>
        holding.nodeId === nodeId ? { ...holding, shares: holding.shares + count } : holding,
      )
    : [{ nodeId, shares: count, operator: false }, ...state.holdings]
  return withToast(
    {
      ...state,
      wallet: { ...state.wallet, sol: state.wallet.sol - cost },
      nodes: state.nodes.map((item) => (item.id === nodeId ? { ...item, available: item.available - count } : item)),
      holdings,
      buyNodeId: null,
      pending: null,
      walletOpen: false,
      view: 'portfolio',
    },
    `Bought ${count} shares of ${node.name}`,
  )
}

function applyPublish(state: State, draft: Draft): State {
  if (!state.wallet) return state
  const name = draft.name.trim()
  const area = draft.area.trim()
  if (!name || !area) return withToast(state, 'Name the charger and its street')
  if (!Number.isFinite(draft.price) || draft.price < 0.05 || draft.price > 2) {
    return withToast(state, 'Set a driver rate between 0.05 and 2.00 USDC')
  }
  const floatShares = Math.min(80, Math.max(0, Math.round(draft.floatShares)))
  const keep = 100 - floatShares
  const placed = state.nodes.filter((node) => node.userOperated).length
  const node: ChargeNode = {
    id: `cn-${Math.floor(4000 + Math.random() * 5000)}`,
    name,
    district: area,
    kind: kindFor(draft.kw),
    kw: draft.kw,
    connector: connectorFor(draft.kw),
    price: Math.round(draft.price * 100) / 100,
    status: 'available',
    host: 'You',
    uptime: 100,
    occupancy: 0,
    yield30d: 0,
    priceSol: capitalization(draft.kw),
    operatorShares: 0,
    investorShares: floatShares,
    available: 0,
    x: 47 + placed * 4,
    y: 30 + placed * 3,
    rating: 5,
    distanceMi: 0.2,
    sessionsToday: 0,
    origin: 'private',
    userOperated: true,
  }
  return withToast(
    {
      ...state,
      nodes: [node, ...state.nodes],
      holdings: [{ nodeId: node.id, shares: keep, operator: true }, ...state.holdings],
      pending: null,
      walletOpen: false,
      view: 'portfolio',
      selectedNodeId: node.id,
    },
    `${node.name} is live. You keep ${keep} shares.`,
  )
}

function pushLog(session: Session, node: ChargeNode, yours: number, sig: string, at: number): Session {
  if (session.pending <= 0.000001) return session
  const split = revenueSplit(node, yours, session.pending)
  const log: SessionLog = {
    id: crypto.randomUUID(),
    amount: session.pending,
    sig,
    at,
    you: split.you,
    others: split.others,
    operator: split.operator,
  }
  return { ...session, pending: 0, logs: [log, ...session.logs].slice(0, 8) }
}

function finish(state: State, session: Session, node: ChargeNode, at: number, sig: string): State {
  const yours = yourShares(state.holdings, node.id)
  const flushed = pushLog(session, node, yours, sig, at)
  const split = revenueSplit(node, yours, flushed.spent)
  const receipt: Receipt = {
    id: crypto.randomUUID(),
    nodeId: node.id,
    nodeName: node.name,
    kwh: flushed.kwh,
    spent: flushed.spent,
    elapsed: flushed.elapsed,
    price: node.price,
    kw: node.kw,
    sig,
    at,
    settlements: flushed.logs.length,
    you: split.you,
    others: split.others,
    operator: split.operator,
    host: node.host,
  }
  return withToast(
    {
      ...state,
      session: null,
      receipt,
      history: [receipt, ...state.history].slice(0, 12),
      view: 'receipt',
      nodes: state.nodes.map((item) =>
        item.id === node.id ? { ...item, status: 'available', sessionsToday: item.sessionsToday + 1 } : item,
      ),
    },
    flushed.spent > 0 ? `Session settled · ${usdc(flushed.spent)} USDC` : 'Session ended',
  )
}

function applyTick(state: State, dkwh: number, flush: boolean, sig: string, at: number): State {
  const session = state.session
  const wallet = state.wallet
  if (!session?.active || !wallet) return state
  const node = state.nodes.find((item) => item.id === session.nodeId)
  if (!node) return state
  const room = ((100 - START_SOC) / 100) * PACK_KWH - session.kwh
  const used = Math.min(Math.max(dkwh, 0), Math.max(room, 0))
  if (used <= 0) return finish(state, session, node, at, sig)
  const cost = used * node.price
  const yours = yourShares(state.holdings, node.id)
  let claimable = state.claimable
  if (node.yield30d <= 0 && yours > 0) claimable += cost * (yours / 100)
  let next: Session = {
    ...session,
    kwh: session.kwh + used,
    spent: session.spent + cost,
    elapsed: session.elapsed + used / (node.kw / 3600),
    pending: session.pending + cost,
    power: node.kw * (0.97 + 0.03 * Math.sin(session.elapsed * 0.85)),
  }
  if (flush || next.pending >= 0.2) next = pushLog(next, node, yours, sig, at)
  const nextWallet = { ...wallet, usdc: Math.max(0, wallet.usdc - cost) }
  const base: State = {
    ...state,
    session: next,
    wallet: nextWallet,
    claimable,
    energyMwh: state.energyMwh + used / 1000,
    streamedUsdc: state.streamedUsdc + cost,
  }
  if (socFromKwh(next.kwh) >= 99.95 || nextWallet.usdc <= 0) return finish(base, next, node, at, sig)
  return base
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'NAV':
      return { ...state, view: action.view }
    case 'SELECT':
      return { ...state, selectedNodeId: action.id }
    case 'OPEN_WALLET':
      return { ...state, walletOpen: true, pending: action.pending }
    case 'CLOSE_WALLET':
      return { ...state, walletOpen: false, pending: null }
    case 'CONNECT': {
      const next: State = withToast(
        {
          ...state,
          wallet: { address: DEMO_ADDRESS, sol: DEMO_SOL, usdc: DEMO_USDC },
          walletOpen: false,
          pending: null,
        },
        'Wallet connected',
      )
      if (state.pending?.type === 'start') return applyStart(next, state.pending.nodeId)
      if (state.pending?.type === 'buy') return applyBuy(next, state.pending.nodeId, state.pending.shares)
      if (state.pending?.type === 'host') return applyPublish(next, state.pending.draft)
      return next
    }
    case 'DISCONNECT':
      if (state.session?.active) return withToast(state, 'End the session before disconnecting')
      return { ...state, wallet: null }
    case 'START':
      if (!state.wallet) return { ...state, walletOpen: true, pending: { type: 'start', nodeId: action.id } }
      return applyStart(state, action.id)
    case 'TICK':
      return applyTick(state, action.dkwh, action.flush, action.sig, action.at)
    case 'END': {
      if (!state.session) return state
      const node = state.nodes.find((item) => item.id === state.session?.nodeId)
      if (!node) return state
      return finish(state, state.session, node, Date.now(), fakeSig())
    }
    case 'DISMISS_RECEIPT':
      return { ...state, receipt: null, view: 'charge' }
    case 'OPEN_BUY':
      return { ...state, view: 'nodes', buyNodeId: action.id }
    case 'CLOSE_BUY':
      return { ...state, buyNodeId: null }
    case 'BUY':
      if (!state.wallet) {
        return { ...state, walletOpen: true, pending: { type: 'buy', nodeId: action.id, shares: action.shares } }
      }
      return applyBuy(state, action.id, action.shares)
    case 'PUBLISH':
      if (!state.wallet) return { ...state, walletOpen: true, pending: { type: 'host', draft: action.draft } }
      return applyPublish(state, action.draft)
    case 'CLAIM': {
      if (!state.wallet || state.claimable < 0.01) return state
      const amount = state.claimable
      return withToast(
        { ...state, claimable: 0, wallet: { ...state.wallet, usdc: state.wallet.usdc + amount } },
        `Claimed ${usdc(amount)} USDC`,
      )
    }
    case 'ACCRUE':
      if (action.amount <= 0) return state
      return { ...state, claimable: state.claimable + action.amount }
    case 'TAPE':
      return {
        ...state,
        tape: [action.event, ...state.tape].slice(0, 7),
        streamedUsdc: state.streamedUsdc + action.event.usdc,
        energyMwh: state.energyMwh + action.event.kwh / 1000,
        latencyMs: 340 + Math.floor(Math.random() * 180),
      }
    case 'DISMISS_TOAST':
      return { ...state, toasts: state.toasts.filter((toast) => toast.id !== action.id) }
    case 'TOAST':
      return withToast(state, action.text)
    default: {
      const exhaustive: never = action
      return exhaustive
    }
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, createState)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    let last = performance.now()
    let sinceFlush = 0
    const id = window.setInterval(() => {
      const now = performance.now()
      const dt = Math.min(0.25, (now - last) / 1000)
      last = now
      const current = stateRef.current
      if (current.session?.active) {
        sinceFlush += dt
        const flush = sinceFlush >= 0.9
        if (flush) sinceFlush = 0
        const dkwh = FLOW_KWH_PER_SEC * dt * (0.93 + Math.random() * 0.14)
        dispatch({ type: 'TICK', dkwh, flush, sig: fakeSig(), at: Date.now() })
      }
      const perSec = yieldPerSec(current.nodes, current.holdings)
      if (perSec > 0) dispatch({ type: 'ACCRUE', amount: perSec * dt })
    }, 80)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => {
      const current = stateRef.current
      dispatch({ type: 'TAPE', event: randomTape(current.nodes, current.session?.nodeId) })
    }, 1800)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (state.toasts.length === 0) return
    const toastId = state.toasts[0].id
    const id = window.setTimeout(() => dispatch({ type: 'DISMISS_TOAST', id: toastId }), 2800)
    return () => window.clearTimeout(id)
  }, [state.toasts])

  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>
}

export function useStore() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('ChargeNet store is missing')
  return ctx
}
