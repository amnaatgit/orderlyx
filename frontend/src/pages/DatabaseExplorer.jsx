import { useState, useEffect, useRef } from 'react'
import { dbAPI } from '../api'
import { Loader } from '../components/ui'
import {
  Database, Table2, Code2, GitBranch, BarChart3,
  Play, ChevronRight, ChevronDown, Key, Link2,
  AlertCircle, CheckCircle2, Clock, Layers, Search,
  Eye, BookOpen, Zap
} from 'lucide-react'

// ── Colour helpers ─────────────────────────────────────────────────────────────
const typeColor = (t = '') => {
  const type = t.toLowerCase()
  if (['uuid','character varying','text'].some(x => type.includes(x))) return { bg:'rgba(56,189,248,0.1)', color:'#38bdf8', border:'rgba(56,189,248,0.25)' }
  if (['integer','bigint','numeric','decimal'].some(x => type.includes(x)))  return { bg:'rgba(52,211,153,0.1)', color:'#34d399', border:'rgba(52,211,153,0.25)' }
  if (type.includes('bool'))  return { bg:'rgba(167,139,250,0.1)', color:'#a78bfa', border:'rgba(167,139,250,0.25)' }
  if (type.includes('timestamp') || type.includes('date')) return { bg:'rgba(251,146,60,0.1)', color:'#fb923c', border:'rgba(251,146,60,0.25)' }
  return { bg:'rgba(161,161,170,0.1)', color:'#a1a1aa', border:'rgba(161,161,170,0.25)' }
}

const operationColor = op => {
  if (op.includes('create') || op.includes('insert')) return { bg:'rgba(52,211,153,0.1)', color:'#34d399', border:'rgba(52,211,153,0.25)' }
  if (op.includes('update')) return { bg:'rgba(251,146,60,0.1)', color:'#fb923c', border:'rgba(251,146,60,0.25)' }
  if (op.includes('delete')) return { bg:'rgba(251,113,133,0.1)', color:'#fb7185', border:'rgba(251,113,133,0.25)' }
  if (op.includes('transaction') || op.includes('$transaction')) return { bg:'rgba(37,99,235,0.1)', color:'#2563eb', border:'rgba(37,99,235,0.25)' }
  return { bg:'rgba(56,189,248,0.1)', color:'#38bdf8', border:'rgba(56,189,248,0.25)' }
}

// ── Tab button ─────────────────────────────────────────────────────────────────
function Tab({ active, onClick, icon: Icon, label, badge }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all rounded-xl"
      style={active
        ? { background:'var(--accent-dim)', color:'var(--accent)', border:'1px solid rgba(37,99,235,0.3)' }
        : { background:'transparent', color:'var(--text-secondary)', border:'1px solid transparent' }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background='rgba(255,255,255,0.04)'; e.currentTarget.style.color='var(--text-primary)' } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text-secondary)' } }}>
      <Icon size={14} />
      {label}
      {badge !== undefined && (
        <span className="ml-0.5 px-1.5 py-0.5 rounded-md text-xs font-bold"
          style={{ background:'rgba(255,255,255,0.08)', color:'var(--text-muted)', fontSize:9 }}>
          {badge}
        </span>
      )}
    </button>
  )
}

