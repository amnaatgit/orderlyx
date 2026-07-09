import { useEffect, useState } from 'react'
import { X, AlertTriangle, CheckCircle2, XCircle, PackageOpen, ChevronLeft, ChevronRight } from 'lucide-react'

/* ── Modal ─────────────────────────────────────────────────────────────── */
export function Modal({ isOpen, onClose, title, children, size='md' }) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])
  useEffect(() => {
    if (!isOpen) return
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [isOpen, onClose])
  if (!isOpen) return null
  const widths = { sm:'max-w-md', md:'max-w-lg', lg:'max-w-2xl', xl:'max-w-3xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 fade-in"
      onClick={onClose} role="dialog" aria-modal>
      <div className="absolute inset-0" style={{ background:'rgba(15,23,42,0.5)', backdropFilter:'blur(4px)' }}/>
      <div className={`relative w-full ${widths[size]} slide-up rounded-xl flex flex-col`}
        style={{ background:'#fff', border:'1px solid #e2e8f0', boxShadow:'0 20px 40px rgba(0,0,0,0.12)', maxHeight:'90vh' }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom:'1px solid #f1f5f9' }}>
          <h2 className="font-semibold text-sm" style={{ color:'#0f172a' }}>{title}</h2>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ color:'#94a3b8' }}
            onMouseEnter={e=>{e.currentTarget.style.background='#f1f5f9';e.currentTarget.style.color='#475569'}}
            onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='#94a3b8'}}>
            <X size={14}/>
          </button>
        </div>
        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-5">{children}</div>
      </div>
    </div>
  )
}

/* ── Loader ────────────────────────────────────────────────────────────── */
export function Loader({ label='Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <div className="w-6 h-6 rounded-full border-2"
        style={{ borderColor:'#e2e8f0', borderTopColor:'#2563eb', animation:'spin 0.8s linear infinite' }}/>
      <p className="text-xs" style={{ color:'#94a3b8' }}>{label}</p>
    </div>
  )
}

/* ── Empty state ──────────────────────────────────────────────────────── */
export function Empty({ title='Nothing here yet', message, action }) {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background:'#eff6ff', border:'1px solid rgba(37,99,235,0.15)' }}>
        <PackageOpen size={22} style={{ color:'#2563eb' }}/>
      </div>
      <p className="font-semibold text-sm mb-1" style={{ color:'#0f172a' }}>{title}</p>
      {message && <p className="text-xs mb-5 max-w-xs leading-relaxed" style={{ color:'#94a3b8' }}>{message}</p>}
      {action}
    </div>
  )
}

/* ── Confirm dialog ───────────────────────────────────────────────────── */
export function Confirm({ isOpen, onClose, onConfirm, title, message, loading }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Action" size="sm">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background:'#fef2f2', border:'1px solid #fecaca' }}>
          <AlertTriangle size={16} style={{ color:'#dc2626' }}/>
        </div>
        <div>
          <p className="font-semibold text-sm mb-1" style={{ color:'#0f172a' }}>{title}</p>
          <p className="text-xs leading-relaxed" style={{ color:'#475569' }}>{message}</p>
        </div>
      </div>
      <div className="flex gap-2 pt-2" style={{ borderTop:'1px solid #f1f5f9' }}>
        <button onClick={onClose} className="btn btn-ghost flex-1 justify-center">Cancel</button>
        <button onClick={onConfirm} disabled={loading} className="btn btn-danger flex-1 justify-center">
          {loading ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </Modal>
  )
}

/* ── Toast ────────────────────────────────────────────────────────────── */
export function useToast() {
  const [toast, setToast] = useState(null)
  const show = (message, type='success') => {
    setToast({ message, type, id: Date.now() })
    setTimeout(() => setToast(null), 3500)
  }
  return { toast, show, hide: () => setToast(null) }
}
export function Toast({ toast, hide }) {
  if (!toast) return null
  const S = {
    success: { bg:'#f0fdf4', border:'#bbf7d0', color:'#166534', Icon:CheckCircle2 },
    error:   { bg:'#fef2f2', border:'#fecaca', color:'#991b1b', Icon:XCircle },
    info:    { bg:'#eff6ff', border:'#bfdbfe', color:'#1e40af', Icon:CheckCircle2 },
  }
  const s = S[toast.type] || S.success
  return (
    <div className="fixed bottom-5 right-5 z-[100] slide-up">
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium"
        style={{ background:s.bg, border:`1px solid ${s.border}`, color:s.color, boxShadow:'0 8px 24px rgba(0,0,0,0.1)', minWidth:280 }}>
        <s.Icon size={15} className="flex-shrink-0"/>
        <span className="flex-1">{toast.message}</span>
        <button onClick={hide} style={{ opacity:0.5 }} className="hover:opacity-100 transition-opacity"><X size={13}/></button>
      </div>
    </div>
  )
}

/* ── StatCard ─────────────────────────────────────────────────────────── */
const CM = {
  gold:    { text:'#92400e', bg:'#fef3c7', border:'#fde68a', bar:'#f59e0b' },
  sky:     { text:'#0c4a6e', bg:'#f0f9ff', border:'#bae6fd', bar:'#0284c7' },
  rose:    { text:'#991b1b', bg:'#fef2f2', border:'#fecaca', bar:'#dc2626' },
  amber:   { text:'#92400e', bg:'#fffbeb', border:'#fde68a', bar:'#d97706' },
  violet:  { text:'#4c1d95', bg:'#f5f3ff', border:'#ddd6fe', bar:'#7c3aed' },
  emerald: { text:'#065f46', bg:'#ecfdf5', border:'#a7f3d0', bar:'#059669' },
  blue:    { text:'#1e40af', bg:'#eff6ff', border:'#bfdbfe', bar:'#2563eb' },
}
export function StatCard({ icon:Icon, label, value, sub, color='blue' }) {
  const c = CM[color] || CM.blue
  return (
    <div className="card card-interactive relative overflow-hidden" style={{ padding:'18px 20px' }}>
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background:c.bar }}/>
      <div className="flex items-start justify-between mb-3">
        <p style={{ fontSize:10, fontWeight:600, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background:c.bg, border:`1px solid ${c.border}` }}>
          <Icon size={14} style={{ color:c.bar }}/>
        </div>
      </div>
      <p className="stat-value mb-1" style={{ color:c.bar }}>{value}</p>
      {sub && <p style={{ fontSize:11, color:'#94a3b8' }}>{sub}</p>}
    </div>
  )
}

/* ── Pagination ───────────────────────────────────────────────────────── */
export function Pagination({ page, pages, total, onPage }) {
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-between px-1 py-2">
      <p style={{ fontSize:11, color:'#94a3b8' }}>{total} total</p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page-1)} disabled={page<=1} className="btn btn-ghost btn-sm px-2"
          style={{ opacity:page<=1?0.3:1 }}><ChevronLeft size={13}/></button>
        <span style={{ fontSize:11, color:'#2563eb', fontWeight:600, padding:'4px 12px', background:'#eff6ff', borderRadius:8 }}>
          {page} / {pages}
        </span>
        <button onClick={() => onPage(page+1)} disabled={page>=pages} className="btn btn-ghost btn-sm px-2"
          style={{ opacity:page>=pages?0.3:1 }}><ChevronRight size={13}/></button>
      </div>
    </div>
  )
}
