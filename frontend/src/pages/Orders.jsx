import { useState, useEffect, useCallback } from 'react'
import { ordersAPI, productsAPI, suppliersAPI } from '../api'
import { Loader, Empty, Toast, useToast, Modal } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { Plus, TrendingUp, TrendingDown, X, DollarSign, Eye } from 'lucide-react'

const statusBadge = { PENDING:'badge-amber', CONFIRMED:'badge-sky', COMPLETED:'badge-emerald', CANCELLED:'badge-rose' }
const typeBadge   = { PURCHASE:'badge-emerald', SALE:'badge-gold', ADJUSTMENT:'badge-neutral' }

export default function Orders() {
  const { isAdmin, isManager, isViewer, user } = useAuth()
  const canCreate = !isViewer
  const canSeeFinancials = isAdmin || isManager

  const [orders, setOrders]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [filterType, setFilterType]     = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [open, setOpen]           = useState(false)
  const [form, setForm]           = useState({ type:'PURCHASE', supplierId:'', notes:'', items:[] })
  const [products, setProducts]   = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [saving, setSaving]       = useState(false)
  const { toast, show, hide }     = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterType)   params.type   = filterType
      if (filterStatus) params.status = filterStatus
      const r = await ordersAPI.getAll(params)
      setOrders(r.data.orders)
    } catch { show('Failed.', 'error') }
    finally { setLoading(false) }
  }, [filterType, filterStatus])

  useEffect(() => { load() }, [load])

  const openCreate = async () => {
    setForm({ type:'PURCHASE', supplierId:'', notes:'', items:[] })
    const [p, s] = await Promise.all([productsAPI.getAll({ limit:100 }), suppliersAPI.getAll()])
    setProducts(p.data.products); setSuppliers(s.data); setOpen(true)
  }

  const addItem    = () => setForm(f => ({ ...f, items:[...f.items, { productId:'', quantity:1, unitPrice:'' }] }))
  const removeItem = i  => setForm(f => ({ ...f, items:f.items.filter((_,idx) => idx !== i) }))
  const updateItem = (i, field, val) => setForm(f => {
    const items = [...f.items]; items[i] = { ...items[i], [field]: val }
    if (field === 'productId') {
      const p = products.find(p => p.id === val)
      if (p) items[i].unitPrice = f.type === 'PURCHASE' ? Number(p.costPrice || p.sellingPrice) : Number(p.sellingPrice)
    }
    return { ...f, items }
  })

  const total = form.items.reduce((s, i) => s + (Number(i.unitPrice)||0) * (Number(i.quantity)||0), 0)

  const handleCreate = async e => {
    e.preventDefault()
    if (!form.items.length) return show('Add at least one item.', 'error')
    setSaving(true)
    try { await ordersAPI.create(form); show('Order created & stock updated!'); setOpen(false); load() }
    catch (ex) { show(ex.response?.data?.error || 'Failed.', 'error') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <Toast toast={toast} hide={hide} />

      {isViewer && (
        <div className="px-4 py-2.5 rounded-xl text-xs" style={{ background:'rgba(161,161,170,0.08)', border:'1px solid var(--border)', color:'var(--text-muted)' }}>
          👁 Read-only access. You can view orders but cannot create new ones.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <select className="input w-40 text-sm" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          <option value="PURCHASE">Purchase</option>
          <option value="SALE">Sale</option>
          <option value="ADJUSTMENT">Adjustment</option>
        </select>
        <select className="input w-44 text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <span className="chip">{orders.length} orders</span>
        <div className="flex-1" />
        {canCreate && (
          <button onClick={openCreate} className="btn btn-primary btn-sm">
            <Plus size={14} /> New Order
          </button>
        )}
      </div>

      {loading ? <Loader /> : orders.length === 0 ? (
        <Empty title="No orders yet" message="Create a purchase or sale order." action={canCreate && <button onClick={openCreate} className="btn btn-primary btn-sm">New Order</button>} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Order #</th>
                  <th className="th">Type</th>
                  <th className="th">Items</th>
                  <th className="th">Supplier</th>
                  <th className="th">Created By</th>
                  {canSeeFinancials && <th className="th">Total</th>}
                  <th className="th">Status</th>
                  <th className="th">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} className="tr">
                    <td className="td"><span className="font-mono text-xs font-bold" style={{ color:'var(--text-primary)' }}>{o.orderNumber}</span></td>
                    <td className="td">
                      <div className="flex items-center gap-1.5">
                        {o.type==='PURCHASE' ? <TrendingUp size={12} style={{ color:'var(--emerald)' }} /> : <TrendingDown size={12} style={{ color:'var(--accent)' }} />}
                        <span className={`badge ${typeBadge[o.type]}`}>{o.type}</span>
                      </div>
                    </td>
                    <td className="td text-xs" style={{ color:'var(--text-secondary)' }}>{o.items?.length ?? 0}</td>
                    <td className="td text-xs" style={{ color:'var(--text-secondary)' }}>{o.supplier?.name || '—'}</td>
                    <td className="td text-xs" style={{ color:'var(--text-secondary)' }}>{o.user?.name}</td>
                    {canSeeFinancials && (
                      <td className="td"><span className="text-sm font-mono font-bold" style={{ color:'var(--text-primary)' }}>${Number(o.totalAmount).toLocaleString()}</span></td>
                    )}
                    <td className="td"><span className={`badge ${statusBadge[o.status]}`}>{o.status}</span></td>
                    <td className="td text-xs" style={{ color:'var(--text-muted)' }}>
                      {new Date(o.createdAt).toLocaleDateString('en', { day:'2-digit', month:'short', year:'2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Order Modal — hidden from viewer */}
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Create New Order" size="xl">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Type *</label>
              <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="PURCHASE">Purchase — Stock In</option>
                <option value="SALE">Sale — Stock Out</option>
                <option value="ADJUSTMENT">Adjustment</option>
              </select>
            </div>
            <div><label className="label">Supplier</label>
              <select className="input" value={form.supplierId} onChange={e => setForm({ ...form, supplierId: e.target.value })}>
                <option value="">None</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div><label className="label">Notes</label><input className="input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional reference or note" /></div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">Items *</label>
              <button type="button" onClick={addItem} className="btn btn-ghost btn-sm"><Plus size={13} /> Add Item</button>
            </div>
            {form.items.length === 0 ? (
              <div className="text-center py-8 rounded-xl" style={{ border:'2px dashed var(--border)' }}>
                <p className="text-xs" style={{ color:'var(--text-muted)' }}>Click "Add Item" to start building this order</p>
              </div>
            ) : (
              <div className="space-y-2">
                {form.items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center p-3 rounded-xl" style={{ background:'var(--bg-surface)', border:'1px solid var(--border)' }}>
                    <div className="col-span-5">
                      <select className="input text-xs py-2" value={item.productId} onChange={e => updateItem(i,'productId',e.target.value)} required>
                        <option value="">Select product…</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} (qty: {p.quantity})</option>)}
                      </select>
                    </div>
                    <div className="col-span-3"><input className="input text-xs py-2 font-mono" type="number" min="1" placeholder="Qty" value={item.quantity} onChange={e => updateItem(i,'quantity',e.target.value)} required /></div>
                    <div className="col-span-3"><input className="input text-xs py-2 font-mono" type="number" step="0.01" placeholder="Unit price" value={item.unitPrice} onChange={e => updateItem(i,'unitPrice',e.target.value)} required /></div>
                    <div className="col-span-1 flex justify-center">
                      <button type="button" onClick={() => removeItem(i)} className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ color:'var(--text-muted)' }}
                        onMouseEnter={e => { e.currentTarget.style.background='var(--rose-dim)'; e.currentTarget.style.color='var(--rose)' }}
                        onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text-muted)' }}>
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {form.items.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background:'var(--accent-dim)', border:'1px solid rgba(37,99,235,0.2)' }}>
              <div className="flex items-center gap-2"><DollarSign size={14} style={{ color:'var(--accent)' }} /><span className="text-sm font-medium" style={{ color:'var(--text-secondary)' }}>Order Total</span></div>
              <span className="font-semibold text-xl" style={{ color:'var(--accent)' }}>${total.toFixed(2)}</span>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary flex-1 justify-center">{saving ? 'Creating…' : 'Create & Update Stock'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
