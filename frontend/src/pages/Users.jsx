import { useState, useEffect } from 'react'
import { usersAPI } from '../api'
import { Modal, Loader, Empty, Toast, useToast, Confirm } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { Plus, Shield, User, Eye, Edit2, Trash2, UserX, UserCheck } from 'lucide-react'

const roleBadge = { ADMIN:'badge-gold', MANAGER:'badge-sky', STAFF:'badge-emerald', VIEWER:'badge-neutral' }
const roleDesc  = {
  ADMIN:   'Full system access — can manage users, delete data, view all financials',
  MANAGER: 'Management access — can create/edit products, orders, suppliers. No user management.',
  STAFF:   'Operational access — can update stock quantities and create orders only.',
  VIEWER:  'Read-only access — can view all data but cannot make any changes.',
}

export default function Users() {
  const { user: currentUser } = useAuth()
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen]       = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [editForm, setEditForm] = useState({ role: '', isActive: true })
  const [form, setForm]       = useState({ name:'', email:'', password:'', role:'STAFF' })
  const [saving, setSaving]   = useState(false)
  const [del, setDel]         = useState(null)
  const { toast, show, hide } = useToast()

  const load = async () => {
    setLoading(true)
    try { const r = await usersAPI.getAll(); setUsers(r.data) }
    catch { show('Failed to load users.', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async e => {
    e.preventDefault(); setSaving(true)
    try { await usersAPI.create(form); show('User created!'); setOpen(false); setForm({ name:'', email:'', password:'', role:'STAFF' }); load() }
    catch (ex) { show(ex.response?.data?.error || 'Failed.', 'error') }
    finally { setSaving(false) }
  }

  const handleEdit = async e => {
    e.preventDefault(); setSaving(true)
    try { await usersAPI.update(editing.id, editForm); show('User updated!'); setEditOpen(false); load() }
    catch (ex) { show(ex.response?.data?.error || 'Failed.', 'error') }
    finally { setSaving(false) }
  }

  const openEdit = u => { setEditing(u); setEditForm({ role: u.role, isActive: u.isActive }); setEditOpen(true) }

  const doDelete = async () => {
    try { await usersAPI.delete(del.id); show('User deleted.'); setDel(null); load() }
    catch (ex) { show(ex.response?.data?.error || 'Cannot delete.', 'error') }
  }

  const toggleActive = async u => {
    try { await usersAPI.update(u.id, { isActive: !u.isActive }); show(u.isActive ? 'User suspended.' : 'User reactivated.'); load() }
    catch { show('Failed.', 'error') }
  }

  return (
    <div className="space-y-4">
      <Toast toast={toast} hide={hide} />

      <div className="flex items-center justify-between">
        <p className="text-xs px-3 py-2 rounded-lg" style={{ background:'rgba(37,99,235,0.08)', border:'1px solid rgba(37,99,235,0.2)', color:'var(--accent-text)' }}>
          🔐 Admin only — manage team members and access levels
        </p>
        <button onClick={() => setOpen(true)} className="btn btn-primary btn-sm"><Plus size={14} /> Invite User</button>
      </div>

      {/* Role reference */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {Object.entries(roleDesc).map(([role, desc]) => (
          <div key={role} className="card p-4">
            <span className={`badge ${roleBadge[role]} mb-2`}>{role}</span>
            <p className="text-xs leading-relaxed" style={{ color:'var(--text-muted)' }}>{desc}</p>
          </div>
        ))}
      </div>

      {loading ? <Loader /> : (
        <div className="card overflow-hidden">
          <div className="px-5 py-3" style={{ borderBottom:'1px solid var(--border)' }}>
            <p className="section-title">Team Members ({users.length})</p>
          </div>
          <table className="w-full">
            <thead><tr>
              {['User', 'Email', 'Role', 'Status', 'Last Login', 'Joined', 'Actions'].map(h => <th key={h} className="th">{h}</th>)}
            </tr></thead>
            <tbody>
              {users.map(u => {
                const isMe = u.id === currentUser?.id
                return (
                  <tr key={u.id} className="tr" style={!u.isActive ? { opacity: 0.5 } : {}}>
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: u.role === 'ADMIN' ? 'var(--accent-dim)' : '#f1f5f9', color: u.role === 'ADMIN' ? 'var(--accent)' : 'var(--text-secondary)', border:'1px solid var(--border)' }}>
                          {u.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color:'var(--text-primary)' }}>
                            {u.name} {isMe && <span className="badge badge-neutral ml-1" style={{ fontSize:9 }}>You</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="td text-xs" style={{ color:'var(--text-secondary)' }}>{u.email}</td>
                    <td className="td"><span className={`badge ${roleBadge[u.role]}`}>{u.role}</span></td>
                    <td className="td">
                      <span className={`badge ${u.isActive ? 'badge-emerald' : 'badge-rose'}`}>
                        {u.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="td text-xs" style={{ color:'var(--text-muted)' }}>
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('en', { day:'2-digit', month:'short', year:'2-digit' }) : 'Never'}
                    </td>
                    <td className="td text-xs" style={{ color:'var(--text-muted)' }}>
                      {new Date(u.createdAt).toLocaleDateString('en', { day:'2-digit', month:'short', year:'2-digit' })}
                    </td>
                    <td className="td">
                      {!isMe && (
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(u)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all" style={{ color:'var(--text-muted)' }}
                            onMouseEnter={e => { e.currentTarget.style.background='var(--accent-dim)'; e.currentTarget.style.color='var(--accent)' }}
                            onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text-muted)' }}>
                            <Edit2 size={12} />
                          </button>
                          <button onClick={() => toggleActive(u)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all" style={{ color:'var(--text-muted)' }}
                            title={u.isActive ? 'Suspend user' : 'Reactivate user'}
                            onMouseEnter={e => { e.currentTarget.style.background='var(--amber-dim)'; e.currentTarget.style.color='var(--amber)' }}
                            onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text-muted)' }}>
                            {u.isActive ? <UserX size={12} /> : <UserCheck size={12} />}
                          </button>
                          <button onClick={() => setDel(u)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all" style={{ color:'var(--text-muted)' }}
                            onMouseEnter={e => { e.currentTarget.style.background='var(--rose-dim)'; e.currentTarget.style.color='var(--rose)' }}
                            onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text-muted)' }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create user modal */}
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Invite New User" size="sm">
        <form onSubmit={handleCreate} className="space-y-4">
          <div><label className="label">Full Name *</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="John Smith" /></div>
          <div><label className="label">Email *</label><input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required placeholder="john@company.com" /></div>
          <div><label className="label">Password *</label><input className="input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required placeholder="Min 6 characters" minLength={6} /></div>
          <div><label className="label">Role *</label>
            <select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="STAFF">Staff — Operational access</option>
              <option value="MANAGER">Manager — Management access</option>
              <option value="VIEWER">Viewer — Read only</option>
              <option value="ADMIN">Admin — Full access</option>
            </select>
          </div>
          <p className="text-xs" style={{ color:'var(--text-muted)' }}>{roleDesc[form.role]}</p>
          <div className="flex gap-3 pt-4" style={{ borderTop:'1px solid var(--border)', marginTop:8 }}>
            <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary flex-1 justify-center">{saving ? 'Creating…' : 'Create User'}</button>
          </div>
        </form>
      </Modal>

      {/* Edit role modal */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title={`Edit — ${editing?.name}`} size="sm">
        <form onSubmit={handleEdit} className="space-y-4">
          <div><label className="label">Role</label>
            <select className="input" value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
              <option value="STAFF">Staff</option><option value="MANAGER">Manager</option><option value="VIEWER">Viewer</option><option value="ADMIN">Admin</option>
            </select>
          </div>
          <p className="text-xs" style={{ color:'var(--text-muted)' }}>{roleDesc[editForm.role]}</p>
          <div className="flex gap-3 pt-4" style={{ borderTop:'1px solid var(--border)', marginTop:8 }}>
            <button type="button" onClick={() => setEditOpen(false)} className="btn btn-ghost flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary flex-1 justify-center">{saving ? '…' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      <Confirm isOpen={!!del} onClose={() => setDel(null)} onConfirm={doDelete}
        title="Delete User" message={`Permanently delete "${del?.name}"? All their activity logs will remain.`} />
    </div>
  )
}
