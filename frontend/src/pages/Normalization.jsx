import { useState, useEffect } from 'react'
import { normAPI } from '../api'
import { Loader } from '../components/ui'
import {
  Database, Key, Link2, CheckCircle2, Table2,
  ChevronDown, ChevronRight, BookOpen, Layers,
  Code2, Play, Zap, AlertCircle, Hash, Clock,
  FileText, GitBranch
} from 'lucide-react'

// ── helpers ────────────────────────────────────────────────────────────────────
const typeColor = (t = '') => {
  const x = t.toLowerCase()
  if (x.includes('uuid') || x.includes('varchar') || x.includes('text') || x.includes('character'))
    return { bg:'rgba(56,189,248,0.12)', color:'#38bdf8', label:'Alpha / String' }
  if (x.includes('integer') || x.includes('bigint') || x.includes('int'))
    return { bg:'rgba(52,211,153,0.12)', color:'#34d399', label:'Numeric' }
  if (x.includes('numeric') || x.includes('decimal'))
    return { bg:'rgba(37,99,235,0.12)', color:'#2563eb', label:'Currency / Decimal' }
  if (x.includes('timestamp') || x.includes('date'))
    return { bg:'rgba(251,146,60,0.12)', color:'#fb923c', label:'Date / Time' }
  if (x.includes('bool'))
    return { bg:'rgba(167,139,250,0.12)', color:'#a78bfa', label:'Boolean' }
  return { bg:'rgba(161,161,170,0.12)', color:'#a1a1aa', label:'Other' }
}

const labColors = {
  'LAB 1': '#2563eb',
  'LAB 2': '#34d399',
  'LAB 3': '#fb923c',
  'LAB 4': '#a78bfa',
  'LAB 5': '#38bdf8',
  'LAB 6': '#fb7185',
}

function Badge({ children, color = '#2563eb', bg }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold"
      style={{ background: bg || `${color}18`, color, border:`1px solid ${color}30`, letterSpacing:'0.03em' }}>
      {children}
    </span>
  )
}

