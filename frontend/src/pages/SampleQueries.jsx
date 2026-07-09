import { useState } from 'react'
import { queriesAPI } from '../api'
import { Loader } from '../components/ui'
import { Play, ChevronDown, ChevronRight, Database, Code2, Table, Clock, Info } from 'lucide-react'

const LABS = [
  {
    id: 'lab1', label: 'LAB 1', title: 'Arithmetic, Aliases & Concatenation',
    color: '#2563eb', desc: 'Arithmetic expressions, column aliases, string concatenation, NULL in arithmetic',
    questions: [
      { id: 'q1', label: 'Q1', title: 'Annual revenue (price × 12) with alias ANNUAL_PAY' },
      { id: 'q2', label: 'Q2', title: 'All columns from categories without using *' },
      { id: 'q3', label: 'Q3', title: 'Distinct unit types from products' },
      { id: 'q4', label: 'Q4', title: 'Product name and price + 500' },
      { id: 'q5', label: 'Q5', title: 'Yearly income = 12 × price + 200' },
      { id: 'q6', label: 'Q6', title: 'Concatenate name and SKU as PRODUCT_INFO' },
      { id: 'q7', label: 'Q7', title: 'Commission-based earnings — NULL behavior explained' },
    ]
  },
  {
    id: 'lab2', label: 'LAB 2', title: 'WHERE Clause & Filtering',
    color: '#34d399', desc: 'Comparison operators, BETWEEN, LIKE patterns, IS NULL, NOT BETWEEN, compound conditions',
    questions: [
      { id: 'q1', label: 'Q1', title: 'Products with price > 800' },
      { id: 'q2', label: 'Q2', title: 'Products added between Jan–Dec 2024' },
      { id: 'q3', label: 'Q3', title: "Products whose name starts with 'M'" },
      { id: 'q4', label: 'Q4', title: "Products whose SKU ends with 'NET'" },
      { id: 'q5', label: 'Q5', title: 'Products with no supplier (IS NULL)' },
      { id: 'q6', label: 'Q6', title: 'Products NOT between 500 and 1000' },
      { id: 'q7', label: 'Q7', title: 'Electronics/Networking AND price > 100' },
    ]
  },
  {
    id: 'lab3', label: 'LAB 3', title: 'Subqueries',
    color: '#fb923c', desc: 'Single-row subqueries, IN subqueries, ANY/ALL subqueries, correlated subqueries',
    questions: [
      { id: 'q1', label: 'Q1', title: 'Products more expensive than most expensive Networking product' },
      { id: 'q2', label: 'Q2', title: 'Products with the minimum selling price' },
      { id: 'q3', label: 'Q3', title: 'Products in same category as first-created product' },
      { id: 'q4', label: 'Q4', title: 'Products whose category matches first purchase order' },
      { id: 'q5', label: 'Q5', title: 'Products cheaper than AT LEAST ONE supplier credit limit (ANY)' },
      { id: 'q6', label: 'Q6', title: 'Products cheaper than ALL supplier credit limits (ALL)' },
    ]
  },
  {
    id: 'lab4', label: 'LAB 4', title: 'String Functions',
    color: '#a78bfa', desc: 'LOWER(), LENGTH(), concatenation, SUBSTRING/SUBSTR, COALESCE/NVL for NULL handling',
    questions: [
      { id: 'q1', label: 'Q1', title: 'Product ID and name in LOWERCASE' },
      { id: 'q2', label: 'Q2', title: 'Full product info — name concatenated with SKU' },
      { id: 'q3', label: 'Q3', title: 'Product name and its character LENGTH' },
      { id: 'q4', label: 'Q4', title: 'Products whose SKU ends with NET using SUBSTRING' },
      { id: 'q5', label: 'Q5', title: 'Annual compensation using COALESCE for NULL (= NVL)' },
    ]
  },
  {
    id: 'lab5', label: 'LAB 5', title: 'Joins',
    color: '#38bdf8', desc: 'INNER JOIN, 3-table JOIN, NON-EQUIJOIN, SELF JOIN equivalent, LEFT OUTER JOIN, JOIN + WHERE',
    questions: [
      { id: 'q1', label: 'Q1', title: 'Product + category using INNER JOIN' },
      { id: 'q2', label: 'Q2', title: 'Product + category + warehouse city (3 tables)' },
      { id: 'q3', label: 'Q3', title: 'Product + price grade using NON-EQUIJOIN (CASE WHEN)' },
      { id: 'q4', label: 'Q4', title: 'Product + supplier (SELF JOIN equivalent)' },
      { id: 'q5', label: 'Q5', title: 'All products + categories using LEFT OUTER JOIN' },
      { id: 'q6', label: 'Q6', title: 'Products + category WHERE price > 800' },
    ]
  },
  {
    id: 'lab6', label: 'LAB 6', title: 'Group Functions & Aggregation',
    color: '#fb7185', desc: 'AVG(), SUM(), MAX(), MIN(), COUNT(*), COUNT(col), GROUP BY, HAVING',
    questions: [
      { id: 'q1', label: 'Q1', title: 'Average and total selling price (AVG + SUM)' },
      { id: 'q2', label: 'Q2', title: 'Highest and lowest price (MAX + MIN)' },
      { id: 'q3', label: 'Q3', title: 'Total number of products (COUNT *)' },
      { id: 'q4', label: 'Q4', title: 'Products with taxRate set — COUNT ignores NULL' },
      { id: 'q5', label: 'Q5', title: 'Average price per category (GROUP BY)' },
      { id: 'q6', label: 'Q6', title: 'Category max price > 1000 (GROUP BY + HAVING)' },
    ]
  },
]

