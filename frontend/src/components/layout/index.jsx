import { NavLink, useLocation, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, Package, Tag, Truck, ShoppingCart,
  Users, BarChart3, LogOut, Layers, Shield, ClipboardList
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const NAV = [
  { to:'/',           icon:LayoutDashboard, label:'Dashboard',       exact:true, roles:['ADMIN','MANAGER','STAFF','VIEWER'] },
  { to:'/products',   icon:Package,         label:'Products',                    roles:['ADMIN','MANAGER','STAFF','VIEWER'] },
  { to:'/categories', icon:Tag,             label:'Categories',                  roles:['ADMIN','MANAGER','STAFF','VIEWER'] },
  { to:'/suppliers',  icon:Truck,           label:'Suppliers',                   roles:['ADMIN','MANAGER','STAFF','VIEWER'] },
  { to:'/orders',     icon:ShoppingCart,    label:'Orders',                      roles:['ADMIN','MANAGER','STAFF','VIEWER'] },
  { to:'/customers',  icon:Users,           label:'Customers',                   roles:['ADMIN','MANAGER'] },
  { to:'/reports',    icon:BarChart3,       label:'Reports',                     roles:['ADMIN','MANAGER','STAFF','VIEWER'] },
  { to:'/users',      icon:Shield,          label:'User Management',             roles:['ADMIN'] },
  { to:'/audit',      icon:ClipboardList,   label:'Audit Logs',                  roles:['ADMIN'] },
]

const PAGE_TITLES = {
  '/':'/Dashboard', '/products':'Products', '/categories':'Categories',
  '/suppliers':'Suppliers', '/orders':'Orders', '/customers':'Customers',
  '/reports':'Reports & Analytics', '/users':'User Management', '/audit':'Audit Logs',
}

const ROLE_STYLE = {
  ADMIN:   { color:'#1d4ed8', bg:'#eff6ff', label:'Admin' },
  MANAGER: { color:'#0284c7', bg:'#f0f9ff', label:'Manager' },
  STAFF:   { color:'#059669', bg:'#ecfdf5', label:'Staff' },
  VIEWER:  { color:'#64748b', bg:'#f8fafc', label:'Viewer' },
}

function NavItem({ item, pathname }) {
  const active = item.exact ? pathname === item.to : pathname === item.to
  return (
    <NavLink to={item.to}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-100 relative ${active ? 'nav-active' : ''}`}
      style={active ? {} : { color:'#64748b', fontWeight:400 }}>
      {!active && (
        <span className="absolute inset-0 rounded-lg opacity-0 hover:opacity-100 transition-opacity"
          style={{ background:'#f1f5f9' }}/>
      )}
      <item.icon size={15} className="flex-shrink-0 relative z-10" style={active ? { color:'#1d4ed8' } : {}}/>
      <span className="relative z-10">{item.label}</span>
    </NavLink>
  )
}

export function Layout() {
  const { user, logout } = useAuth()
  const { pathname }     = useLocation()
  const rs               = ROLE_STYLE[user?.role] || ROLE_STYLE.VIEWER
  const navItems         = NAV.filter(n => n.roles.includes(user?.role))
  const mainNav          = navItems.filter(n => !['ADMIN'].every(r => n.roles.includes(r) && n.roles.length === 1))
  const adminNav         = navItems.filter(n => n.roles.length === 1 && n.roles[0] === 'ADMIN')
  const pageTitle        = PAGE_TITLES[pathname] || 'OrderlyX'

  return (
    <div className="flex min-h-screen" style={{ background:'var(--bg-base)' }}>

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside className="fixed left-0 top-0 h-screen w-56 flex flex-col z-30"
        style={{ background:'#fff', borderRight:'1px solid #e2e8f0' }}>

        {/* Logo */}
        <div className="px-5 py-4 flex items-center gap-3 flex-shrink-0"
          style={{ borderBottom:'1px solid #f1f5f9' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background:'#1d4ed8', boxShadow:'0 2px 8px rgba(29,78,216,0.3)' }}>
            <Layers size={14} color="#fff" strokeWidth={2.5}/>
          </div>
          <div>
            <p className="font-bold text-sm leading-tight" style={{ color:'#0f172a', letterSpacing:'-0.01em' }}>OrderlyX</p>
            <p style={{ fontSize:10, color:'#94a3b8', fontWeight:500 }}>Inventory Platform</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
          <p className="px-3 mb-2" style={{ fontSize:10, fontWeight:600, color:'#94a3b8', letterSpacing:'0.08em', textTransform:'uppercase' }}>
            Main Menu
          </p>
          {mainNav.map(item => <NavItem key={item.to} item={item} pathname={pathname}/>)}

          {user?.role === 'ADMIN' && adminNav.length > 0 && (
            <>
              <div style={{ height:1, background:'#f1f5f9', margin:'12px 12px' }}/>
              <p className="px-3 mb-2" style={{ fontSize:10, fontWeight:600, color:'#94a3b8', letterSpacing:'0.08em', textTransform:'uppercase' }}>
                Administration
              </p>
              {adminNav.map(item => <NavItem key={item.to} item={item} pathname={pathname}/>)}
            </>
          )}
        </nav>

        {/* User card */}
        <div className="p-3 flex-shrink-0" style={{ borderTop:'1px solid #f1f5f9' }}>
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
            style={{ background:'#f8fafc', border:'1px solid #e2e8f0' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background:rs.bg, color:rs.color, border:`1px solid ${rs.color}25` }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color:'#0f172a', lineHeight:1.4 }}>{user?.name}</p>
              <p style={{ fontSize:10, color:rs.color, fontWeight:600, lineHeight:1.4 }}>{rs.label}</p>
            </div>
            <button onClick={logout} title="Sign out"
              className="p-1.5 rounded-lg transition-colors flex-shrink-0"
              style={{ color:'#94a3b8' }}
              onMouseEnter={e=>{e.currentTarget.style.color='#dc2626';e.currentTarget.style.background='#fef2f2'}}
              onMouseLeave={e=>{e.currentTarget.style.color='#94a3b8';e.currentTarget.style.background='transparent'}}>
              <LogOut size={13}/>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────── */}
      <div className="flex-1 pl-56 flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-3.5"
          style={{ background:'rgba(255,255,255,0.9)', backdropFilter:'blur(12px)', borderBottom:'1px solid #e2e8f0' }}>
          <h1 className="font-semibold" style={{ color:'#0f172a', fontSize:14 }}>{pageTitle}</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg"
              style={{ background:rs.bg, color:rs.color }}>
              {rs.label}
            </span>
            <span className="text-xs" style={{ color:'#94a3b8' }}>{user?.email}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">
          <Outlet/>
        </main>
      </div>
    </div>
  )
}
