import { cx } from '../lib/cx'
import type { ChargeNode } from '../types'

const LABELS = [
  { name: 'Airfield', x: 78, y: 10 },
  { name: 'Residential', x: 34, y: 14 },
  { name: 'Industrial', x: 8, y: 32 },
  { name: 'Downtown', x: 48, y: 60 },
  { name: 'University', x: 60, y: 74 },
  { name: 'Heights', x: 78, y: 62 },
  { name: 'Harbor', x: 8, y: 86 },
]

export function MapPanel({
  nodes,
  selectedId,
  onSelect,
  className,
}: {
  nodes: ChargeNode[]
  selectedId: string | null
  onSelect: (id: string) => void
  className?: string
}) {
  const live = nodes.filter((node) => node.status !== 'offline').length
  return (
    <div className={cx('card relative overflow-hidden', className)}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
        <rect width="100" height="100" fill="#0c1018" />
        <g stroke="rgba(255,255,255,0.045)" strokeWidth="0.35" fill="none">
          <path d="M6 20 H94" />
          <path d="M6 38 H94" />
          <path d="M6 56 H90" />
          <path d="M6 74 H72" />
          <path d="M20 6 V94" />
          <path d="M38 8 V92" />
          <path d="M56 6 V94" />
          <path d="M74 8 V90" />
        </g>
        <path d="M0 60 C16 54 26 72 44 76 C28 84 14 92 0 100 Z" fill="#16324f" />
        <circle cx="84" cy="18" r="10" fill="rgba(58,160,255,0.08)" />
        <text x="6" y="78" fill="rgba(170,198,230,0.4)" fontSize="3.2" fontFamily="Manrope, sans-serif">
          BAY
        </text>
      </svg>
      {LABELS.map((label) => (
        <span
          key={label.name}
          className="pointer-events-none absolute text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30"
          style={{ left: `${label.x}%`, top: `${label.y}%` }}
        >
          {label.name}
        </span>
      ))}
      {nodes.map((node) => {
        const selected = node.id === selectedId
        return (
          <button
            key={node.id}
            type="button"
            title={`${node.name} · ${node.status}`}
            onClick={() => onSelect(node.id)}
            className="absolute -translate-x-1/2 -translate-y-1/2 p-2"
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            <span className="relative block h-3.5 w-3.5">
              {node.status === 'charging' && (
                <span className="absolute inset-0 animate-ping rounded-full bg-orange-400 opacity-60" />
              )}
              <span
                className={cx(
                  'relative block h-3.5 w-3.5 rounded-full border border-black/40',
                  node.status === 'available' && 'bg-lime shadow-[0_0_12px_rgba(58,160,255,0.85)]',
                  node.status === 'charging' && 'bg-orange-400',
                  node.status === 'offline' && 'bg-white/25',
                  selected && 'scale-125 ring-2 ring-white',
                )}
              />
            </span>
            {selected && (
              <span className="absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/80 px-2 py-1 text-[11px] text-paper">
                {node.name}
              </span>
            )}
          </button>
        )
      })}
      <div className="absolute bottom-3 left-3 rounded-full border border-white/10 bg-black/50 px-3 py-1 text-[11px] text-mist backdrop-blur">
        <span className="num text-paper">{live}</span> nodes live
      </div>
      <div className="absolute bottom-3 right-3 flex items-center gap-3 rounded-full border border-white/10 bg-black/50 px-3 py-1 text-[11px] text-mist backdrop-blur">
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-lime" /> Open</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-orange-400" /> In use</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-white/30" /> Offline</span>
      </div>
    </div>
  )
}
