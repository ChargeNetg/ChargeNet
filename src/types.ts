export type View = 'overview' | 'charge' | 'session' | 'receipt' | 'nodes' | 'host' | 'portfolio'

export type NodeKind = 'DC Fast' | 'Level 2'
export type Connector = 'CCS' | 'NACS' | 'J1772'
export type NodeStatus = 'available' | 'charging' | 'offline'
export type Origin = 'site' | 'private'

export type ChargeNode = {
  id: string
  name: string
  district: string
  kind: NodeKind
  kw: number
  connector: Connector
  price: number
  status: NodeStatus
  host: string
  uptime: number
  occupancy: number
  yield30d: number
  priceSol: number
  operatorShares: number
  investorShares: number
  available: number
  x: number
  y: number
  rating: number
  distanceMi: number
  sessionsToday: number
  origin: Origin
  userOperated?: boolean
}

export type Holding = {
  nodeId: string
  shares: number
  operator: boolean
}

export type Wallet = {
  address: string
  sol: number
  usdc: number
}

export type SessionLog = {
  id: string
  amount: number
  sig: string
  at: number
  you: number
  others: number
  operator: number
}

export type Session = {
  nodeId: string
  kwh: number
  spent: number
  elapsed: number
  pending: number
  power: number
  logs: SessionLog[]
  active: boolean
}

export type Receipt = {
  id: string
  nodeId: string
  nodeName: string
  kwh: number
  spent: number
  elapsed: number
  price: number
  kw: number
  sig: string
  at: number
  settlements: number
  you: number
  others: number
  operator: number
  host: string
}

export type TapeEvent = {
  id: string
  nodeId: string
  nodeName: string
  kwh: number
  usdc: number
  sig: string
  at: number
}

export type Draft = {
  name: string
  area: string
  kw: number
  price: number
  floatShares: number
}
