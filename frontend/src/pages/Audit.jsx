import { useState, useEffect } from 'react'
import { auditAPI } from '../api'
import { Loader, Empty } from '../components/ui'
import { ClipboardList, Plus, Edit2, Trash2, LogIn, LogOut } from 'lucide-react'

const actionStyle = {
  CREATE: { badge:'badge-emerald', icon: Plus },
  UPDATE: { badge:'badge-sky',     icon: Edit2 },
  DELETE: { badge:'badge-rose',    icon: Trash2 },
  LOGIN:  { badge:'badge-gold',    icon: LogIn },
  LOGOUT: { badge:'badge-neutral', icon: LogOut },
}

export default function Audit() {
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('')

  useEffect(() => {
    auditAPI.getAll()
      .then(r => setLogs(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter ? logs.filter(l => l.action === filter) : logs

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background:'rgba(37,99,235,0.08)', border:'1px solid rgba(37,99,235,0.2)', color:'var(--accent-text)' }}>
          <ClipboardList size={13} /> Admin only — full system activity log
        </div>
        <div className="flex-1" />
        <select className="input w-40 text-sm" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All Actions</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
          <option value="LOGIN">Login</option>
          <option value="LOGOUT">Logout</option>
        </select>
        <span className="chip">{filtered.length} events</span>
      </div>

      {loading ? <Loader /> : filtered.length === 0 ? (
        <Empty title="No audit logs" message="System activity will appear here." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead><tr>
              {['Action', 'Table', 'Record', 'User', 'Details', 'Time'].map(h => <th key={h} className="th">{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map(log => {
                const a = actionStyle[log.action] || { badge:'badge-neutral', icon: ClipboardList }
                const Icon = a.icon
                return (
                  <tr key={log.id} className="tr">
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <Icon size={12} />
                        <span className={`badge ${a.badge}`}>{log.action}</span>
                      </div>
                    </td>
                    <td className="td"><span className="chip font-mono text-xs">{log.tableName}</span></td>
                    <td className="td text-xs font-mono" style={{ color:'var(--text-muted)' }}>
                      {log.recordId ? log.recordId.slice(0,8)+'…' : '—'}
                    </td>
                    <td className="td">
                      <p className="text-xs font-semibold" style={{ color:'var(--text-primary)' }}>{log.user?.name || 'System'}</p>
                      <p className="text-xs" style={{ color:'var(--text-muted)' }}>{log.user?.email}</p>
                    </td>
                    <td className="td text-xs max-w-xs truncate" style={{ color:'var(--text-secondary)' }}>
                      {log.newValues || log.oldValues ? (
                        <code className="text-xs" style={{ color:'var(--text-secondary)' }}>
                          {(log.newValues || log.oldValues || '').slice(0, 60)}
                        </code>
                      ) : '—'}
                    </td>
                    <td className="td text-xs" style={{ color:'var(--text-muted)' }}>
                      {new Date(log.createdAt).toLocaleString('en', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
