import { useState, useEffect, useCallback } from 'react'
import { categoriesAPI } from '../api'
import { Modal, Loader, Empty, Toast, useToast, Confirm } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { Plus, Edit2, Trash2, Tag, Package, Layers, AlertTriangle } from 'lucide-react'

const COLORS_LIST = ['#2563eb','#34d399','#fb923c','#fb7185','#a78bfa','#38bdf8','#f472b6','#84cc16','#06b6d4','#ec4899']

export default function Categories() {
  const { isAdmin, isViewer } = useAuth()
  const [cats, setCats]       = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen]       = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm]       = useState({ name:'', description:'', color:'#2563eb' })
  const [saving, setSaving]   = useState(false)
  const [del, setDel]         = useState(null)
  const [deleting, setDeleting] = useState(false)
  const { toast, show, hide } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await categoriesAPI.getAll(); setCats(r.data) }
    catch { show('Failed.','error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd  = () => { setEditing(null); setForm({ name:'', description:'', color:'#2563eb' }); setOpen(true) }
  const openEdit = c => { setEditing(c); setForm({ name:c.name, description:c.description||'', color:c.color }); setOpen(true) }

  const save = async e => {
    e.preventDefault(); setSaving(true)
    try {
      editing ? await categoriesAPI.update(editing.id, form) : await categoriesAPI.create(form)
      show(editing ? 'Category updated!' : 'Category created!')
      setOpen(false); load()
    } catch (ex) { show(ex.response?.data?.error || 'Failed.', 'error') }
    finally { setSaving(false) }
  }

  const doDelete = async () => {
    setDeleting(true)
    try { await categoriesAPI.delete(del.id); show('Category deleted.'); setDel(null); load() }
    catch { show('Cannot delete — products may be linked.', 'error') }
    finally { setDeleting(false) }
  }

  return (
    <div className="space-y-4">
      <Toast toast={toast} hide={hide} />

      {isViewer && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs" style={{ background:'rgba(161,161,170,0.08)', border:'1px solid var(--border)', color:'var(--text-muted)' }}>
          👁 Read-only access. You can view categories but cannot make changes.
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="chip">{cats.length} categories</span>
        {isAdmin && (
          <button onClick={openAdd} className="btn btn-primary btn-sm">
            <Plus size={14} /> Add Category
          </button>
        )}
      </div>

      {loading ? <Loader /> : cats.length === 0 ? (
        <Empty title="No categories yet" message={isAdmin ? 'Add your first category.' : 'No categories have been created yet.'} action={isAdmin && <button onClick={openAdd} className="btn btn-primary btn-sm">Add Category</button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {cats.map(c => (
            <div key={c.id} className="card p-5 card-interactive">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background:`${c.color}18`, border:`1px solid ${c.color}30` }}>
                    <Tag size={16} style={{ color:c.color }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color:'var(--text-primary)' }}>{c.name}</p>
                    <p className="text-xs" style={{ color:'var(--text-muted)' }}>{c.description || 'No description'}</p>
                  </div>
                </div>
                {/* Admin only — edit and danger delete */}
                {isAdmin && (
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(c)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all" style={{ color:'var(--text-muted)' }}
                      onMouseEnter={e => { e.currentTarget.style.background='var(--accent-dim)'; e.currentTarget.style.color='var(--accent)' }}
                      onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text-muted)' }}>
                      <Edit2 size={12} />
                    </button>
                    <button onClick={() => setDel(c)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all" style={{ color:'var(--text-muted)' }}
                      title="Delete entire category"
                      onMouseEnter={e => { e.currentTarget.style.background='var(--rose-dim)'; e.currentTarget.style.color='var(--rose)' }}
                      onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text-muted)' }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
              {c.subCategories?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {c.subCategories.map(s => <span key={s.id} className="chip text-xs">{s.name}</span>)}
                </div>
              )}
              <div className="flex items-center gap-3 pt-3" style={{ borderTop:'1px solid var(--border)' }}>
                <Package size={12} style={{ color:'var(--text-muted)' }} />
                <span className="text-xs" style={{ color:'var(--text-secondary)' }}>{c._count?.products ?? 0} products</span>
                <Layers size={12} style={{ color:'var(--text-muted)' }} />
                <span className="text-xs" style={{ color:'var(--text-secondary)' }}>{c.subCategories?.length ?? 0} sub-categories</span>
                <div className="ml-auto w-3 h-3 rounded-full flex-shrink-0" style={{ background:c.color }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin-only danger zone */}
      {isAdmin && cats.length > 0 && (
        <div className="card p-5" style={{ border:'1px solid var(--rose-border)', background:'rgba(251,113,133,0.03)' }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} style={{ color:'var(--rose)' }} />
            <p className="text-sm font-semibold" style={{ color:'var(--rose)' }}>Danger Zone — Admin Only</p>
          </div>
          <p className="text-xs mb-3" style={{ color:'var(--text-muted)' }}>
            These actions are permanent and cannot be undone. Only admins can see this section.
          </p>
          <button
            onClick={() => alert('This would export all category data to CSV. Hook up your export logic here.')}
            className="btn btn-ghost btn-sm"
            style={{ borderColor:'var(--rose-border)', color:'var(--rose)' }}>
            Export All Categories to CSV
          </button>
        </div>
      )}

      <Modal isOpen={open} onClose={() => setOpen(false)} title={editing ? 'Edit Category' : 'New Category'} size="sm">
        <form onSubmit={save} className="space-y-4">
          <div><label className="label">Name *</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Electronics" /></div>
          <div><label className="label">Description</label><input className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div>
            <label className="label">Colour</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {COLORS_LIST.map(col => (
                <button key={col} type="button" onClick={() => setForm({ ...form, color: col })}
                  className="w-8 h-8 rounded-lg transition-all"
                  style={{ background:col, border:form.color===col?'2px solid white':'2px solid transparent', transform:form.color===col?'scale(1.18)':'scale(1)' }} />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-4" style={{ borderTop:'1px solid var(--border)', marginTop:8 }}>
            <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary flex-1 justify-center">{saving ? '…' : editing ? 'Save' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      <Confirm isOpen={!!del} onClose={() => setDel(null)} onConfirm={doDelete}
        title="Delete Category" message={`Permanently delete "${del?.name}"? Products in this category will become uncategorized.`} loading={deleting} />
    </div>
  )
}