function SectionBox({ icon: Icon, title, subtitle, color = '#2563eb', children }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 flex items-center gap-3"
        style={{ background:'var(--bg-surface)', borderBottom:'1px solid var(--border)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background:`${color}18`, border:`1px solid ${color}30` }}>
          <Icon size={16} style={{ color }} />
        </div>
        <div>
          <p className="font-semibold text-sm" style={{ color:'var(--text-primary)' }}>{title}</p>
          {subtitle && <p className="text-xs mt-0.5" style={{ color:'var(--text-muted)' }}>{subtitle}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function CodeSQL({ sql }) {
  const kw = ['SELECT','FROM','WHERE','JOIN','LEFT','INNER','OUTER','ON','INSERT','UPDATE','DELETE',
    'ORDER','BY','GROUP','HAVING','LIMIT','COUNT','SUM','AVG','MAX','MIN','AS','AND','OR',
    'NOT','IN','LIKE','BETWEEN','IS','NULL','DISTINCT','COALESCE','ROUND','LOWER','LENGTH',
    'SUBSTRING','RIGHT','CASE','WHEN','THEN','ELSE','END','ANY','ALL','NULLS','LAST']
  let html = sql
  kw.forEach(k => {
    html = html.replace(new RegExp(`\\b${k}\\b`, 'g'),
      `<span style="color:#38bdf8;font-weight:700">${k}</span>`)
  })
  html = html.replace(/'([^']*)'/g, `<span style="color:#a78bfa">'$1'</span>`)
  html = html.replace(/\b(\d+)\b/g, `<span style="color:#fb923c">$1</span>`)
  return (
    <pre className="text-xs rounded-xl px-4 py-3 overflow-x-auto leading-relaxed"
      style={{ background:'#0d1117', fontFamily:'DM Mono, Courier New, monospace', color:'#e6edf3' }}
      dangerouslySetInnerHTML={{ __html: html }} />
  )
}

function ResultTable({ rows }) {
  if (!rows || rows.length === 0)
    return <p className="text-xs text-center py-4" style={{ color:'var(--text-muted)' }}>No rows returned</p>
  const cols = Object.keys(rows[0])
  return (
    <div className="overflow-x-auto rounded-xl" style={{ border:'1px solid var(--border)' }}>
      <table className="w-full">
        <thead>
          <tr style={{ background:'var(--bg-surface)' }}>
            {cols.map(c => (
              <th key={c} className="text-left px-3 py-2 whitespace-nowrap"
                style={{ color:'var(--accent)', borderBottom:'1px solid var(--border)', fontSize:10, fontWeight:700, fontFamily:'monospace', letterSpacing:'0.05em' }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: i<rows.length-1?'1px solid var(--border)':'none' }}>
              {cols.map(c => {
                const v = row[c]
                const isNull = v === null || v === undefined
                return (
                  <td key={c} className="px-3 py-2 text-xs font-mono whitespace-nowrap"
                    style={{ color: isNull ? 'var(--text-dim)' : 'var(--text-secondary)', fontStyle: isNull?'italic':'normal' }}>
                    {isNull ? 'NULL' : typeof v === 'object' ? JSON.stringify(v).slice(0,40) : String(v).slice(0,60)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function Normalization() {
  const [schema, setSchema]       = useState([])
  const [queryResults, setResults] = useState({})
  const [fdData, setFdData]       = useState(null)
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [openEntity, setOpenEntity] = useState('products')
  const [openLab, setOpenLab]     = useState('LAB 1')
  const [openFd, setOpenFd]       = useState(0)

  useEffect(() => {
    setLoading(true)
    Promise.all([normAPI.schema(), normAPI.runAll(), normAPI.fds()])
      .then(([s, q, f]) => {
        setSchema(s.data)
        setResults(q.data)
        setFdData(f.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background:'var(--accent-dim)' }}>
        <Database size={20} style={{ color:'var(--accent)' }} />
      </div>
      <p className="font-semibold text-sm" style={{ color:'var(--text-primary)' }}>Loading all query results from database…</p>
      <p className="text-xs" style={{ color:'var(--text-muted)' }}>Running 35 queries across 6 labs — please wait</p>
      <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor:'var(--border-hover)', borderTopColor:'var(--accent)' }} />
    </div>
  )

  // Group queries by lab
  const byLab = {}
  Object.entries(queryResults).forEach(([key, q]) => {
    if (!byLab[q.lab]) byLab[q.lab] = []
    byLab[q.lab].push({ key, ...q })
  })
  const labOrder = ['LAB 1','LAB 2','LAB 3','LAB 4','LAB 5','LAB 6']

  // Field type summary across all entities
  const fieldTypes = { alpha:0, numeric:0, currency:0, datetime:0, boolean:0 }
  schema.forEach(e => e.columns.forEach(c => {
    const t = c.data_type?.toLowerCase() || ''
    if (t.includes('character') || t.includes('text') || t.includes('uuid')) fieldTypes.alpha++
    else if (t.includes('integer') || t.includes('bigint')) fieldTypes.numeric++
    else if (t.includes('numeric') || t.includes('decimal')) fieldTypes.currency++
    else if (t.includes('timestamp') || t.includes('date')) fieldTypes.datetime++
    else if (t.includes('bool')) fieldTypes.boolean++
  }))

  const tabs = [
    { id:'overview',      label:'Overview & Field Types',   icon:Database },
    { id:'entities',      label:'22 Entities / Schema',     icon:Table2 },
    { id:'normalization', label:'1NF → BCNF Proof',         icon:Layers },
    { id:'fds',           label:'Functional Dependencies',  icon:GitBranch },
    { id:'queries',       label:'All Lab Queries',          icon:Play },
  ]

  return (
    <div className="space-y-4">

      {/* Hero header */}
      <div className="card p-5" style={{ background:'var(--bg-surface)', border:'1px solid rgba(37,99,235,0.2)' }}>
        <div className="flex items-start gap-4 mb-4">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background:'var(--accent-dim)', border:'1px solid rgba(37,99,235,0.3)' }}>
            <BookOpen size={20} style={{ color:'var(--accent)' }} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-base" style={{ color:'var(--text-primary)' }}>
              DBMS Project — Normalization, Schema & Sample Queries
            </p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color:'var(--text-secondary)' }}>
              Complete database proof for CT-261 viva. All {Object.keys(queryResults).length} queries
              have been run live against PostgreSQL and results are displayed below.
              {schema.length} entities, full normalization from 1NF to BCNF, all functional dependencies documented.
            </p>
          </div>
        </div>
        {/* Quick stats */}
        <div className="grid grid-cols-3 xl:grid-cols-6 gap-3">
          {[
            { label:'Entities', value:schema.length, color:'var(--accent)' },
            { label:'Total Columns', value:schema.reduce((s,e)=>s+e.columns.length,0), color:'var(--sky)' },
            { label:'Lab Queries', value:Object.keys(queryResults).length, color:'var(--emerald)' },
            { label:'Labs Covered', value:6, color:'var(--violet)' },
            { label:'Alpha Fields', value:fieldTypes.alpha, color:'#38bdf8' },
            { label:'Numeric Fields', value:fieldTypes.numeric+fieldTypes.currency, color:'#34d399' },
          ].map(s => (
            <div key={s.label} className="text-center px-3 py-3 rounded-xl"
              style={{ background:'var(--bg-card)', border:'1px solid var(--border)' }}>
              <p className="text-xl font-bold font-mono" style={{ color:s.color }}>{s.value}</p>
              <p style={{ fontSize:10, color:'var(--text-muted)', letterSpacing:'0.04em' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all"
            style={activeTab===t.id
              ? { background:'var(--accent)', color:'#fff' }
              : { background:'var(--bg-card)', color:'var(--text-secondary)', border:'1px solid var(--border)' }}>
            <t.icon size={13} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Field types proof */}
          <SectionBox icon={Hash} title="Field Types Used — Design Constraint Met" color="#2563eb"
            subtitle="At least 2 different field types required — OrderlyX uses all 5">
            <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 mb-5">
              {[
                { label:'Alpha / String', count:fieldTypes.alpha, desc:'name, sku, description, email, city, status, role…', color:'#38bdf8', ex:'VARCHAR / TEXT / UUID' },
                { label:'Numeric',        count:fieldTypes.numeric, desc:'quantity, reorderLevel, maxStockLevel, paymentTerms…', color:'#34d399', ex:'INTEGER / BIGINT' },
                { label:'Currency',       count:fieldTypes.currency, desc:'sellingPrice, costPrice, taxRate, totalAmount, creditLimit…', color:'#2563eb', ex:'NUMERIC(12,2)' },
                { label:'Date / Time',    count:fieldTypes.datetime, desc:'createdAt, updatedAt, lastLogin, orderDate, expiryDate…', color:'#fb923c', ex:'TIMESTAMP' },
                { label:'Boolean',        count:fieldTypes.boolean, desc:'isActive, isMain, isRead, isResolved, isPrimary…', color:'#a78bfa', ex:'BOOLEAN' },
              ].map(ft => (
                <div key={ft.label} className="p-4 rounded-xl text-center"
                  style={{ background:`${ft.color}0d`, border:`1px solid ${ft.color}25` }}>
                  <p className="text-2xl font-bold font-mono mb-1" style={{ color:ft.color }}>{ft.count}</p>
                  <p className="text-xs font-bold mb-1" style={{ color:ft.color }}>{ft.label}</p>
                  <p style={{ fontSize:9, color:'var(--text-muted)', fontFamily:'monospace' }}>{ft.ex}</p>
                  <p className="text-xs mt-1.5 leading-relaxed" style={{ color:'var(--text-secondary)', fontSize:9 }}>{ft.desc}</p>
                </div>
              ))}
            </div>
          </SectionBox>

          {/* Business problem */}
          <SectionBox icon={FileText} title="I. Organization — Business Problem & Requirements" color="#fb923c">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl" style={{ background:'var(--rose-dim)', border:'1px solid var(--rose-border)' }}>
                <p className="font-bold text-xs mb-2" style={{ color:'var(--rose)' }}>PROBLEM / CHALLENGE</p>
                <p className="text-xs leading-relaxed" style={{ color:'var(--text-secondary)' }}>
                  Small inventory businesses manage stock, orders, and suppliers using paper registers or
                  basic spreadsheets. This causes stock discrepancies, missed reorders, payment tracking
                  errors, and no visibility into financial performance or audit trails.
                </p>
              </div>
              <div className="p-4 rounded-xl" style={{ background:'var(--emerald-dim)', border:'1px solid var(--emerald-border)' }}>
                <p className="font-bold text-xs mb-2" style={{ color:'var(--emerald)' }}>BUSINESS REQUIREMENTS</p>
                <ul className="space-y-1">
                  {['Real-time product catalog with stock levels','Supplier & customer management','Purchase and sale order processing','Stock alerts for low/out-of-stock items','Role-based access control (4 roles)','Audit trail for all system actions','Financial reporting and analytics'].map(r => (
                    <li key={r} className="flex items-start gap-1.5 text-xs" style={{ color:'var(--text-secondary)' }}>
                      <CheckCircle2 size={10} style={{ color:'var(--emerald)', flexShrink:0, marginTop:2 }} />{r}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-4 rounded-xl" style={{ background:'var(--amber-dim)', border:'1px solid var(--amber-border)' }}>
                <p className="font-bold text-xs mb-2" style={{ color:'var(--amber)' }}>CURRENT SYSTEM LIMITATIONS</p>
                <ul className="space-y-1">
                  {['Manual paper billing — calculation errors','No stock level tracking','No supplier payment history','Cannot enforce role-based access','No audit trail','No automated reorder alerts','No financial metrics or reports'].map(r => (
                    <li key={r} className="flex items-start gap-1.5 text-xs" style={{ color:'var(--text-secondary)' }}>
                      <AlertCircle size={10} style={{ color:'var(--amber)', flexShrink:0, marginTop:2 }} />{r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </SectionBox>

          {/* ER model summary */}
          <SectionBox icon={GitBranch} title="II. Conceptual Model — Entity Relationship Summary (22 Entities)" color="#38bdf8">
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              {[
                { group:'Core Inventory', color:'#2563eb', entities:['Product','Category','SubCategory','Warehouse','PriceHistory'] },
                { group:'Supply Chain',   color:'#34d399', entities:['Supplier','SupplierContact','Order','OrderItem','Payment','Shipment'] },
                { group:'Stock Control',  color:'#fb923c', entities:['StockAlert','StockTransfer','StockTransferItem','ReorderRequest'] },
                { group:'CRM & Users',    color:'#a78bfa', entities:['Customer','User','AuditLog'] },
                { group:'Metadata',       color:'#38bdf8', entities:['ProductTag','ProductTagAssignment','DiscountRule','Report'] },
              ].map(g => (
                <div key={g.group} className="p-4 rounded-xl"
                  style={{ background:`${g.color}08`, border:`1px solid ${g.color}25` }}>
                  <p className="font-bold text-xs mb-2.5" style={{ color:g.color }}>{g.group}</p>
                  {g.entities.map(e => (
                    <div key={e} className="flex items-center gap-2 mb-1.5">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background:g.color }} />
                      <span className="text-xs font-mono" style={{ color:'var(--text-secondary)' }}>{e}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </SectionBox>
        </div>
      )}

      {/* ── ENTITIES / SCHEMA ── */}
      {activeTab === 'entities' && (
        <div className="grid grid-cols-12 gap-4">
          {/* Left: entity list */}
          <div className="col-span-3">
            <div className="card overflow-hidden">
              <div className="px-3 py-3" style={{ borderBottom:'1px solid var(--border)', background:'var(--bg-surface)' }}>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color:'var(--text-muted)', letterSpacing:'0.08em' }}>
                  All {schema.length} Entities
                </p>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight:'70vh' }}>
                {schema.map(e => (
                  <button key={e.name} onClick={() => setOpenEntity(e.name)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors"
                    style={{ background: openEntity===e.name?'var(--accent-dim)':'transparent', borderBottom:'1px solid var(--border)' }}
                    onMouseEnter={ev => { if(openEntity!==e.name) ev.currentTarget.style.background='rgba(255,255,255,0.03)' }}
                    onMouseLeave={ev => { if(openEntity!==e.name) ev.currentTarget.style.background='transparent' }}>
                    <Table2 size={12} style={{ color: openEntity===e.name?'var(--accent)':'var(--text-muted)', flexShrink:0 }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono font-semibold truncate" style={{ color: openEntity===e.name?'var(--accent)':'var(--text-primary)', fontSize:11 }}>{e.name}</p>
                      <p style={{ fontSize:9, color:'var(--text-muted)' }}>{e.rowCount} rows · {e.columns.length} cols</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: selected entity schema */}
          <div className="col-span-9">
            {schema.filter(e => e.name === openEntity).map(e => (
              <div key={e.name} className="card overflow-hidden">
                <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom:'1px solid var(--border)', background:'var(--bg-surface)' }}>
                  <Key size={14} style={{ color:'var(--accent)' }} />
                  <p className="font-semibold text-sm" style={{ color:'var(--text-primary)' }}>
                    <span className="font-mono" style={{ color:'var(--accent)' }}>{e.name}</span>
                    <span className="text-xs ml-2" style={{ color:'var(--text-muted)' }}>— {e.columns.length} columns, {e.rowCount} rows</span>
                  </p>
                  <div className="ml-auto flex gap-2 flex-wrap">
                    {['alpha','numeric','currency','datetime','boolean'].filter(type => {
                      return e.columns.some(c => {
                        const t = c.data_type?.toLowerCase()||''
                        if (type==='alpha')    return t.includes('char')||t.includes('text')||t.includes('uuid')
                        if (type==='numeric')  return t.includes('integer')||t.includes('bigint')
                        if (type==='currency') return t.includes('numeric')||t.includes('decimal')
                        if (type==='datetime') return t.includes('timestamp')||t.includes('date')
                        if (type==='boolean')  return t.includes('bool')
                        return false
                      })
                    }).map(type => {
                      const colors = { alpha:'#38bdf8', numeric:'#34d399', currency:'#2563eb', datetime:'#fb923c', boolean:'#a78bfa' }
                      return <Badge key={type} color={colors[type]}>{type}</Badge>
                    })}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ background:'var(--bg-surface)' }}>
                        {['#','Column Name','Data Type','Field Category','Nullable','PK','FK → Table','Unique'].map(h => (
                          <th key={h} className="text-left px-3 py-2.5 whitespace-nowrap"
                            style={{ color:'var(--text-muted)', borderBottom:'1px solid var(--border)', fontSize:9, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {e.columns.map((col, i) => {
                        const tc = typeColor(col.data_type)
                        return (
                          <tr key={i} style={{ borderBottom: i<e.columns.length-1?'1px solid var(--border)':'none' }}>
                            <td className="px-3 py-2.5 text-xs font-mono" style={{ color:'var(--text-dim)' }}>{i+1}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                {col.is_pk && <Key size={10} style={{ color:'var(--accent)', flexShrink:0 }} />}
                                {col.is_fk && !col.is_pk && <Link2 size={10} style={{ color:'var(--sky)', flexShrink:0 }} />}
                                <span className="font-mono font-semibold text-xs" style={{ color: col.is_pk?'var(--accent)': col.is_fk?'var(--sky)':'var(--text-primary)' }}>
                                  {col.column_name}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="badge text-xs" style={{ background:tc.bg, color:tc.color, border:`1px solid ${tc.color}30`, fontSize:9 }}>
                                {col.data_type}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="text-xs" style={{ color:tc.color, fontSize:9 }}>{tc.label}</span>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="badge" style={{ fontSize:9, ...(col.is_nullable==='YES'?{background:'rgba(161,161,170,0.1)',color:'#a1a1aa',border:'1px solid rgba(161,161,170,0.2)'}:{background:'rgba(52,211,153,0.1)',color:'#34d399',border:'1px solid rgba(52,211,153,0.25)'}) }}>
                                {col.is_nullable==='YES'?'NULL':'NOT NULL'}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {col.is_pk && <Key size={12} style={{ color:'var(--accent)' }} />}
                            </td>
                            <td className="px-3 py-2.5">
                              {col.references_table && (
                                <span className="flex items-center gap-1 text-xs font-mono" style={{ color:'var(--sky)' }}>
                                  <Link2 size={9} />{col.references_table}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {col.is_unique && <CheckCircle2 size={12} style={{ color:'var(--emerald)' }} />}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── NORMALIZATION ── */}
      {activeTab === 'normalization' && (
        <div className="space-y-4">
          {[
            {
              form:'1NF — First Normal Form',
              color:'#34d399',
              rule:'Every column must be atomic (single value). No repeating groups. Each table must have a primary key.',
              proof:[
                'Every column stores exactly ONE value — no arrays or comma-separated lists stored in any field',
                'products table: each product has ONE name, ONE price, ONE quantity — not a list',
                'order_items separates each line item into its own row — no repeating groups',
                'supplier_contacts is a separate table — not a multi-value field in suppliers',
                'product_tag_assignments is a junction table — not a tags array inside products',
                'Every table has a UUID primary key (id column) satisfying the PK requirement',
              ],
              example: {
                bad:  'BAD (violates 1NF):\nproducts(id, name, prices="100,200,300", categories="Electronics,Office")',
                good: 'GOOD (OrderlyX 1NF):\nproducts(id, name, sellingPrice, categoryId)\ncategories(id, name)\nproduct_tag_assignments(productId, tagId)'
              }
            },
            {
              form:'2NF — Second Normal Form',
              color:'#38bdf8',
              rule:'Must be in 1NF. Every non-key attribute must depend on the WHOLE primary key, not just part of it.',
              proof:[
                'All tables with single-column UUID primary keys are automatically in 2NF (no partial dependency possible)',
                'order_items has composite key (orderId + productId). subtotal = unitPrice × quantity — depends on BOTH keys. ✅',
                'product_tag_assignments junction table: only stores (productId, tagId, assignedAt) — all depend on both keys',
                'No non-key attribute depends on just part of the key in any table',
                'Example: in orders table — totalAmount, status, notes all depend on the full order id, not on just userId or supplierId',
              ],
              example: {
                bad:  'BAD (violates 2NF):\norder_items(orderId, productId, quantity, productName)\n→ productName depends on productId alone, not on (orderId+productId)',
                good: 'GOOD (OrderlyX 2NF):\norder_items(id, orderId, productId, quantity, unitPrice, subtotal)\n→ productName stored in products table, fetched via JOIN'
              }
            },
            {
              form:'3NF — Third Normal Form',
              color:'#fb923c',
              rule:'Must be in 2NF. No transitive dependencies — non-key columns must not depend on other non-key columns.',
              proof:[
                'products table: sellingPrice depends on id (PK), NOT on categoryId or supplierId',
                'orders table: totalAmount depends on id (PK), NOT on userId or supplierId',
                'Category details (name, color, icon) live in categories table — NOT duplicated in products',
                'Supplier details (name, email, city) live in suppliers table — NOT repeated in each product or order',
                'Warehouse details stored once in warehouses — products just store warehouseId (FK)',
                'User details stored once in users — orders, audit_logs just store userId (FK)',
              ],
              example: {
                bad:  'BAD (violates 3NF):\nproducts(id, name, supplierId, supplierName, supplierCity)\n→ supplierName depends on supplierId (non-key), not on id directly',
                good: 'GOOD (OrderlyX 3NF):\nproducts(id, name, supplierId)\nsuppliers(id, name, city, country)\n→ Join when supplier info needed'
              }
            },
            {
              form:'BCNF — Boyce-Codd Normal Form',
              color:'#a78bfa',
              rule:'For every functional dependency X → Y, X must be a superkey. Stronger than 3NF.',
              proof:[
                'In products: id → name, sku, sellingPrice, costPrice, quantity (id is PK = superkey) ✅',
                'In products: sku → id (sku is UNIQUE = candidate key = superkey) ✅',
                'In categories: id → name, color (id is PK). name → id (name is UNIQUE = candidate key) ✅',
                'In users: id → name, email, role (id is PK). email → id (UNIQUE constraint) ✅',
                'In orders: id → all columns (PK). orderNumber → id (UNIQUE candidate key) ✅',
                'No non-superkey determinants exist in any table — BCNF is fully satisfied across all 22 entities',
              ],
              example: {
                bad:  'BAD (violates BCNF):\nproduct_suppliers(productId, supplierId, supplierCountry)\n→ supplierId→supplierCountry but supplierId is not a superkey here',
                good: 'GOOD (OrderlyX BCNF):\nproducts(id, ..., supplierId) → FK only\nsuppliers(id, country, ...) → country determined by supplier PK\nNo violation — every determinant is a candidate key'
              }
            },
          ].map((nf, i) => (
            <div key={i} className="card overflow-hidden">
              <div className="px-5 py-4 flex items-center gap-3"
                style={{ background:`${nf.color}08`, borderBottom:'1px solid var(--border)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0"
                  style={{ background:`${nf.color}20`, color:nf.color, border:`1px solid ${nf.color}30` }}>
                  {['1NF','2NF','3NF','BC'][i]}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm" style={{ color:nf.color }}>{nf.form}</p>
                  <p className="text-xs mt-0.5" style={{ color:'var(--text-secondary)' }}>{nf.rule}</p>
                </div>
                <Badge color={nf.color}>✓ APPLIED</Badge>
              </div>
              <div className="p-5 grid grid-cols-1 xl:grid-cols-2 gap-5">
                <div>
                  <p className="text-xs font-bold mb-3 uppercase tracking-widest" style={{ color:nf.color, letterSpacing:'0.08em' }}>
                    Proof in OrderlyX Database
                  </p>
                  <ul className="space-y-2">
                    {nf.proof.map((p,j) => (
                      <li key={j} className="flex items-start gap-2 text-xs" style={{ color:'var(--text-secondary)' }}>
                        <CheckCircle2 size={12} style={{ color:nf.color, flexShrink:0, marginTop:2 }} />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-bold mb-3 uppercase tracking-widest" style={{ color:'var(--text-muted)', letterSpacing:'0.08em' }}>
                    Violation vs Correct Design
                  </p>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs mb-1 font-semibold" style={{ color:'var(--rose)' }}>❌ Violation Example</p>
                      <pre className="text-xs rounded-lg p-3 leading-relaxed"
                        style={{ background:'rgba(251,113,133,0.06)', border:'1px solid rgba(251,113,133,0.2)', color:'#fb7185', fontFamily:'monospace', whiteSpace:'pre-wrap' }}>
                        {nf.example.bad}
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs mb-1 font-semibold" style={{ color:nf.color }}>✅ How OrderlyX Does It</p>
                      <pre className="text-xs rounded-lg p-3 leading-relaxed"
                        style={{ background:`${nf.color}08`, border:`1px solid ${nf.color}25`, color:nf.color, fontFamily:'monospace', whiteSpace:'pre-wrap' }}>
                        {nf.example.good}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── FUNCTIONAL DEPENDENCIES ── */}
      {activeTab === 'fds' && fdData && (
        <div className="space-y-4">
          <div className="card p-4" style={{ background:'var(--bg-surface)' }}>
            <p className="font-semibold text-sm mb-2" style={{ color:'var(--text-primary)' }}>What are Functional Dependencies?</p>
            <p className="text-xs leading-relaxed" style={{ color:'var(--text-secondary)' }}>{fdData.explanation}</p>
          </div>
          {fdData.tables.map((t, i) => (
            <div key={i} className="card overflow-hidden">
              <button className="w-full flex items-center gap-3 px-5 py-4 text-left"
                style={{ background: openFd===i?'var(--accent-dim)':'var(--bg-surface)', borderBottom:'1px solid var(--border)' }}
                onClick={() => setOpenFd(openFd===i ? -1 : i)}>
                <Table2 size={14} style={{ color:'var(--accent)' }} />
                <div className="flex-1">
                  <p className="font-mono font-semibold text-sm" style={{ color:'var(--text-primary)' }}>{t.table}</p>
                  <p className="text-xs" style={{ color:'var(--text-muted)' }}>Primary Key: <span className="font-mono text-accent" style={{ color:'var(--accent)' }}>{t.pk}</span> · {t.fds.length} FDs</p>
                </div>
                {openFd===i ? <ChevronDown size={14} style={{ color:'var(--text-muted)' }} /> : <ChevronRight size={14} style={{ color:'var(--text-muted)' }} />}
              </button>
              {openFd===i && (
                <div className="p-5">
                  <table className="w-full">
                    <thead>
                      <tr style={{ background:'var(--bg-surface)' }}>
                        {['Determinant (X)','→','Dependent (Y)','Explanation'].map(h => (
                          <th key={h} className="text-left px-3 py-2.5 text-xs font-bold uppercase tracking-widest"
                            style={{ color:'var(--text-muted)', borderBottom:'1px solid var(--border)', fontSize:9, letterSpacing:'0.07em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {t.fds.map((fd, j) => (
                        <tr key={j} style={{ borderBottom: j<t.fds.length-1?'1px solid var(--border)':'none' }}>
                          <td className="px-3 py-3">
                            <span className="font-mono font-bold text-xs px-2 py-1 rounded-lg"
                              style={{ background:'var(--accent-dim)', color:'var(--accent)', border:'1px solid rgba(37,99,235,0.2)' }}>
                              {fd.from}
                            </span>
                          </td>
                          <td className="px-2 py-3 text-lg" style={{ color:'var(--text-muted)' }}>→</td>
                          <td className="px-3 py-3">
                            <span className="font-mono text-xs" style={{ color:'var(--text-secondary)' }}>{fd.to}</span>
                          </td>
                          <td className="px-3 py-3 text-xs" style={{ color:'var(--text-muted)' }}>{fd.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── ALL LAB QUERIES ── */}
      {activeTab === 'queries' && (
        <div className="space-y-4">
          <div className="card p-4" style={{ background:'var(--bg-surface)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Zap size={14} style={{ color:'var(--accent)' }} />
              <p className="font-semibold text-sm" style={{ color:'var(--text-primary)' }}>
                All {Object.keys(queryResults).length} Lab Queries — Pre-Run Against Live Database
              </p>
            </div>
            <p className="text-xs" style={{ color:'var(--text-secondary)' }}>
              Every query below was executed automatically on page load against the PostgreSQL database.
              Results are real data from your OrderlyX database. Click any lab to expand all queries.
            </p>
            {/* Lab selector */}
            <div className="flex flex-wrap gap-2 mt-3">
              {labOrder.map(lab => (
                <button key={lab} onClick={() => setOpenLab(lab)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={openLab===lab
                    ? { background: labColors[lab], color:'#fff' }
                    : { background:`${labColors[lab]}18`, color:labColors[lab], border:`1px solid ${labColors[lab]}30` }}>
                  {lab} ({byLab[lab]?.length || 0} queries)
                </button>
              ))}
            </div>
          </div>

          {/* Selected lab queries */}
          {byLab[openLab]?.sort((a,b)=>a.q.localeCompare(b.q)).map(q => (
            <div key={q.key} className="card overflow-hidden">
              <div className="px-5 py-3 flex items-center gap-3"
                style={{ background:'var(--bg-surface)', borderBottom:'1px solid var(--border)' }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0"
                  style={{ background:`${labColors[openLab]}18`, color:labColors[openLab], border:`1px solid ${labColors[openLab]}30` }}>
                  {q.q}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm" style={{ color:'var(--text-primary)' }}>{q.title}</p>
                </div>
                <div className="flex items-center gap-2">
                  {q.status === 'success'
                    ? <Badge color="#34d399">✓ {q.rowCount} rows</Badge>
                    : <Badge color="#fb7185">Error</Badge>}
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-xs font-bold mb-2 uppercase tracking-widest" style={{ color:'var(--text-muted)', letterSpacing:'0.08em' }}>SQL Query</p>
                  <CodeSQL sql={q.sql} />
                </div>
                {q.status === 'success' ? (
                  <div>
                    <p className="text-xs font-bold mb-2 uppercase tracking-widest" style={{ color:'var(--text-muted)', letterSpacing:'0.08em' }}>
                      Results from PostgreSQL ({q.rowCount} rows)
                    </p>
                    <ResultTable rows={q.rows} />
                  </div>
                ) : (
                  <div className="p-3 rounded-xl text-xs" style={{ background:'var(--rose-dim)', border:'1px solid var(--rose-border)', color:'var(--rose)' }}>
                    {q.error}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
