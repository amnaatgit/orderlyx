import { useState, useEffect } from 'react'
import { dashAPI } from '../api'
import { StatCard, Loader } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { Package, Truck, ShoppingCart, AlertTriangle, DollarSign, TrendingUp, Users, ClipboardList, RotateCcw } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const COLORS = ['#2563eb','#34d399','#fb923c','#fb7185','#a78bfa','#38bdf8']

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="px-3 py-2 rounded-xl text-xs" style={{ background:'var(--bg-card)', border:'1px solid var(--border-hover)', boxShadow:'var(--shadow-md)' }}>
      <p className="font-semibold mb-1" style={{ color:'var(--text-primary)' }}>{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color:p.color }}>{p.name}</span>
          <span className="font-mono font-bold" style={{ color:'var(--text-primary)' }}>${Number(p.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

const oB = { PENDING:'badge-amber', CONFIRMED:'badge-sky', COMPLETED:'badge-emerald', CANCELLED:'badge-rose' }
const tB = { PURCHASE:'badge-emerald', SALE:'badge-gold', ADJUSTMENT:'badge-neutral' }
const alertColor = { LOW_STOCK:'var(--amber)', OUT_OF_STOCK:'var(--rose)', EXPIRY_SOON:'var(--violet)' }

export default function Dashboard() {
  const { user, isAdmin, isManager } = useAuth()
  const [data, setData]     = useState(null)
  const [chart, setChart]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([dashAPI.stats(), dashAPI.chartData()])
      .then(([s,c]) => { setData(s.data); setChart(c.data) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Loader />
  const { stats:s, recentOrders=[], categoryStats=[], alerts=[] } = data || {}
  const { monthlyOrders=[], topProducts=[] } = chart || {}

  return (
    <div className="space-y-5">
      {/* Welcome */}
      <div>
        <h2 className="font-semibold text-base" style={{ color:'var(--text-primary)' }}>
          Welcome back, {user?.name?.split(' ')[0]}
        </h2>
        <p className="text-xs mt-0.5" style={{ color:'var(--text-muted)' }}>
          {isAdmin ? 'Full system access — Admin view' : isManager ? 'Management access — Manager view' : user?.role === 'STAFF' ? 'Operational view — stock and orders' : 'Read-only — Viewer access'}
        </p>
      </div>

      {/* KPIs — all roles */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Package}       label="Active Products"     value={s?.totalProducts ?? 0}    sub="In catalog"          color="gold"    />
        <StatCard icon={Truck}         label="Active Suppliers"    value={s?.totalSuppliers ?? 0}   sub="Vendor partners"     color="sky"     />
        <StatCard icon={AlertTriangle} label="Low / Out of Stock"  value={`${s?.lowStock ?? 0} / ${s?.outOfStock ?? 0}`} sub="Need attention" color="rose" />
        <StatCard icon={ShoppingCart}  label="Total Orders"        value={s?.totalOrders ?? 0}      sub="All time"            color="amber"   />
      </div>

      {/* Financial row — ADMIN + MANAGER only */}
      {isManager && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {[
            { label:'INVENTORY VALUE',  value:`$${Number(s?.inventoryValue??0).toLocaleString()}`,   sub:'At cost price',    color:'var(--accent)' },
            { label:'RETAIL VALUE',     value:`$${Number(s?.retailValue??0).toLocaleString()}`,      sub:'At selling price', color:'var(--emerald)' },
            { label:'POTENTIAL PROFIT', value:`$${Number(s?.potentialProfit??0).toLocaleString()}`, sub:'Current margin',   color:'var(--amber)' },
          ].map(i => (
            <div key={i.label} className="card p-5 card-interactive">
              <p className="label mb-3">{i.label}</p>
              <p className="stat-value mb-1" style={{ color:i.color }}>{i.value}</p>
              <p className="text-xs" style={{ color:'var(--text-muted)' }}>{i.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Admin system health row */}
      {isAdmin && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard icon={Users}         label="Registered Users"   value={s?.totalUsers ?? 0}              sub="All accounts"       color="violet"  />
          <StatCard icon={ClipboardList} label="Activity (24h)"    value={s?.recentAuditCount ?? 0}        sub="Audit events today" color="sky"     />
          <StatCard icon={RotateCcw}     label="Pending Reorders"  value={s?.reorderRequests ?? 0}         sub="Awaiting action"    color="amber"   />
          <StatCard icon={DollarSign}    label="Monthly Revenue"   value={`$${Number(s?.monthlyRevenue??0).toLocaleString()}`} sub="Sales this month" color="emerald" />
        </div>
      )}

      {/* Staff — stock alert action panel */}
      {user?.role === 'STAFF' && alerts.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom:'1px solid var(--border)', background:'#fef2f2' }}>
            <AlertTriangle size={14} style={{ color:'var(--rose)' }} />
            <p className="font-semibold text-sm" style={{ color:'var(--text-primary)' }}>Action Required — Stock Alerts</p>
            <span className="badge badge-rose ml-auto">{alerts.length}</span>
          </div>
          {alerts.map(a => (
            <div key={a.id} className="flex items-center gap-3 px-5 py-3  transition-colors" style={{ borderBottom:'1px solid var(--border)' }}>
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: alertColor[a.type] || 'var(--amber)' }} />
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color:'var(--text-primary)' }}>{a.product?.name}</p>
                <p className="text-xs" style={{ color:'var(--text-muted)' }}>SKU: {a.product?.sku} · Qty: {a.product?.quantity}</p>
              </div>
              <span className={`badge ${a.severity === 'CRITICAL' ? 'badge-rose' : 'badge-amber'}`}>{a.severity}</span>
            </div>
          ))}
        </div>
      )}

      {/* Charts — all roles */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="card p-5 xl:col-span-2">
          <p className="section-title mb-4">Order Activity — Last 6 Months</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyOrders}>
              <defs>
                <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/><stop offset="95%" stopColor="#2563eb" stopOpacity={0}/></linearGradient>
                <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#34d399" stopOpacity={0.2}/><stop offset="95%" stopColor="#34d399" stopOpacity={0}/></linearGradient>
              </defs>
              <XAxis dataKey="month" stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} width={40} />
              <Tooltip content={<Tip />} />
              <Area type="monotone" dataKey="purchases" name="Purchases" stroke="#2563eb" strokeWidth={2} fill="url(#gP)" dot={false} />
              <Area type="monotone" dataKey="sales"     name="Sales"     stroke="#34d399" strokeWidth={2} fill="url(#gS)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <p className="section-title mb-4">By Category</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={categoryStats} cx="50%" cy="44%" innerRadius={50} outerRadius={74} dataKey="count" paddingAngle={4} strokeWidth={0}>
                {categoryStats.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border-hover)', borderRadius:12, fontSize:11 }} formatter={(v,n) => [`${v} products`, n]} />
              <Legend iconType="circle" iconSize={6} formatter={v => <span style={{ color:'var(--text-secondary)', fontSize:10 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="section-title mb-4">Stock Levels</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topProducts} layout="vertical" barSize={7}>
              <XAxis type="number" stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" width={110} stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v=>v.length>14?v.slice(0,14)+'…':v} />
              <Tooltip contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border-hover)', borderRadius:12, fontSize:11 }} />
              <Bar dataKey="quantity"     name="Stock"     fill="#2563eb" radius={[0,5,5,0]} />
              <Bar dataKey="reorderLevel" name="Min Level" fill="rgba(251,113,133,0.4)" radius={[0,5,5,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-3" style={{ borderBottom:'1px solid var(--border)' }}>
            <p className="section-title">Recent Orders</p>
          </div>
          {recentOrders.length === 0 && <p className="px-5 py-8 text-sm text-center" style={{ color:'var(--text-muted)' }}>No orders yet</p>}
          {recentOrders.slice(0,5).map((o,i) => (
            <div key={o.id} className="flex items-center gap-3 px-5 py-3  transition-colors" style={{ borderBottom: i<4?'1px solid var(--border)':'none' }}>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold font-mono" style={{ color:'var(--text-primary)' }}>{o.orderNumber}</p>
                <p className="text-xs" style={{ color:'var(--text-muted)' }}>{o.user?.name} · {o.items?.length} items</p>
              </div>
              <span className={`badge ${tB[o.type]}`}>{o.type}</span>
              <span className={`badge ${oB[o.status]}`}>{o.status}</span>
              {isManager && (
                <p className="text-xs font-mono font-bold flex-shrink-0" style={{ color:'var(--text-primary)' }}>
                  ${Number(o.totalAmount).toLocaleString()}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