// ── Code block ─────────────────────────────────────────────────────────────────
function CodeBlock({ code, lang = 'sql' }) {
  const keywords = lang === 'sql'
    ? ['SELECT','FROM','WHERE','JOIN','LEFT','INNER','ON','INSERT','INTO','UPDATE','SET','DELETE','ORDER','BY','GROUP','HAVING','LIMIT','OFFSET','COUNT','SUM','AVG','MAX','MIN','AS','AND','OR','NOT','IN','LIKE','BETWEEN','IS','NULL','DISTINCT','BEGIN','COMMIT','RETURNING','VALUES']
    : ['prisma','await','async','const','return','where','include','select','data','create','update','delete','findMany','findUnique','count','orderBy','take','skip']

  const highlighted = code.split('\n').map((line, li) => {
    let html = line
    keywords.forEach(kw => {
      html = html.replace(new RegExp(`\\b${kw}\\b`, 'g'), `<span style="color:#38bdf8;font-weight:600">${kw}</span>`)
    })
    // highlight strings
    html = html.replace(/'([^']*)'/g, `<span style="color:#a78bfa">'$1'</span>`)
    // highlight comments
    if (line.trim().startsWith('//') || line.trim().startsWith('--')) {
      html = `<span style="color:#475569;font-style:italic">${html}</span>`
    }
    return `<span key="${li}">${html}</span>`
  }).join('\n')

  return (
    <div className="rounded-xl overflow-hidden" style={{ border:'1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-2 px-3 py-2" style={{ background:'rgba(255,255,255,0.03)', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
        <Code2 size={11} style={{ color:'var(--text-muted)' }} />
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color:'var(--text-muted)', fontSize:9 }}>{lang.toUpperCase()}</span>
      </div>
      <pre className="px-4 py-3 overflow-x-auto text-xs leading-relaxed" style={{ background:'#0d1117', fontFamily:'DM Mono, Courier New, monospace', color:'#e6edf3' }}
        dangerouslySetInnerHTML={{ __html: highlighted }} />
    </div>
  )
}

