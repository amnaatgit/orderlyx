import { useState, useEffect, useCallback } from 'react'
import { suppliersAPI } from '../api'
import { Modal, Loader, Empty, Toast, useToast, Confirm } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { Plus, Search, Edit2, Trash2, Truck, Package, ShoppingCart, Globe, Mail, Phone, Star } from 'lucide-react'

const EMPTY = { name:'', email:'', phone:'', address:'', city:'', country:'', taxId:'', creditLimit:'', paymentTerms:'30', status:'ACTIVE', notes:'' }

export default function Suppliers() {
  const { isAdmin, isManager, isViewer } = useAuth()
  const canCreate = isAdmin || isManager
  const canEdit   = isAdmin || isManager
  const canDelete = isAdmin

  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [open, setOpen]           = useState(false)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState(EMPTY)
  const [saving, setSaving]       = useState(false)
  const [del, setDel]             = useState(null)
  const { toast, show, hide }     = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await suppliersAPI.getAll({ search }); setSuppliers(r.data) }
    catch { show('Failed.', 'error') }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { load() }, [load])

  const openEdit = s => {
    setEditing(s)
    setForm({ name:s.name, email:s.email||'', phone:s.phone||'', address:s.address||'', city:s.city||'', country:s.country||'', taxId:s.taxId||'', creditLimit:s.creditLimit||'', paymentTerms:s.paymentTerms||30, status:s.status, notes:s.notes||'' })
    setOpen(true)
  }

  const save = async e => {
    e.preventDefault(); setSaving(true)
    try {
      editing ? await suppliersAPI.update(editing.id, form) : await suppliersAPI.create(form)
      show(editing ? 'Supplier updated!' : 'Supplier created!')
      setOpen(false); load()
    } catch (ex) { show(ex.response?.data?.error || 'Failed.', 'error') }
    finally { setSaving(false) }
  }

  const Stars = ({ n }) => (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => <Star key={i} size={10} style={{ color:i<=n?'var(--accent)':'var(--text-dim)', fill:i<=n?'var(--accent)':'none' }} />)}
    </div>
  )

  return (
    <div className="space-y-4">
      <Toast toast={toast} hide={hide} />

      {isViewer && (
        <div className="px-4 py-2.5 rounded-xl text-xs" style={{ background:'rgba(161,161,170,0.08)', border:'1px solid var(--border)', color:'var(--text-muted)' }}>
          👁 Read-only access. You can view supplier information but cannot make changes.
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color:'var(--text-muted)' }} />
          <input className="input pl-9 text-sm" placeholder="Search suppliers…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span className="chip">{suppliers.length}</span>
        {canCreate && (
          <button onClick={() => { setEditing(null); setForm(EMPTY); setOpen(true) }} className="btn btn-primary btn-sm">
            <Plus size={14} /> Add Supplier
          </button>
        )}
      </div>

      {loading ? <Loader /> : suppliers.length === 0 ? <Empty title="No suppliers found" /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {suppliers.map(s => (
            <div key={s.id} className="card p-5 card-interactive">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background:'rgba(56,189,248,0.1)', border:'1px solid rgba(56,189,248,0.2)' }}>
                    <Truck size={16} style={{ color:'var(--sky)' }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color:'var(--text-primary)' }}>{s.name}</p>
                    <Stars n={s.rating || 0} />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`badge ${s.status==='ACTIVE'?'badge-emerald':'badge-neutral'}`}>{s.status}</span>
                  {/* Edit/delete only for admin & manager */}
                  {canEdit && (
                    <div className="flex gap-1 mt-1">
                      <button onClick={() => openEdit(s)} className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ color:'var(--text-muted)' }}
                        onMouseEnter={e => { e.currentTarget.style.background='var(--accent-dim)'; e.currentTarget.style.color='var(--accent)' }}
                        onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text-muted)' }}>
                        <Edit2 size={11} />
                      </button>
                      {canDelete && (
                        <button onClick={() => setDel(s)} className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ color:'var(--text-muted)' }}
                          onMouseEnter={e => { e.currentTarget.style.background='var(--rose-dim)'; e.currentTarget.style.color='var(--rose)' }}
                          onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text-muted)' }}>
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1.5 mb-4">
                {s.email && <div className="flex items-center gap-2 text-xs" style={{ color:'var(--text-secondary)' }}><Mail size={11} style={{ color:'var(--text-dim)' }} />{s.email}</div>}
                {s.phone && <div className="flex items-center gap-2 text-xs" style={{ color:'var(--text-secondary)' }}><Phone size={11} style={{ color:'var(--text-dim)' }} />{s.phone}</div>}
                {(s.city||s.country) && <div className="flex items-center gap-2 text-xs" style={{ color:'var(--text-secondary)' }}><Globe size={11} style={{ color:'var(--text-dim)' }} />{[s.city,s.country].filter(Boolean).join(', ')}</div>}
              </div>
              {/* Credit info — visible to all */}
              {s.creditLimit > 0 && <p className="text-xs mb-3 font-mono" style={{ color:'var(--accent)' }}>Credit: ${Number(s.creditLimit).toLocaleString()}</p>}
              <div className="flex gap-4 pt-3" style={{ borderTop:'1px solid var(--border)' }}>
                <div className="flex items-center gap-1.5 text-xs" style={{ color:'var(--text-muted)' }}><Package size={11} />{s._count?.products ?? 0} products</div>
                <div className="flex items-center gap-1.5 text-xs" style={{ color:'var(--text-muted)' }}><ShoppingCart size={11} />{s._count?.orders ?? 0} orders</div>
                <div className="ml-auto text-xs" style={{ color:'var(--text-muted)' }}>Net {s.paymentTerms}d</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={open} onClose={() => setOpen(false)} title={editing ? 'Edit Supplier' : 'New Supplier'}>
        <form onSubmit={save} className="space-y-4">
          <div><label className="label">Company Name *</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">City</label><input className="input" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
            <div><label className="label">Country</label><input className="input" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Credit Limit ($)</label><input className="input" type="number" value={form.creditLimit} onChange={e => setForm({ ...form, creditLimit: e.target.value })} /></div>
            <div><label className="label">Payment Terms (days)</label><input className="input" type="number" value={form.paymentTerms} onChange={e => setForm({ ...form, paymentTerms: e.target.value })} /></div>
          </div>
          <div><label className="label">Status</label>
            <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <div className="flex gap-3 pt-4" style={{ borderTop:'1px solid var(--border)', marginTop:8 }}>
            <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary flex-1 justify-center">{saving ? '…' : editing ? 'Save' : 'Add'}</button>
          </div>
        </form>
      </Modal>

      <Confirm isOpen={!!del} onClose={() => setDel(null)}
        onConfirm={async () => { await suppliersAPI.delete(del.id); show('Deleted.'); setDel(null); load() }}
        title="Delete Supplier" message={`Delete "${del?.name}"? This cannot be undone.`} />
    </div>
  )
}
