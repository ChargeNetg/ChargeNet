import { PACK_KWH, SOL_USD, START_SOC, YIELD_WINDOW_SEC } from './constants'
import type { ChargeNode, Holding } from '../types'

export function sharePrice(node: ChargeNode) {
  return node.priceSol / 100
}

export function trailingApr(node: ChargeNode) {
  if (node.yield30d <= 0 || node.priceSol <= 0) return null
  return (node.yield30d * 12) / (node.priceSol * SOL_USD)
}

export function aprLabel(node: ChargeNode) {
  const apr = trailingApr(node)
  if (apr == null) return 'New'
  return `${(apr * 100).toFixed(1)}%`
}

export function perMinute(node: ChargeNode) {
  return (node.price * node.kw) / 60
}

export function holdingOf(holdings: Holding[], nodeId: string) {
  return holdings.find((h) => h.nodeId === nodeId)
}

export function yourShares(holdings: Holding[], nodeId: string) {
  return holdingOf(holdings, nodeId)?.shares ?? 0
}

export function revenueSplit(node: ChargeNode, yours: number, amount: number) {
  return {
    you: (yours / 100) * amount,
    others: (node.investorShares / 100) * amount,
    operator: ((node.operatorShares + node.available) / 100) * amount,
  }
}

export function socFromKwh(energy: number) {
  return Math.min(100, START_SOC + (energy / PACK_KWH) * 100)
}

export function yieldPerSec(nodes: ChargeNode[], holdings: Holding[]) {
  let total = 0
  for (const holding of holdings) {
    const node = nodes.find((n) => n.id === holding.nodeId)
    if (!node || node.yield30d <= 0) continue
    total += (node.yield30d * (holding.shares / 100)) / YIELD_WINDOW_SEC
  }
  return total
}

export function capitalization(kw: number) {
  return Math.max(12, Math.round(kw * 1.85))
}

export function connectorFor(kw: number): ChargeNode['connector'] {
  return kw >= 50 ? 'CCS' : 'J1772'
}

export function kindFor(kw: number): ChargeNode['kind'] {
  return kw >= 50 ? 'DC Fast' : 'Level 2'
}

export function defaultShares(node: ChargeNode) {
  if (node.available < 1) return 0
  const want = node.priceSol >= 100 ? 5 : 10
  return Math.min(node.available, want)
}