export default function SampleQueries() {
  const [openLab, setOpenLab]     = useState('lab1')
  const [running, setRunning]     = useState(null)
  const [results, setResults]     = useState({})
  const [errors, setErrors]       = useState({})

  const runQuery = async (labId, qId) => {
    const key = `${labId}_${qId}`
    setRunning(key)
    setErrors(prev => ({ ...prev, [key]: null }))
    try {
      const res = await queriesAPI.run(labId, qId)
      setResults(prev => ({ ...prev, [key]: res.data }))
    } catch (err) {
      setErrors(prev => ({ ...prev, [key]: err.response?.data?.error || 'Query failed.' }))
    } finally {
      setRunning(null)
    }
  }

  const formatValue = (v) => {
    if (v === null || v === undefined) return <span style={{ color:'var(--text-dim)', fontStyle:'italic' }}>NULL</span>
    if (typeof v === 'object') return JSON.stringify(v)
    return String(v)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card p-5" style={{ background:'var(--bg-surface)', border:'1px solid var(--border)' }}>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:'var(--accent-dim)', border:'1px solid rgba(37,99,235,0.2)' }}>
            <Database size={18} style={{ color:'var(--accent)' }} />
          </div>
          <div>
            <h2 className="font-semibold text-base mb-1" style={{ color:'var(--text-primary)' }}>DBMS Sample Queries — All 6 Labs</h2>
            <p className="text-xs leading-relaxed" style={{ color:'var(--text-muted)' }}>
              All queries run live against the PostgreSQL database. Oracle HR schema concepts are mapped to OrderlyX tables:
              <strong style={{ color:'var(--text-secondary)' }}> employees → products</strong>,
              <strong style={{ color:'var(--text-secondary)' }}> departments → categories</strong>,
              <strong style={{ color:'var(--text-secondary)' }}> locations → warehouses</strong>,
              <strong style={{ color:'var(--text-secondary)' }}> job_grades → discount_rules</strong>.
              Click ▶ Run Query to execute any query live.
            </p>
          </div>
        </div>
      </div>

      {/* Lab accordion */}
      {LABS.map(lab => (
        <div key={lab.id} className="card overflow-hidden">
          {/* Lab header */}
          <button
            className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors"
            style={{ background: openLab === lab.id ? `${lab.color}10` : 'var(--bg-card)', borderBottom: openLab === lab.id ? `1px solid ${lab.color}30` : 'none' }}
            onClick={() => setOpenLab(openLab === lab.id ? null : lab.id)}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-xs"
              style={{ background:`${lab.color}20`, color:lab.color, border:`1px solid ${lab.color}30` }}>
              {lab.label}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm" style={{ color:'var(--text-primary)' }}>{lab.title}</p>
              <p className="text-xs mt-0.5" style={{ color:'var(--text-muted)' }}>{lab.desc}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="chip text-xs">{lab.questions.length} queries</span>
              {openLab === lab.id ? <ChevronDown size={16} style={{ color:'var(--text-muted)' }} /> : <ChevronRight size={16} style={{ color:'var(--text-muted)' }} />}
            </div>
          </button>

          {/* Questions */}
          {openLab === lab.id && (
            <div className="divide-y" style={{ borderColor:'var(--border)' }}>
              {lab.questions.map(q => {
                const key = `${lab.id}_${q.id}`
                const result = results[key]
                const error  = errors[key]
                const isRunning = running === key

                return (
                  <div key={q.id} className="p-5">
                    {/* Question header */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                        style={{ background:`${lab.color}20`, color:lab.color, border:`1px solid ${lab.color}30` }}>
                        {q.label}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm" style={{ color:'var(--text-primary)' }}>{q.title}</p>
                        {result && (
                          <p className="text-xs mt-0.5" style={{ color:'var(--text-muted)' }}>
                            Concept: {result.concept}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => runQuery(lab.id, q.id)}
                        disabled={isRunning}
                        className="btn btn-primary btn-sm flex-shrink-0"
                        style={{ background: lab.color, color: '#000' }}
                      >
                        {isRunning ? (
                          <div className="w-3 h-3 rounded-full border border-t-transparent animate-spin" style={{ borderColor:'rgba(0,0,0,0.3)', borderTopColor:'transparent' }} />
                        ) : (
                          <Play size={12} />
                        )}
                        {isRunning ? 'Running…' : 'Run Query'}
                      </button>
                    </div>

                    {/* SQL display — shows after run */}
                    {result && (
                      <>
                        {/* Concept info box */}
                        <div className="flex items-start gap-2 mb-3 px-3 py-2.5 rounded-xl" style={{ background:'rgba(56,189,248,0.06)', border:'1px solid rgba(56,189,248,0.15)' }}>
                          <Info size={13} className="flex-shrink-0 mt-0.5" style={{ color:'var(--sky)' }} />
                          <div>
                            <p className="text-xs font-semibold mb-0.5" style={{ color:'var(--sky)' }}>Oracle → PostgreSQL Mapping</p>
                            <p className="text-xs" style={{ color:'var(--text-secondary)' }}>{result.concept}</p>
                          </div>
                        </div>

                        {/* SQL code block */}
                        <div className="mb-3 rounded-xl overflow-hidden" style={{ border:'1px solid var(--border)' }}>
                          <div className="flex items-center gap-2 px-3 py-2" style={{ background:'var(--bg-surface)', borderBottom:'1px solid var(--border)' }}>
                            <Code2 size={12} style={{ color:'var(--text-muted)' }} />
                            <span className="text-xs font-bold uppercase tracking-widest" style={{ color:'var(--text-muted)' }}>SQL</span>
                            <div className="flex items-center gap-1 ml-auto">
                              <Clock size={10} style={{ color:'var(--text-dim)' }} />
                              <span className="text-xs" style={{ color:'var(--text-dim)' }}>{result.execTime}</span>
                            </div>
                          </div>
                          <pre className="px-4 py-3 text-xs overflow-x-auto" style={{ background:'#0d1117', color:'#e6edf3', fontFamily:'DM Mono, monospace', lineHeight:1.7 }}>
                            {result.sql.replace(/\s+/g, ' ').trim()
                              .replace(/SELECT /gi, '\nSELECT ')
                              .replace(/FROM /gi, '\nFROM ')
                              .replace(/WHERE /gi, '\nWHERE ')
                              .replace(/INNER JOIN /gi, '\nINNER JOIN ')
                              .replace(/LEFT OUTER JOIN /gi, '\nLEFT OUTER JOIN ')
                              .replace(/JOIN /gi, '\nJOIN ')
                              .replace(/GROUP BY /gi, '\nGROUP BY ')
                              .replace(/ORDER BY /gi, '\nORDER BY ')
                              .replace(/HAVING /gi, '\nHAVING ')
                              .trim()}
                          </pre>
                        </div>

                        {/* Results table */}
                        {result.rows?.length > 0 ? (
                          <div className="rounded-xl overflow-hidden" style={{ border:'1px solid var(--border)' }}>
                            <div className="flex items-center gap-2 px-3 py-2" style={{ background:'var(--bg-surface)', borderBottom:'1px solid var(--border)' }}>
                              <Table size={12} style={{ color:'var(--text-muted)' }} />
                              <span className="text-xs font-bold uppercase tracking-widest" style={{ color:'var(--text-muted)' }}>Results</span>
                              <span className="badge badge-emerald ml-auto" style={{ fontSize:10 }}>{result.rowCount} row{result.rowCount !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead>
                                  <tr style={{ background:'var(--bg-surface)' }}>
                                    {Object.keys(result.rows[0]).map(col => (
                                      <th key={col} className="th text-xs">{col}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {result.rows.slice(0, 15).map((row, i) => (
                                    <tr key={i} className="tr">
                                      {Object.values(row).map((val, j) => (
                                        <td key={j} className="td text-xs font-mono" style={{ color:'var(--text-secondary)' }}>
                                          {formatValue(val)}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {result.rowCount > 15 && (
                                <p className="px-4 py-2 text-xs" style={{ color:'var(--text-muted)', borderTop:'1px solid var(--border)' }}>
                                  Showing 15 of {result.rowCount} rows
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="px-4 py-6 text-center rounded-xl" style={{ border:'1px solid var(--border)', background:'var(--bg-surface)' }}>
                            <p className="text-xs" style={{ color:'var(--text-muted)' }}>Query executed successfully — 0 rows returned</p>
                            <p className="text-xs mt-1" style={{ color:'var(--text-dim)' }}>Add more data via the seed file to see results</p>
                          </div>
                        )}
                      </>
                    )}

                    {/* Error display */}
                    {error && (
                      <div className="px-4 py-3 rounded-xl text-xs" style={{ background:'var(--rose-dim)', border:'1px solid var(--rose-border)', color:'var(--rose)' }}>
                        <p className="font-semibold mb-1">Query Error</p>
                        <code>{error}</code>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