// ── Data table ─────────────────────────────────────────────────────────────────
function DataTable({ rows, maxRows = 20 }) {
  if (!rows || rows.length === 0) return (
    <p className="text-xs text-center py-6" style={{ color:'var(--text-muted)' }}>No rows returned</p>
  )
  const cols = Object.keys(rows[0])
  const fmt = v => {
    if (v === null || v === undefined) return <span style={{ color:'var(--text-dim)', fontStyle:'italic' }}>NULL</span>
    if (typeof v === 'object') return <span style={{ color:'var(--text-muted)' }}>{JSON.stringify(v).slice(0,60)}</span>
    const s = String(v)
    if (s.length > 50) return <span title={s}>{s.slice(0,50)}…</span>
    return s
  }
  return (
    <div className="overflow-x-auto rounded-xl" style={{ border:'1px solid var(--border)' }}>
      <table className="w-full">
        <thead>
          <tr style={{ background:'var(--bg-surface)' }}>
            {cols.map(c => (
              <th key={c} className="text-left px-3 py-2.5 text-xs font-bold uppercase tracking-widest whitespace-nowrap" style={{ color:'var(--text-muted)', borderBottom:'1px solid var(--border)', letterSpacing:'0.07em' }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, maxRows).map((row, i) => (
            <tr key={i} className="tr">
              {cols.map(c => (
                <td key={c} className="px-3 py-2.5 text-xs font-mono whitespace-nowrap" style={{ color:'var(--text-secondary)', borderBottom: i<Math.min(rows.length,maxRows)-1?'1px solid var(--border)':'none' }}>
                  {fmt(row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > maxRows && (
        <p className="px-4 py-2 text-xs" style={{ color:'var(--text-muted)', borderTop:'1px solid var(--border)', background:'var(--bg-surface)' }}>
          Showing {maxRows} of {rows.length} rows
        </p>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function DatabaseExplorer() {
  const [tab, setTab]               = useState('tables')
  const [tables, setTables]         = useState([])
  const [selectedTable, setSelected] = useState(null)
  const [schema, setSchema]         = useState([])
  const [tableData, setTableData]   = useState(null)
  const [rels, setRels]             = useState([])
  const [dbStats, setDbStats]       = useState(null)
  const [prismaQs, setPrismaQs]     = useState([])
  const [openCategory, setOpenCat]  = useState(null)
  const [sql, setSql]               = useState(`-- Write any SELECT query here\nSELECT p.name, p.sku, p."sellingPrice", c.name AS category\nFROM products p\nLEFT JOIN categories c ON p."categoryId" = c.id\nORDER BY p."sellingPrice" DESC\nLIMIT 10`)
  const [sqlResult, setSqlResult]   = useState(null)
  const [sqlError, setSqlError]     = useState('')
  const [sqlRunning, setSqlRunning] = useState(false)
  const [loading, setLoading]       = useState(true)
  const [schemaLoading, setSchemaLoading] = useState(false)
  const [tableSearch, setTableSearch] = useState('')

  useEffect(() => {
    Promise.all([dbAPI.tables(), dbAPI.relationships(), dbAPI.stats(), dbAPI.prismaQueries()])
      .then(([t, r, s, p]) => {
        setTables(t.data)
        setRels(r.data)
        setDbStats(s.data)
        setPrismaQs(p.data)
        if (t.data.length > 0) {
          const first = t.data.find(x => x.name === 'products') || t.data[0]
          loadTable(first.name)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const loadTable = async (name) => {
    setSelected(name)
    setSchemaLoading(true)
    try {
      const [s, d] = await Promise.all([dbAPI.schema(name), dbAPI.data(name)])
      setSchema(s.data)
      setTableData(d.data)
    } catch (err) { console.error(err) }
    finally { setSchemaLoading(false) }
  }

  const runSQL = async () => {
    if (!sql.trim()) return
    setSqlRunning(true); setSqlError(''); setSqlResult(null)
    try {
      const r = await dbAPI.runSQL(sql)
      setSqlResult(r.data)
    } catch (err) { setSqlError(err.response?.data?.error || 'Query failed.') }
    finally { setSqlRunning(false) }
  }

  const filteredTables = tables.filter(t => t.name.toLowerCase().includes(tableSearch.toLowerCase()))

  if (loading) return <Loader />

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card p-4" style={{ background:'var(--bg-surface)' }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background:'var(--accent-dim)', border:'1px solid rgba(37,99,235,0.2)' }}>
            <Database size={16} style={{ color:'var(--accent)' }} />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color:'var(--text-primary)' }}>Database Explorer — OrderlyX PostgreSQL</p>
            <p className="text-xs" style={{ color:'var(--text-muted)' }}>
              {dbStats?.dbSize?.db_name} &nbsp;·&nbsp; {dbStats?.dbSize?.db_size} &nbsp;·&nbsp;
              {tables.length} tables &nbsp;·&nbsp; {rels.length} foreign key relationships
            </p>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            {[
              { label: dbStats?.dbSize?.db_size || '—', sub: 'DB Size' },
              { label: tables.length, sub: 'Tables' },
              { label: rels.length,   sub: 'Relations' },
              { label: tables.reduce((s,t)=>s+t.rows,0).toLocaleString(), sub: 'Total Rows' },
            ].map(s => (
              <div key={s.sub} className="text-center px-3 py-2 rounded-xl" style={{ background:'var(--bg-card)', border:'1px solid var(--border)', minWidth:60 }}>
                <p className="text-sm font-bold font-mono" style={{ color:'var(--accent)' }}>{s.label}</p>
                <p style={{ fontSize:9, color:'var(--text-muted)', letterSpacing:'0.05em' }}>{s.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 pt-3" style={{ borderTop:'1px solid var(--border)' }}>
          <Tab active={tab==='tables'}   onClick={()=>setTab('tables')}   icon={Table2}    label="Tables & Schema"  badge={tables.length} />
          <Tab active={tab==='sql'}      onClick={()=>setTab('sql')}      icon={Play}      label="SQL Editor" />
          <Tab active={tab==='rels'}     onClick={()=>setTab('rels')}     icon={GitBranch} label="Relationships"    badge={rels.length} />
          <Tab active={tab==='prisma'}   onClick={()=>setTab('prisma')}   icon={Zap}       label="Prisma ORM Queries" />
          <Tab active={tab==='stats'}    onClick={()=>setTab('stats')}    icon={BarChart3} label="DB Statistics" />
        </div>
      </div>

      {/* ── TAB: TABLES & SCHEMA ─────────────────────────────────────────────── */}
      {tab === 'tables' && (
        <div className="grid grid-cols-12 gap-4">
          {/* Left: table list */}
          <div className="col-span-3 card overflow-hidden" style={{ height:'fit-content' }}>
            <div className="px-3 py-3" style={{ borderBottom:'1px solid var(--border)', background:'var(--bg-surface)' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color:'var(--text-muted)' }}>Tables ({tables.length})</p>
              <div className="relative">
                <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color:'var(--text-muted)' }} />
                <input className="input pl-7 text-xs py-1.5" placeholder="Filter tables…" value={tableSearch} onChange={e => setTableSearch(e.target.value)} style={{ fontSize:11 }} />
              </div>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight:'60vh' }}>
              {filteredTables.map(t => (
                <button key={t.name} onClick={() => loadTable(t.name)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors"
                  style={{ background: selectedTable===t.name ? 'var(--accent-dim)' : 'transparent', borderBottom:'1px solid var(--border)' }}
                  onMouseEnter={e => { if (selectedTable!==t.name) e.currentTarget.style.background='rgba(255,255,255,0.03)' }}
                  onMouseLeave={e => { if (selectedTable!==t.name) e.currentTarget.style.background='transparent' }}>
                  <Table2 size={12} style={{ color: selectedTable===t.name ? 'var(--accent)' : 'var(--text-muted)', flexShrink:0 }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono font-semibold truncate" style={{ color: selectedTable===t.name ? 'var(--accent)' : 'var(--text-primary)', fontSize:11 }}>
                      {t.name}
                    </p>
                    <p style={{ fontSize:9, color:'var(--text-muted)' }}>{t.rows.toLocaleString()} rows · {t.columns} cols</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right: schema + data */}
          <div className="col-span-9 space-y-4">
            {schemaLoading ? <Loader /> : selectedTable && (
              <>
                {/* Schema */}
                <div className="card overflow-hidden">
                  <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom:'1px solid var(--border)', background:'var(--bg-surface)' }}>
                    <Key size={13} style={{ color:'var(--accent)' }} />
                    <p className="font-semibold text-sm" style={{ color:'var(--text-primary)' }}>
                      Schema — <span className="font-mono" style={{ color:'var(--accent)' }}>{selectedTable}</span>
                    </p>
                    <span className="ml-auto chip text-xs">{schema.length} columns</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr style={{ background:'var(--bg-surface)' }}>
                          {['Column Name','Data Type','Nullable','Default','PK','FK → Table','Unique'].map(h => (
                            <th key={h} className="text-left px-3 py-2.5 text-xs font-bold uppercase tracking-widest whitespace-nowrap"
                              style={{ color:'var(--text-muted)', borderBottom:'1px solid var(--border)', fontSize:9, letterSpacing:'0.07em' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {schema.map((col, i) => {
                          const tc = typeColor(col.data_type)
                          return (
                            <tr key={i} className="tr">
                              <td className="px-3 py-2.5">
                                <span className="font-mono font-semibold text-xs" style={{ color:'var(--text-primary)' }}>{col.column_name}</span>
                              </td>
                              <td className="px-3 py-2.5">
                                <span className="badge text-xs" style={{ background:tc.bg, color:tc.color, border:`1px solid ${tc.border}`, fontSize:10 }}>
                                  {col.data_type}{col.character_maximum_length ? `(${col.character_maximum_length})` : ''}
                                </span>
                              </td>
                              <td className="px-3 py-2.5">
                                <span className={`badge ${col.is_nullable==='YES'?'badge-neutral':'badge-emerald'}`} style={{ fontSize:9 }}>
                                  {col.is_nullable==='YES' ? 'NULL' : 'NOT NULL'}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-xs font-mono" style={{ color:'var(--text-muted)', maxWidth:120 }}>
                                <span className="truncate block">{col.column_default ? col.column_default.slice(0,30) : '—'}</span>
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                {col.is_primary_key==='YES' && <Key size={13} style={{ color:'var(--accent)' }} />}
                              </td>
                              <td className="px-3 py-2.5">
                                {col.references_table && (
                                  <span className="flex items-center gap-1 text-xs" style={{ color:'var(--sky)' }}>
                                    <Link2 size={10} />{col.references_table}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                {col.is_unique==='YES' && <CheckCircle2 size={12} style={{ color:'var(--emerald)' }} />}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Table data */}
                {tableData && (
                  <div className="card overflow-hidden">
                    <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom:'1px solid var(--border)', background:'var(--bg-surface)' }}>
                      <Eye size={13} style={{ color:'var(--emerald)' }} />
                      <p className="font-semibold text-sm" style={{ color:'var(--text-primary)' }}>
                        Data — <span className="font-mono" style={{ color:'var(--accent)' }}>{selectedTable}</span>
                      </p>
                      <span className="ml-auto chip text-xs">{tableData.total?.toLocaleString()} total rows</span>
                    </div>
                    <div className="p-4">
                      <CodeBlock code={`SELECT * FROM "${selectedTable}" LIMIT 50`} lang="sql" />
                      <div className="mt-3">
                        <DataTable rows={tableData.rows} maxRows={15} />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: SQL EDITOR ──────────────────────────────────────────────────── */}
      {tab === 'sql' && (
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom:'1px solid var(--border)', background:'var(--bg-surface)' }}>
              <Play size={13} style={{ color:'var(--accent)' }} />
              <p className="font-semibold text-sm" style={{ color:'var(--text-primary)' }}>SQL Editor</p>
              <span className="ml-2 text-xs px-2 py-0.5 rounded-lg" style={{ background:'rgba(52,211,153,0.1)', color:'var(--emerald)', border:'1px solid rgba(52,211,153,0.2)' }}>
                SELECT only — read safe
              </span>
              <button onClick={runSQL} disabled={sqlRunning} className="btn btn-primary btn-sm ml-auto">
                {sqlRunning
                  ? <div className="w-3 h-3 border border-t-transparent animate-spin rounded-full" />
                  : <Play size={12} />}
                {sqlRunning ? 'Running…' : 'Run Query'}
              </button>
            </div>
            <div className="p-4">
              <textarea
                className="w-full font-mono text-xs rounded-xl p-4 outline-none resize-none"
                rows={10}
                value={sql}
                onChange={e => setSql(e.target.value)}
                spellCheck={false}
                style={{ background:'#0d1117', color:'#e6edf3', border:'1px solid rgba(255,255,255,0.07)', lineHeight:1.7, fontFamily:'DM Mono, Courier New, monospace' }}
                onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); runSQL() } }}
                placeholder="-- Write your SQL here. Press Ctrl+Enter to run." />
              <p className="text-xs mt-2" style={{ color:'var(--text-muted)' }}>Tip: Press <kbd className="px-1.5 py-0.5 rounded" style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', fontFamily:'monospace' }}>Ctrl+Enter</kbd> to run</p>
            </div>
          </div>

          {sqlError && (
            <div className="card p-4 flex items-start gap-3" style={{ border:'1px solid var(--rose-border)', background:'var(--rose-dim)' }}>
              <AlertCircle size={16} style={{ color:'var(--rose)', flexShrink:0, marginTop:2 }} />
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color:'var(--rose)' }}>Query Error</p>
                <pre className="text-xs" style={{ color:'var(--rose)', fontFamily:'monospace', whiteSpace:'pre-wrap' }}>{sqlError}</pre>
              </div>
            </div>
          )}

          {sqlResult && (
            <div className="card overflow-hidden">
              <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom:'1px solid var(--border)', background:'var(--bg-surface)' }}>
                <CheckCircle2 size={13} style={{ color:'var(--emerald)' }} />
                <p className="font-semibold text-sm" style={{ color:'var(--text-primary)' }}>Results</p>
                <span className="badge badge-emerald">{sqlResult.rowCount} row{sqlResult.rowCount !== 1 ? 's' : ''}</span>
                <div className="flex items-center gap-1 ml-auto text-xs" style={{ color:'var(--text-muted)' }}>
                  <Clock size={11} />{sqlResult.execTime}
                </div>
              </div>
              <div className="p-4"><DataTable rows={sqlResult.rows} maxRows={50} /></div>
            </div>
          )}

          {/* Quick query templates */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3" style={{ borderBottom:'1px solid var(--border)', background:'var(--bg-surface)' }}>
              <p className="font-semibold text-sm" style={{ color:'var(--text-primary)' }}>Quick Query Templates</p>
              <p className="text-xs mt-0.5" style={{ color:'var(--text-muted)' }}>Click any query to load it in the editor</p>
            </div>
            <div className="p-4 grid grid-cols-1 xl:grid-cols-2 gap-3">
              {[
                { label:'Products with categories (JOIN)', sql:`SELECT p.name, p.sku, p."sellingPrice", p.quantity, c.name AS category\nFROM products p\nLEFT JOIN categories c ON p."categoryId" = c.id\nORDER BY c.name, p.name` },
                { label:'Orders with user and supplier', sql:`SELECT o."orderNumber", o.type, o.status, o."totalAmount",\n       u.name AS created_by, s.name AS supplier\nFROM orders o\nJOIN users u ON o."userId" = u.id\nLEFT JOIN suppliers s ON o."supplierId" = s.id\nORDER BY o."createdAt" DESC` },
                { label:'Inventory value per category (GROUP BY)', sql:`SELECT c.name AS category,\n       COUNT(p.id) AS total_products,\n       SUM(p.quantity) AS total_stock,\n       ROUND(AVG(p."sellingPrice")::numeric, 2) AS avg_price,\n       ROUND(SUM(p.quantity * p."sellingPrice"::numeric), 2) AS retail_value\nFROM categories c\nLEFT JOIN products p ON p."categoryId" = c.id\nGROUP BY c.name\nORDER BY retail_value DESC` },
                { label:'Low stock products (WHERE filter)', sql:`SELECT name, sku, quantity, "reorderLevel",\n       (quantity - "reorderLevel") AS stock_gap,\n       CASE WHEN quantity = 0 THEN 'OUT OF STOCK'\n            ELSE 'LOW STOCK' END AS alert_type\nFROM products\nWHERE quantity <= "reorderLevel"\nORDER BY quantity ASC` },
                { label:'All foreign key relationships', sql:`SELECT tc.table_name AS "from_table",\n       kcu.column_name AS "from_column",\n       ccu.table_name AS "to_table",\n       ccu.column_name AS "to_column"\nFROM information_schema.table_constraints tc\nJOIN information_schema.key_column_usage kcu\n  ON tc.constraint_name = kcu.constraint_name\nJOIN information_schema.referential_constraints rc\n  ON tc.constraint_name = rc.constraint_name\nJOIN information_schema.constraint_column_usage ccu\n  ON rc.unique_constraint_name = ccu.constraint_name\nWHERE tc.constraint_type = 'FOREIGN KEY'\n  AND tc.table_schema = 'public'\nORDER BY tc.table_name` },
                { label:'Audit log with user details', sql:`SELECT al.action, al."tableName", al."recordId",\n       u.name AS performed_by, u.role,\n       al."newValues", al."createdAt"\nFROM audit_logs al\nLEFT JOIN users u ON al."userId" = u.id\nORDER BY al."createdAt" DESC\nLIMIT 20` },
                { label:'Monthly sales summary', sql:`SELECT\n  TO_CHAR("createdAt", 'Mon YYYY') AS month,\n  type,\n  COUNT(*) AS order_count,\n  ROUND(SUM("totalAmount"::numeric), 2) AS total_value\nFROM orders\nWHERE status != 'CANCELLED'\nGROUP BY TO_CHAR("createdAt", 'Mon YYYY'), type\nORDER BY MIN("createdAt") DESC, type` },
                { label:'Product price history', sql:`SELECT p.name, p.sku,\n       ph."oldPrice", ph."newPrice",\n       (ph."newPrice"::numeric - ph."oldPrice"::numeric) AS price_change,\n       ph."changedBy", ph."changedAt", ph.reason\nFROM price_history ph\nJOIN products p ON ph."productId" = p.id\nORDER BY ph."changedAt" DESC` },
              ].map(q => (
                <button key={q.label} onClick={() => setSql(q.sql)}
                  className="text-left p-3 rounded-xl transition-all"
                  style={{ background:'var(--bg-surface)', border:'1px solid var(--border)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(37,99,235,0.4)'; e.currentTarget.style.background='var(--bg-card)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='var(--bg-surface)' }}>
                  <p className="text-xs font-semibold mb-1.5" style={{ color:'var(--text-primary)' }}>{q.label}</p>
                  <pre className="text-xs truncate" style={{ color:'var(--text-muted)', fontFamily:'monospace' }}>{q.sql.split('\n')[0]}…</pre>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: RELATIONSHIPS ───────────────────────────────────────────────── */}
      {tab === 'rels' && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3" style={{ borderBottom:'1px solid var(--border)', background:'var(--bg-surface)' }}>
            <p className="font-semibold text-sm" style={{ color:'var(--text-primary)' }}>Foreign Key Relationships ({rels.length})</p>
            <p className="text-xs mt-0.5" style={{ color:'var(--text-muted)' }}>All referential integrity constraints in the OrderlyX database</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background:'var(--bg-surface)' }}>
                  {['From Table','From Column','→','To Table','To Column','Constraint Name'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-widest"
                      style={{ color:'var(--text-muted)', borderBottom:'1px solid var(--border)', fontSize:9, letterSpacing:'0.07em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rels.map((r, i) => (
                  <tr key={i} className="tr">
                    <td className="px-4 py-3"><span className="font-mono text-xs font-bold" style={{ color:'var(--accent)' }}>{r.from_table}</span></td>
                    <td className="px-4 py-3"><span className="font-mono text-xs" style={{ color:'var(--text-secondary)' }}>{r.from_column}</span></td>
                    <td className="px-4 py-3"><Link2 size={13} style={{ color:'var(--sky)' }} /></td>
                    <td className="px-4 py-3"><span className="font-mono text-xs font-bold" style={{ color:'var(--emerald)' }}>{r.to_table}</span></td>
                    <td className="px-4 py-3"><span className="font-mono text-xs" style={{ color:'var(--text-secondary)' }}>{r.to_column}</span></td>
                    <td className="px-4 py-3"><span className="chip font-mono" style={{ fontSize:9 }}>{r.constraint_name?.slice(0,40)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: PRISMA QUERIES ──────────────────────────────────────────────── */}
      {tab === 'prisma' && (
        <div className="space-y-4">
          <div className="card p-4" style={{ background:'var(--bg-surface)', border:'1px solid var(--border)' }}>
            <div className="flex items-start gap-3">
              <Zap size={16} style={{ color:'var(--accent)', flexShrink:0, marginTop:2 }} />
              <div>
                <p className="font-semibold text-sm mb-1" style={{ color:'var(--text-primary)' }}>How OrderlyX Uses Prisma ORM</p>
                <p className="text-xs leading-relaxed" style={{ color:'var(--text-secondary)' }}>
                  Prisma is an ORM (Object Relational Mapper) that sits between the Node.js backend and PostgreSQL.
                  Instead of writing raw SQL, we write type-safe JavaScript that Prisma converts to optimized SQL.
                  Every Prisma call shown below corresponds to real SQL executed against the database.
                  The actual SQL equivalent is shown alongside each Prisma query.
                </p>
              </div>
            </div>
          </div>

          {prismaQs.map((cat, ci) => (
            <div key={ci} className="card overflow-hidden">
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
                style={{ background:'var(--bg-surface)', borderBottom: openCategory===ci ? '1px solid var(--border)' : 'none' }}
                onClick={() => setOpenCat(openCategory===ci ? null : ci)}>
                <Layers size={14} style={{ color:'var(--accent)' }} />
                <p className="font-semibold text-sm" style={{ color:'var(--text-primary)' }}>{cat.category}</p>
                <span className="chip text-xs ml-2">{cat.queries.length} queries</span>
                {openCategory===ci
                  ? <ChevronDown size={14} className="ml-auto" style={{ color:'var(--text-muted)' }} />
                  : <ChevronRight size={14} className="ml-auto" style={{ color:'var(--text-muted)' }} />}
              </button>

              {openCategory===ci && (
                <div className="divide-y" style={{ borderColor:'var(--border)' }}>
                  {cat.queries.map((q, qi) => {
                    const oc = operationColor(q.operation.toLowerCase())
                    return (
                      <div key={qi} className="p-5">
                        <div className="flex items-start gap-3 mb-4">
                          <span className="badge text-xs flex-shrink-0 mt-0.5"
                            style={{ background:oc.bg, color:oc.color, border:`1px solid ${oc.border}`, fontSize:9 }}>
                            {q.operation}
                          </span>
                          <p className="text-sm font-semibold" style={{ color:'var(--text-primary)' }}>{q.description}</p>
                        </div>
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-bold mb-2 uppercase tracking-widest" style={{ color:'var(--accent)', letterSpacing:'0.08em' }}>Prisma ORM Code</p>
                            <CodeBlock code={q.code} lang="js" />
                          </div>
                          <div>
                            <p className="text-xs font-bold mb-2 uppercase tracking-widest" style={{ color:'var(--sky)', letterSpacing:'0.08em' }}>Equivalent SQL Query</p>
                            <CodeBlock code={q.sql} lang="sql" />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: DB STATISTICS ───────────────────────────────────────────────── */}
      {tab === 'stats' && dbStats && (
        <div className="space-y-4">
          {/* DB info */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label:'Database Name',   value: dbStats.dbSize?.db_name,   color:'var(--accent)' },
              { label:'Database Size',   value: dbStats.dbSize?.db_size,   color:'var(--emerald)' },
              { label:'PostgreSQL Version', value: dbStats.dbSize?.pg_version?.split(' ').slice(0,2).join(' '), color:'var(--sky)' },
            ].map(s => (
              <div key={s.label} className="card p-5">
                <p className="label mb-2">{s.label}</p>
                <p className="font-mono font-bold text-sm" style={{ color: s.color }}>{s.value || '—'}</p>
              </div>
            ))}
          </div>

          {/* Table stats */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3" style={{ borderBottom:'1px solid var(--border)', background:'var(--bg-surface)' }}>
              <p className="font-semibold text-sm" style={{ color:'var(--text-primary)' }}>Table Statistics</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background:'var(--bg-surface)' }}>
                    {['Table','Live Rows','Dead Rows','Total Size','Last Analyzed'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-widest"
                        style={{ color:'var(--text-muted)', borderBottom:'1px solid var(--border)', fontSize:9, letterSpacing:'0.07em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dbStats.tableStats?.map((t, i) => (
                    <tr key={i} className="tr">
                      <td className="px-4 py-3"><span className="font-mono text-xs font-bold" style={{ color:'var(--text-primary)' }}>{t.table_name}</span></td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color:'var(--emerald)' }}>{Number(t.row_count).toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: Number(t.dead_rows)>0?'var(--amber)':'var(--text-muted)' }}>{Number(t.dead_rows).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs" style={{ color:'var(--text-secondary)' }}>{t.total_size}</td>
                      <td className="px-4 py-3 text-xs" style={{ color:'var(--text-muted)' }}>
                        {t.last_analyze ? new Date(t.last_analyze).toLocaleDateString('en',{day:'2-digit',month:'short'}) : 'Never'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Index info */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3" style={{ borderBottom:'1px solid var(--border)', background:'var(--bg-surface)' }}>
              <p className="font-semibold text-sm" style={{ color:'var(--text-primary)' }}>Indexes ({dbStats.indexStats?.length})</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background:'var(--bg-surface)' }}>
                    {['Table','Index Name','Definition'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-widest"
                        style={{ color:'var(--text-muted)', borderBottom:'1px solid var(--border)', fontSize:9, letterSpacing:'0.07em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dbStats.indexStats?.map((idx, i) => (
                    <tr key={i} className="tr">
                      <td className="px-4 py-3"><span className="font-mono text-xs font-bold" style={{ color:'var(--accent)' }}>{idx.tablename}</span></td>
                      <td className="px-4 py-3"><span className="font-mono text-xs" style={{ color:'var(--text-secondary)' }}>{idx.indexname}</span></td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color:'var(--text-muted)' }}>{idx.indexdef?.slice(0,80)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
