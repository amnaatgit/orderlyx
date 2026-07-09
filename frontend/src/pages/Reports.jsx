import { useState, useEffect } from 'react'
import { dashAPI, productsAPI } from '../api'
import { Loader } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { TrendingUp, AlertTriangle, DollarSign, Package, Lock } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts'

const COLORS = ['#2563eb','#34d399','#fb923c','#fb7185','#a78bfa','#38bdf8']

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="px-3 py-2 rounded-xl text-xs" style={{ background:'var(--bg-card)', border:'1px solid var(--border-hover)', boxShadow:'var(--shadow-md)' }}>
      <p className="font-semibold mb-1" style={{ color:'var(--text-primary)' }}>{label}</p>
      {payload.map(p => <div key={p.name} className="flex justify-between gap-3"><span style={{ color:p.color }}>{p.name}</span><span className="font-mono font-bold" style={{ color:'var(--text-primary)' }}>{p.value > 99 ? `$${Number(p.value).toLocaleString()}` : p.value}</span></div>)}
    </div>
  )
}

export default function Reports() {
  const { isAdmin, isManager, isViewer } = useAuth()
  const canSeeFinancials = isAdmin || isManager

  const [data, setData]       = useState(null)
  const [chart, setChart]     = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([dashAPI.stats(), dashAPI.chartData(), productsAPI.getAll({ limit:100 })])
      .then(([s,c,p]) => { setData(s.data); setChart(c.data); setProducts(p.data.products) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Loader />

  const { stats:s, categoryStats=[] } = data || {}
  const { monthlyOrders=[] } = chart || {}
  const lowStock = products.filter(p => p.quantity <= p.reorderLevel && p.quantity >= 0)

  const table = products.filter(p => p.quantity > 0).map(p => ({
    name:p.name, sku:p.sku, qty:p.quantity,
    cost:Number(p.costPrice), price:Number(p.sellingPrice),
    costVal:Number(p.costPrice) * p.quantity,
    retailVal:Number(p.sellingPrice) * p.quantity,
    margin:(((Number(p.sellingPrice) - Number(p.costPrice)) / Number(p.sellingPrice)) * 100).toFixed(1)
  })).sort((a,b) => b.retailVal - a.retailVal).slice(0,10)

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="card p-5 card-interactive">
          <Package size={16} className="mb-3" style={{ color:'var(--accent)' }} />
          <p className="stat-value mb-0.5" style={{ color:'var(--accent)' }}>{products.length}</p>
          <p className="text-xs" style={{ color:'var(--text-muted)' }}>Total SKUs</p>
        </div>

        {/* Financial KPIs — locked for viewer */}
        {canSeeFinancials ? (
          <>
            <div className="card p-5 card-interactive">
              <DollarSign size={16} className="mb-3" style={{ color:'var(--sky)' }} />
              <p className="stat-value mb-0.5" style={{ color:'var(--sky)' }}>${Number(s?.inventoryValue??0).toLocaleString()}</p>
              <p className="text-xs" style={{ color:'var(--text-muted)' }}>Inventory Cost</p>
            </div>
            <div className="card p-5 card-interactive">
              <TrendingUp size={16} className="mb-3" style={{ color:'var(--emerald)' }} />
              <p className="stat-value mb-0.5" style={{ color:'var(--emerald)' }}>${Number(s?.retailValue??0).toLocaleString()}</p>
              <p className="text-xs" style={{ color:'var(--text-muted)' }}>Retail Value</p>
            </div>
          </>
        ) : (
          <>
            {[1,2].map(i => (
              <div key={i} className="card p-5 flex flex-col items-center justify-center gap-2" style={{ opacity:0.5 }}>
                <Lock size={16} style={{ color:'var(--text-dim)' }} />
                <p className="text-xs text-center" style={{ color:'var(--text-muted)' }}>Financial data — Manager+ only</p>
              </div>
            ))}
          </>
        )}

        <div className="card p-5 card-interactive">
          <AlertTriangle size={16} className="mb-3" style={{ color:'var(--rose)' }} />
          <p className="stat-value mb-0.5" style={{ color:'var(--rose)' }}>{lowStock.length}</p>
          <p className="text-xs" style={{ color:'var(--text-muted)' }}>Reorder Alerts</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="section-title mb-4">Inventory by Category</p>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={categoryStats}>
              <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => canSeeFinancials ? `$${(v/1000).toFixed(0)}k` : v} width={40} />
              <Tooltip content={<Tip />} />
              <Bar dataKey={canSeeFinancials ? 'value' : 'count'} name={canSeeFinancials ? 'Value ($)' : 'Products'} radius={[6,6,0,0]}>
                {categoryStats.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {canSeeFinancials ? (
          <div className="card p-5">
            <p className="section-title mb-4">Monthly — Purchases vs Sales</p>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={monthlyOrders} barGap={4}>
                <XAxis dataKey="month" stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} width={40} />
                <Tooltip content={<Tip />} />
                <Bar dataKey="purchases" name="Purchases" fill="#2563eb" radius={[4,4,0,0]} barSize={14} />
                <Bar dataKey="sales"     name="Sales"     fill="#34d399" radius={[4,4,0,0]} barSize={14} />
                <Legend iconType="circle" iconSize={6} formatter={v => <span style={{ color:'var(--text-secondary)', fontSize:10 }}>{v}</span>} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="card p-5 flex flex-col items-center justify-center gap-3" style={{ opacity:0.5 }}>
            <Lock size={20} style={{ color:'var(--text-dim)' }} />
            <p className="text-sm text-center" style={{ color:'var(--text-muted)' }}>Financial charts visible to Managers and Admins only</p>
          </div>
        )}
      </div>

      {/* Inventory table — everyone can see stock levels */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom:'1px solid var(--border)' }}>
          <p className="section-title">Stock Level Report — Top 10</p>
          <p className="text-xs mt-0.5" style={{ color:'var(--text-muted)' }}>
            {canSeeFinancials ? 'Sorted by retail value' : 'Sorted by quantity'}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              <th className="th">Product</th>
              <th className="th">SKU</th>
              <th className="th">Qty</th>
              {canSeeFinancials && <th className="th">Unit Price</th>}
              {canSeeFinancials && <th className="th">Retail Value</th>}
              {canSeeFinancials && <th className="th">Margin</th>}
              <th className="th">Status</th>
            </tr></thead>
            <tbody>
              {(canSeeFinancials ? table : products.slice(0,10).map(p => ({ name:p.name, sku:p.sku, qty:p.quantity, price:Number(p.sellingPrice), retailVal:Number(p.sellingPrice)*p.quantity, margin:'—' }))).map((row,i) => (
                <tr key={i} className="tr">
                  <td className="td text-sm font-semibold" style={{ color:'var(--text-primary)' }}>{row.name}</td>
                  <td className="td"><span className="chip font-mono text-xs">{row.sku}</span></td>
                  <td className="td text-sm font-mono font-bold" style={{ color:'var(--text-primary)' }}>{row.qty}</td>
                  {canSeeFinancials && <td className="td text-xs font-mono" style={{ color:'var(--text-secondary)' }}>${row.price?.toFixed(2)}</td>}
                  {canSeeFinancials && <td className="td text-sm font-mono font-bold" style={{ color:'var(--emerald)' }}>${row.retailVal?.toLocaleString()}</td>}
                  {canSeeFinancials && (
                    <td className="td">
                      <span className={`badge ${parseFloat(row.margin)>=30?'badge-emerald':parseFloat(row.margin)>=15?'badge-amber':'badge-rose'}`}>{row.margin}%</span>
                    </td>
                  )}
                  <td className="td">
                    <span className={`badge ${row.qty === 0 ? 'badge-rose' : row.qty <= 10 ? 'badge-amber' : 'badge-emerald'}`}>
                      {row.qty === 0 ? 'Out of Stock' : row.qty <= 10 ? 'Low Stock' : 'In Stock'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Low stock alerts — all roles see this */}
      {lowStock.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom:'1px solid var(--border)' }}>
            <AlertTriangle size={14} style={{ color:'var(--amber)' }} />
            <p className="section-title">Reorder Alerts</p>
            <span className="badge badge-amber ml-1">{lowStock.length}</span>
          </div>
          <table className="w-full">
            <thead><tr>
              {['Product','SKU','Current Stock','Reorder Level','Supplier','Status'].map(h => <th key={h} className="th">{h}</th>)}
            </tr></thead>
            <tbody>
              {lowStock.map(p => (
                <tr key={p.id} className="tr">
                  <td className="td text-sm font-semibold" style={{ color:'var(--text-primary)' }}>{p.name}</td>
                  <td className="td"><span className="chip font-mono text-xs">{p.sku}</span></td>
                  <td className="td"><span className="text-sm font-bold font-mono" style={{ color:p.quantity===0?'var(--rose)':'var(--amber)' }}>{p.quantity}</span></td>
                  <td className="td text-sm font-mono" style={{ color:'var(--text-secondary)' }}>{p.reorderLevel}</td>
                  <td className="td text-xs" style={{ color:'var(--text-secondary)' }}>{p.supplier?.name || '—'}</td>
                  <td className="td"><span className={`badge ${p.quantity===0?'badge-rose':'badge-amber'}`}>{p.quantity===0?'Out of Stock':'Low Stock'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
