import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import {
    LayoutDashboard,
    ShieldCheck,
    Activity,
    Settings,
    LogOut,
    Menu,
    X,
    Search,
    Bell,
    User
} from 'lucide-react'
import { useDeviceType } from '../hooks/useDeviceType'
import Background from '../components/Background'

const DashboardLayout = () => {
    const { isMobile } = useDeviceType()
    const [sidebarOpen, setSidebarOpen] = useState(!isMobile)
    const location = useLocation()

    const navItems = [
        { icon: <LayoutDashboard size={20} />, label: 'Overview', path: '/dashboard' },
        { icon: <ShieldCheck size={20} />, label: 'Security', path: '/dashboard/security' },
        { icon: <Activity size={20} />, label: 'Network', path: '/dashboard/network' },
        { icon: <Settings size={20} />, label: 'Settings', path: '/dashboard/settings' },
    ]

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: "'Inter', sans-serif" }}>
            {/* Background Layer */}
            <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
                <Background showGrid={true} />
            </div>

            {/* Sidebar */}
            <aside
                style={{
                    position: isMobile ? 'fixed' : 'sticky',
                    top: 0,
                    left: 0,
                    height: '100vh',
                    width: '260px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(20px)',
                    borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                    zIndex: 50,
                    transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
                    transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* Sidebar Header */}
                <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{
                        width: '32px', height: '32px', borderRadius: '8px',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 'bold', color: 'white'
                    }}>S</div>
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '18px', fontWeight: 700, color: 'white' }}>
                        SecureNodeX
                    </span>
                    {isMobile && (
                        <button onClick={() => setSidebarOpen(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#94a3b8' }}>
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Nav Links */}
                <nav style={{ flex: 1, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {navItems.map(item => {
                        const isActive = location.pathname === item.path
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                    padding: '12px 16px', borderRadius: '12px',
                                    textDecoration: 'none',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    color: isActive ? 'white' : '#94a3b8',
                                    background: isActive ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                    border: isActive ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid transparent',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <span style={{ color: isActive ? '#818cf8' : 'currentColor' }}>{item.icon}</span>
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>

                {/* Sidebar Footer */}
                <div style={{ padding: '24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <button style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '12px 16px', borderRadius: '12px',
                        background: 'transparent', border: 'none',
                        color: '#ef4444', fontSize: '14px', fontWeight: 500, cursor: 'pointer',
                        transition: 'background 0.2s'
                    }}>
                        <LogOut size={20} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 10, overflow: 'hidden' }}>
                {/* Topbar */}
                <header style={{
                    height: '70px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 24px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(15, 23, 42, 0.4)',
                    backdropFilter: 'blur(12px)',
                    position: 'sticky', top: 0, zIndex: 40
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {isMobile && !sidebarOpen && (
                            <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: '#e2e8f0' }}>
                                <Menu size={24} />
                            </button>
                        )}
                        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '18px', fontWeight: 600, margin: 0 }}>
                            {navItems.find(i => i.path === location.pathname)?.label || 'Dashboard'}
                        </h2>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        {/* Search */}
                        <div style={{ position: 'relative', display: isMobile ? 'none' : 'block' }}>
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="text"
                                placeholder="Search..."
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    padding: '8px 12px 8px 36px',
                                    color: 'white',
                                    fontSize: '14px',
                                    outline: 'none',
                                    width: '240px'
                                }}
                            />
                        </div>

                        {/* Actions */}
                        <button style={{ background: 'none', border: 'none', color: '#94a3b8', position: 'relative' }}>
                            <Bell size={20} />
                            <span style={{ position: 'absolute', top: -2, right: -2, width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%' }} />
                        </button>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e2e8f0' }}>
                            <User size={18} />
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main style={{ flex: 1, padding: '32px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flex: 1 }}>
                        <Outlet />
                    </div>

                    {/* Dashboard Footer */}
                    <footer style={{
                        marginTop: '48px',
                        paddingTop: '24px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        justifyContent: 'space-between',
                        alignItems: isMobile ? 'flex-start' : 'center',
                        gap: '16px',
                        color: '#64748b',
                        fontSize: '13px'
                    }}>
                        <div>
                            &copy; {new Date().getFullYear()} SecureNodeX. All rights reserved.
                        </div>
                        <div style={{ display: 'flex', gap: '24px' }}>
                            <Link to="/terms" style={{ color: '#64748b', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#e2e8f0'} onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}>Terms & Conditions</Link>
                            <Link to="/privacy" style={{ color: '#64748b', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#e2e8f0'} onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}>Privacy Rules</Link>
                        </div>
                    </footer>
                </main>
            </div>

            {/* Overlay for mobile sidebar */}
            {isMobile && sidebarOpen && (
                <div
                    onClick={() => setSidebarOpen(false)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 45, backdropFilter: 'blur(4px)' }}
                />
            )}
        </div>
    )
}

export default DashboardLayout
