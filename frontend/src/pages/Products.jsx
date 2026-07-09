import { useState, useEffect, useCallback } from 'react'
import { productsAPI, categoriesAPI, suppliersAPI } from '../api'
import { Modal, Loader, Empty, Toast, useToast, Confirm, Pagination } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { Plus, Search, Edit2, Trash2, Package, AlertTriangle, X } from 'lucide-react'
import clsx from 'clsx'

const statusBadge = { ACTIVE:'badge-emerald', INACTIVE:'badge-neutral', DISCONTINUED:'badge-rose' }
const EMPTY = { name:'', sku:'', barcode:'', description:'', costPrice:'', sellingPrice:'', quantity:'', reorderLevel:'10', maxStockLevel:'500', unit:'units', taxRate:'0', status:'ACTIVE', categoryId:'', subCategoryId:'', supplierId:'', warehouseId:'' }

export default function Products() {
  const { isAdmin, isManager, isStaff, isViewer, user } = useAuth()
  const canCreate = isAdmin || isManager
  const canEdit   = isAdmin || isManager || isStaff
  const canDelete = isAdmin

  const [products, setProducts]   = useState([])
  const [categories, setCategories] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterLow, setFilterLow] = useState(false)
  const [open, setOpen]           = useState(false)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState(EMPTY)
  const [saving, setSaving]       = useState(false)
  const [del, setDel]             = useState(null)
  const [deleting, setDeleting]   = useState(false)
  const [page, setPage]           = useState(1)
  const [pages, setPages]         = useState(1)
  const [total, setTotal]         = useState(0)
  const { toast, show, hide }     = useToast()

  const load = useCallback(async (pg = page) => {
    setLoading(true)
    try {
      const params = { search, lowStock: filterLow || undefined, page: pg, limit: 24 }
      if (filterCat) params.categoryId = filterCat
      const [p, c, s, w] = await Promise.all([
        productsAPI.getAll(params), categoriesAPI.getAll(), suppliersAPI.getAll(), categoriesAPI.warehouses()
      ])
      setProducts(p.data.products)
      setTotal(p.data.total)
      setPages(p.data.pages)
      setCategories(c.data)
      setSuppliers(s.data)
      setWarehouses(w.data)
    } catch { show('Failed to load products.', 'error') }
    finally { setLoading(false) }
  }, [search, filterCat, filterLow, page])

  useEffect(() => { load() }, [load])

  const openAdd = () => { setEditing(null); setForm(EMPTY); setOpen(true) }
  const openEdit = p => {
    setEditing(p)
    // STAFF can only edit quantity and status
    if (user?.role === 'STAFF') {
      setForm({ quantity: p.quantity, status: p.status })
    } else {
      setForm({ name:p.name, sku:p.sku, barcode:p.barcode||'', description:p.description||'', costPrice:p.costPrice, sellingPrice:p.sellingPrice, quantity:p.quantity, reorderLevel:p.reorderLevel, maxStockLevel:p.maxStockLevel, unit:p.unit, taxRate:p.taxRate, status:p.status, categoryId:p.categoryId||'', subCategoryId:p.subCategoryId||'', supplierId:p.supplierId||'', warehouseId:p.warehouseId||'' })
    }
    setOpen(true)
  }

  const save = async e => {
    e.preventDefault(); setSaving(true)
    try {
      editing ? await productsAPI.update(editing.id, form) : await productsAPI.create(form)
      show(editing ? 'Product updated!' : 'Product created!')
      setOpen(false); load()
    } catch (ex) { show(ex.response?.data?.error || 'Failed.', 'error') }
    finally { setSaving(false) }
  }

  const doDelete = async () => {
    setDeleting(true)
    try { await productsAPI.delete(del.id); show('Deleted.'); setDel(null); load() }
    catch { show('Failed to delete.', 'error') }
    finally { setDeleting(false) }
  }

  const isLow = p => p.quantity > 0 && p.quantity <= p.reorderLevel
  const isOut = p => p.quantity === 0
  const pct   = p => Math.min(100, Math.round((p.quantity / Math.max(p.maxStockLevel, 1)) * 100))
  const subCats = categories.find(c => c.id === form.categoryId)?.subCategories || []

  return (
    <div className="space-y-4">
      <Toast toast={toast} hide={hide} />

      {isViewer && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs" style={{ background:'#f8fafc', border:'1px solid var(--border)', color:'var(--text-secondary)' }}>
          👁 You have read-only access. Contact an admin to make changes.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color:'var(--text-muted)' }} />
          <input className="input pl-9 text-sm" placeholder="Search name, SKU, barcode…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-44 text-sm" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={() => setFilterLow(!filterLow)} className={clsx('btn btn-ghost btn-sm', filterLow && '!border-amber-400/40 !text-amber-400')}>
          <AlertTriangle size={13} /> Low Stock
        </button>
        <span className="chip">{products.length} products</span>
        {canCreate && (
          <button onClick={openAdd} className="btn btn-primary btn-sm">
            <Plus size={14} /> Add Product
          </button>
        )}
      </div>

      {loading ? <Loader /> : products.length === 0 ? (
        <Empty title="No products found" message="Adjust filters or add a new product." action={canCreate && <button onClick={openAdd} className="btn btn-primary btn-sm">Add Product</button>} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Product</th>
                  <th className="th">SKU</th>
                  <th className="th">Category</th>
                  <th className="th">Supplier</th>
                  {isManager && <th className="th">Price / Cost</th>}
                  {!isManager && <th className="th">Price</th>}
                  <th className="th">Stock</th>
                  <th className="th">Status</th>
                  {canEdit && <th className="th"></th>}
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} className="tr">
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: p.category?.color ? `${p.category.color}18` : 'var(--accent-dim)', border: `1px solid ${p.category?.color ? `${p.category.color}30` : 'rgba(37,99,235,0.2)'}` }}>
                          <Package size={13} style={{ color: p.category?.color || 'var(--accent)' }} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color:'var(--text-primary)' }}>{p.name}</p>
                          <p className="text-xs" style={{ color:'var(--text-muted)' }}>{p.unit}</p>
                        </div>
                      </div>
                    </td>
                    <td className="td"><span className="chip font-mono text-xs">{p.sku}</span></td>
                    <td className="td">
                      {p.category
                        ? <span className="badge text-xs" style={{ background:`${p.category.color}18`, color:p.category.color, border:`1px solid ${p.category.color}30` }}>{p.category.name}</span>
                        : <span style={{ color:'var(--text-dim)' }}>—</span>}
                    </td>
                    <td className="td text-xs" style={{ color:'var(--text-secondary)' }}>{p.supplier?.name || '—'}</td>
                    <td className="td">
                      <p className="text-sm font-bold font-mono" style={{ color:'var(--text-primary)' }}>${Number(p.sellingPrice).toFixed(2)}</p>
                      {isManager && p.costPrice && (
                        <p className="text-xs font-mono" style={{ color:'var(--text-muted)' }}>cost ${Number(p.costPrice).toFixed(2)}</p>
                      )}
                    </td>
                    <td className="td" style={{ minWidth:100 }}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={clsx('text-sm font-bold font-mono', isOut(p) ? '' : isLow(p) ? '' : '')}
                          style={{ color: isOut(p) ? 'var(--rose)' : isLow(p) ? 'var(--amber)' : 'var(--text-primary)' }}>
                          {p.quantity}
                        </span>
                        {isLow(p) && <AlertTriangle size={10} style={{ color:'var(--amber)' }} />}
                        {isOut(p) && <X size={10} style={{ color:'var(--rose)' }} />}
                      </div>
                      <div className="progress-track h-1">
                        <div className="progress-fill" style={{ width:`${pct(p)}%`, background: isOut(p) ? 'var(--rose)' : isLow(p) ? 'var(--amber)' : 'var(--emerald)' }} />
                      </div>
                    </td>
                    <td className="td"><span className={`badge ${statusBadge[p.status]}`}>{p.status}</span></td>
                    {canEdit && (
                      <td className="td">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(p)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all" style={{ color:'var(--text-muted)' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-dim)'; e.currentTarget.style.color = 'var(--accent)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}>
                            <Edit2 size={12} />
                          </button>
                          {canDelete && (
                            <button onClick={() => setDel(p)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all" style={{ color:'var(--text-muted)' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'var(--rose-dim)'; e.currentTarget.style.color = 'var(--rose)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}>
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal — STAFF sees limited fields */}
      <Modal isOpen={open} onClose={() => setOpen(false)} title={editing ? (user?.role === 'STAFF' ? 'Update Stock' : 'Edit Product') : 'New Product'} size={user?.role === 'STAFF' ? 'sm' : 'lg'}>
        <form onSubmit={save} className="space-y-4">
          {user?.role === 'STAFF' ? (
            <>
              <p className="text-xs px-3 py-2 rounded-lg" style={{ background:'var(--accent-dim)', color:'var(--accent-text)', border:'1px solid rgba(37,99,235,0.2)' }}>
                Staff can only update quantity and status.
              </p>
              <div>
                <label className="label">Quantity</label>
                <input className="input" type="number" min="0" value={form.quantity || ''} onChange={e => setForm({ ...form, quantity: e.target.value })} required />
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status || 'ACTIVE'} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Product Name *</label><input className="input" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. MacBook Pro 14 inch" /></div>
                <div><label className="label">SKU *</label><input className="input font-mono" value={form.sku || ''} onChange={e => setForm({ ...form, sku: e.target.value })} required placeholder="e.g. MBP-14-M3" /></div>
              </div>
              <div><label className="label">Description</label><textarea className="input resize-none" rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Selling Price ($) *</label><input className="input" type="number" step="0.01" min="0" value={form.sellingPrice || ''} onChange={e => setForm({ ...form, sellingPrice: e.target.value })} required /></div>
                <div><label className="label">Cost Price ($) *</label><input className="input" type="number" step="0.01" min="0" value={form.costPrice || ''} onChange={e => setForm({ ...form, costPrice: e.target.value })} required /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="label">Quantity</label><input className="input" type="number" min="0" value={form.quantity || ''} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div>
                <div><label className="label">Reorder Level</label><input className="input" type="number" min="0" value={form.reorderLevel || ''} onChange={e => setForm({ ...form, reorderLevel: e.target.value })} /></div>
                <div><label className="label">Unit</label><input className="input" value={form.unit || ''} onChange={e => setForm({ ...form, unit: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Category</label>
                  <select className="input" value={form.categoryId || ''} onChange={e => setForm({ ...form, categoryId: e.target.value, subCategoryId: '' })}>
                    <option value="">None</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select></div>
                <div><label className="label">Sub-Category</label>
                  <select className="input" value={form.subCategoryId || ''} onChange={e => setForm({ ...form, subCategoryId: e.target.value })}>
                    <option value="">None</option>{subCats.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Supplier</label>
                  <select className="input" value={form.supplierId || ''} onChange={e => setForm({ ...form, supplierId: e.target.value })}>
                    <option value="">None</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select></div>
                <div><label className="label">Warehouse</label>
                  <select className="input" value={form.warehouseId || ''} onChange={e => setForm({ ...form, warehouseId: e.target.value })}>
                    <option value="">None</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select></div>
              </div>
              <div><label className="label">Status</label>
                <select className="input" value={form.status || 'ACTIVE'} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="DISCONTINUED">Discontinued</option>
                </select></div>
            </>
          )}
          <div className="flex gap-3 pt-4" style={{ borderTop:'1px solid var(--border)', marginTop:8 }}>
            <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary flex-1 justify-center">
              {saving ? 'Saving…' : editing ? '✓ Save Changes' : '+ Create Product'}
            </button>
          </div>
        </form>
      </Modal>

      <Confirm isOpen={!!del} onClose={() => setDel(null)} onConfirm={doDelete}
        title="Delete Product" message={`Permanently delete "${del?.name}"? This cannot be undone.`} loading={deleting} />
    </div>
  )
}
