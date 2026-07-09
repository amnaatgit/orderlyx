import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, ArrowRight, Package, BarChart3, ShoppingCart, Truck, Shield, TrendingUp, Layers, CheckCircle2 } from 'lucide-react'

const DEMOS = [
  { role:'Admin',   label:'Administrator', email:'admin@orderlyx.com',   pass:'admin123',   color:'#1d4ed8', light:'#eff6ff' },
  { role:'Manager', label:'Manager',       email:'manager@orderlyx.com', pass:'manager123', color:'#0369a1', light:'#f0f9ff' },
  { role:'Staff',   label:'Staff',         email:'staff@orderlyx.com',   pass:'staff123',   color:'#047857', light:'#ecfdf5' },
  { role:'Viewer',  label:'Viewer',        email:'viewer@orderlyx.com',  pass:'viewer123',  color:'#64748b', light:'#f8fafc' },
]

const FEATURES = [
  { icon:Package,     title:'Product & Stock Control',   desc:'Track inventory across multiple warehouses with real-time alerts' },
  { icon:Truck,       title:'Supplier Management',       desc:'Vendor profiles, contacts, purchase orders and credit limits' },
  { icon:ShoppingCart,title:'Order Processing',          desc:'Full purchase and sales order lifecycle with status tracking' },
  { icon:BarChart3,   title:'Analytics & Reporting',     desc:'Revenue trends, margin analysis and low-stock reports' },
  { icon:Shield,      title:'Role-Based Access Control', desc:'Admin, Manager, Staff and Viewer with granular permissions' },
  { icon:TrendingUp,  title:'Audit Logging',             desc:'Full trail of every change — who did what and when' },
]

export default function Login() {
  const { login } = useAuth()
  const [form, setForm]       = useState({ email:'', password:'' })
  const [show, setShow]       = useState(false)
  const [err, setErr]         = useState('')
  const [loading, setLoading] = useState(false)

  // Fill form with demo credentials — does NOT auto-login
  const fill = d => {
    setForm({ email: d.email, password: d.pass })
    setErr('')
  }

  const submit = async e => {
    e.preventDefault(); setErr(''); setLoading(true)
    try   { await login(form.email, form.password) }
    catch (ex) { setErr(ex.response?.data?.error || 'Invalid email or password.') }
    finally    { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex" style={{ fontFamily:'Inter, system-ui, sans-serif' }}>

      {/* ── Left branding panel ─────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col w-[480px] flex-shrink-0 relative overflow-hidden"
        style={{ background:'#0f172a' }}>

        {/* Subtle pattern */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage:`url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.025'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}/>
        <div className="absolute inset-0 pointer-events-none" style={{
          background:'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(37,99,235,0.25) 0%, transparent 60%)'
        }}/>

        <div className="relative flex flex-col h-full p-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background:'linear-gradient(135deg,#2563eb,#1d4ed8)', boxShadow:'0 4px 14px rgba(37,99,235,0.4)' }}>
              <Layers size={16} color="#fff" strokeWidth={2.5}/>
            </div>
            <div>
              <p className="font-bold text-white text-sm tracking-tight">OrderlyX</p>
              <p className="text-xs" style={{ color:'rgba(255,255,255,0.45)' }}>Inventory Management Platform</p>
            </div>
          </div>

          {/* Headline */}
          <div className="mb-10">
            <h1 className="font-bold text-3xl text-white leading-tight mb-3" style={{ letterSpacing:'-0.03em' }}>
              Built for businesses<br/>
              <span style={{ color:'rgba(255,255,255,0.4)' }}>that need control.</span>
            </h1>
            <p className="text-sm leading-relaxed" style={{ color:'rgba(255,255,255,0.5)' }}>
              A complete inventory management platform with role-based access, real-time stock tracking, and full audit logging.
            </p>
          </div>

          {/* Feature list */}
          <div className="flex-1 space-y-4">
            {FEATURES.map(f => (
              <div key={f.title} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background:'rgba(37,99,235,0.2)', border:'1px solid rgba(37,99,235,0.3)' }}>
                  <f.icon size={13} color="rgba(147,197,253,0.9)"/>
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color:'rgba(255,255,255,0.85)' }}>{f.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color:'rgba(255,255,255,0.4)' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6" style={{ borderTop:'1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={12} color="rgba(52,211,153,0.7)"/>
              <p className="text-xs" style={{ color:'rgba(255,255,255,0.3)' }}>Role-based access · Full audit trail · Real-time alerts</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right sign-in panel ──────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto"
        style={{ background:'#f8fafc' }}>
        <div className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background:'#1d4ed8' }}>
              <Layers size={14} color="#fff" strokeWidth={2.5}/>
            </div>
            <span className="font-bold text-sm" style={{ color:'#0f172a' }}>OrderlyX</span>
          </div>

          <h2 className="font-bold text-2xl mb-1" style={{ color:'#0f172a', letterSpacing:'-0.025em' }}>Sign in</h2>
          <p className="text-sm mb-7" style={{ color:'#94a3b8' }}>Enter your credentials to access the dashboard</p>

          {/* ── Demo accounts ─────────────────────────── */}
          <div className="mb-6">
            <p className="text-xs font-semibold mb-2.5 uppercase tracking-widest" style={{ color:'#94a3b8', letterSpacing:'0.08em', fontSize:10 }}>
              Quick Demo — click to fill credentials
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMOS.map(d => (
                <button key={d.role} onClick={() => fill(d)} type="button"
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all"
                  style={{
                    background:'#fff', border:'1px solid #e2e8f0',
                    boxShadow:'0 1px 2px rgba(0,0,0,0.04)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = d.color + '60'; e.currentTarget.style.background = d.light }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff' }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: d.light, color: d.color, border:`1px solid ${d.color}30` }}>
                    {d.role[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: d.color }}>{d.label}</p>
                    <p className="text-xs truncate" style={{ color:'#94a3b8', fontSize:10 }}>{d.pass}</p>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs mt-2" style={{ color:'#cbd5e1', fontSize:10 }}>
              ↑ Fills the form below · click Sign In to log in
            </p>
          </div>

          {/* ── Divider ──────────────────────────────── */}
          <div className="flex items-center gap-3 mb-6">
            <div style={{ flex:1, height:1, background:'#e2e8f0' }}/>
            <span className="text-xs" style={{ color:'#cbd5e1' }}>or enter credentials manually</span>
            <div style={{ flex:1, height:1, background:'#e2e8f0' }}/>
          </div>

          {/* ── Form ─────────────────────────────────── */}
          <form onSubmit={submit}>
            <div className="mb-4">
              <label className="label">Email address</label>
              <input type="email" className="input" placeholder="you@company.com"
                value={form.email} onChange={e => setForm({...form, email:e.target.value})} required/>
            </div>
            <div className="mb-5">
              <label className="label">Password</label>
              <div style={{ position:'relative' }}>
                <input type={show?'text':'password'} className="input" style={{ paddingRight:40 }}
                  placeholder="Enter your password"
                  value={form.password} onChange={e => setForm({...form, password:e.target.value})} required/>
                <button type="button" onClick={() => setShow(!show)}
                  style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', lineHeight:1 }}>
                  {show ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>

            {err && (
              <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
                style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626' }}>
                <span>⚠</span> {err}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center"
              style={{ height:42 }}>
              {loading
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Signing in…</>
                : <><span>Sign In</span><ArrowRight size={15}/></>
              }
            </button>
          </form>

          <p className="mt-8 text-xs text-center" style={{ color:'#cbd5e1' }}>
            OrderlyX — Role-Based Inventory Management Platform
          </p>
        </div>
      </div>
    </div>
  )
}
