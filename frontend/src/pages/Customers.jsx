import { useState, useEffect, useCallback } from 'react'
import { customersAPI } from '../api'
import { Loader, Empty, Toast, useToast, Modal, Confirm } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { Plus, Search, Edit2, Trash2, Mail, Phone, Globe } from 'lucide-react'

const EMPTY = { name:'', email:'', phone:'', address:'', city:'', country:'', creditLimit:'', notes:'' }

export default function Customers() {
  const { isAdmin, isManager } = useAuth()
  const canDelete = isAdmin

  const [customers, setCustomers] = useState([])
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
    try {
      const params = {}
      if (search.trim()) params.search = search.trim()
      const r = await customersAPI.getAll(params)
      setCustomers(r.data)
    } catch { show('Failed to load customers.', 'error') }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { load() }, [load])

  const openEdit = c => {
    setEditing(c)
    setForm({ name:c.name, email:c.email||'', phone:c.phone||'', address:c.address||'', city:c.city||'', country:c.country||'', creditLimit:c.creditLimit||'', notes:c.notes||'' })
    setOpen(true)
  }

  const save = async e => {
    e.preventDefault(); setSaving(true)
    try {
      const data = { ...form }
      if (data.creditLimit) data.creditLimit = parseFloat(data.creditLimit)
      editing ? await customersAPI.update(editing.id, data) : await customersAPI.create(data)
      show(editing ? 'Customer updated!' : 'Customer created!')
      setOpen(false); load()
    } catch (ex) { show(ex.response?.data?.error || 'Failed.', 'error') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <Toast toast={toast} hide={hide} />
      <div className="flex items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color:'var(--text-muted)' }} />
          <input className="input pl-9 text-sm" placeholder="Search customers…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span className="chip">{customers.length}</span>
        <button onClick={() => { setEditing(null); setForm(EMPTY); setOpen(true) }} className="btn btn-primary btn-sm">
          <Plus size={14} /> Add Customer
        </button>
      </div>

      {loading ? <Loader /> : customers.length === 0 ? <Empty title="No customers found" /> : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead><tr>
              {['Customer','Contact','Location','Credit Limit','Total Purchases','Status',''].map(h => <th key={h} className="th">{h}</th>)}
            </tr></thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id} className="tr">
                  <td className="td">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background:'var(--accent-dim)', color:'var(--accent)', border:'1px solid rgba(37,99,235,0.2)' }}>
                        {c.name.charAt(0)}
                      </div>
                      <p className="text-sm font-semibold" style={{ color:'var(--text-primary)' }}>{c.name}</p>
                    </div>
                  </td>
                  <td className="td">
                    {c.email && <div className="flex items-center gap-1.5 text-xs mb-0.5" style={{ color:'var(--text-secondary)' }}><Mail size={10} style={{ color:'var(--text-dim)' }} />{c.email}</div>}
                    {c.phone && <div className="flex items-center gap-1.5 text-xs" style={{ color:'var(--text-secondary)' }}><Phone size={10} style={{ color:'var(--text-dim)' }} />{c.phone}</div>}
                  </td>
                  <td className="td text-xs" style={{ color:'var(--text-secondary)' }}>{[c.city,c.country].filter(Boolean).join(', ') || '—'}</td>
                  <td className="td text-sm font-mono" style={{ color:'var(--accent)' }}>${Number(c.creditLimit).toLocaleString()}</td>
                  <td className="td text-sm font-mono font-bold" style={{ color:'var(--text-primary)' }}>${Number(c.totalPurchases).toLocaleString()}</td>
                  <td className="td"><span className={`badge ${c.isActive?'badge-emerald':'badge-neutral'}`}>{c.isActive?'Active':'Inactive'}</span></td>
                  <td className="td">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(c)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all" style={{ color:'var(--text-muted)' }}
                        onMouseEnter={e => { e.currentTarget.style.background='var(--accent-dim)'; e.currentTarget.style.color='var(--accent)' }}
                        onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text-muted)' }}>
                        <Edit2 size={12} />
                      </button>
                      {canDelete && (
                        <button onClick={() => setDel(c)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all" style={{ color:'var(--text-muted)' }}
                          onMouseEnter={e => { e.currentTarget.style.background='var(--rose-dim)'; e.currentTarget.style.color='var(--rose)' }}
                          onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text-muted)' }}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={open} onClose={() => setOpen(false)} title={editing ? 'Edit Customer' : 'New Customer'}>
        <form onSubmit={save} className="space-y-4">
          <div><label className="label">Name *</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">City</label><input className="input" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
            <div><label className="label">Country</label><input className="input" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} /></div>
          </div>
          <div><label className="label">Credit Limit ($)</label><input className="input" type="number" value={form.creditLimit} onChange={e => setForm({ ...form, creditLimit: e.target.value })} /></div>
          <div className="flex gap-3 pt-4" style={{ borderTop:'1px solid var(--border)', marginTop:8 }}>
            <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary flex-1 justify-center">{saving ? '…' : editing ? 'Save' : 'Add'}</button>
          </div>
        </form>
      </Modal>

      <Confirm isOpen={!!del} onClose={() => setDel(null)}
        onConfirm={async () => { await customersAPI.delete(del.id); show('Deleted.'); setDel(null); load() }}
        title="Delete Customer" message={`Delete "${del?.name}"? This cannot be undone.`} />
    </div>
  )
}
