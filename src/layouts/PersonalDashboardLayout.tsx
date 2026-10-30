import { useEffect, useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, User, Activity, Server, ShieldCheck, Key, Terminal } from 'lucide-react'
import { auth, db } from '../firebase/config'
import { doc, getDoc } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import Background from '../components/Background'

const PersonalDashboardLayout = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const [userName, setUserName] = useState<string>('User')
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        const fetchUserData = async () => {
            if (auth.currentUser) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid))
                    if (userDoc.exists()) {
                        setUserName(userDoc.data().name || 'User')
                    }
                } catch (err) {
                    console.error("Failed to fetch user name", err)
                }
            }
        }
        fetchUserData()
    }, [])

    const handleLogout = async () => {
        try {
            await signOut(auth)
            navigate('/login')
        } catch (error) {
            console.error('Logout failed', error)
        }
    }

    const navTabs = [
        { path: '/dashboard/personal', label: 'Overview', icon: <Activity size={16} /> },
        { path: '/dashboard/personal/devices', label: 'My Devices', icon: <Server size={16} /> },
        { path: '/dashboard/personal/authentication', label: 'Authentication', icon: <Key size={16} /> },
        { path: '/dashboard/personal/control', label: 'Device Control', icon: <Terminal size={16} /> },
        { path: '/dashboard/personal/alerts', label: 'Security Alerts', icon: <ShieldCheck size={16} /> }
    ]

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'transparent', color: '#0f172a', fontFamily: "'Inter', sans-serif" }}>
            {/* Background Layer */}
            <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
                <Background showGrid={true} />
            </div>

            {/* Glassmorphic Top Header */}
            <header style={{
                position: 'sticky',
                top: 0,
                zIndex: 50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 24px',
                height: '70px',
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                boxShadow: '0 4px 30px rgba(0, 0, 0, 0.03)',
            }}>
                {/* Logo Area */}
                <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '32px', height: '32px', borderRadius: '8px',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 'bold', color: 'white', fontSize: '14px'
                    }}>S</div>
                    {!isMobile && (
                        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '18px', color: '#0f172a' }}>
                            SecureNodeX
                        </span>
                    )}
                </Link>

                {/* Central Greeting */}
                {!isMobile && (
                    <div style={{
                        position: 'absolute', left: '50%', transform: 'translateX(-50%)',
                        fontFamily: "'Space Grotesk', sans-serif", fontSize: '18px', fontWeight: 600, color: '#0f172a'
                    }}>
                        Hello, {userName}!
                    </div>
                )}

                {/* Right Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', cursor: 'pointer' }}>
                        <User size={18} />
                    </div>
                    <div style={{ height: '20px', width: '1px', background: 'rgba(0,0,0,0.1)' }} />
                    <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 500, padding: '8px' }}>
                        <LogOut size={18} />
                        {!isMobile && "Logout"}
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <main style={{ flex: 1, position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '1400px', margin: '0 auto', padding: '0 24px' }}>

                {/* Secondary Tab Navigation */}
                <div style={{
                    marginTop: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                    borderBottom: '1px solid rgba(0,0,0,0.08)',
                    paddingBottom: '12px'
                }}>
                    {navTabs.map((tab) => {
                        // Accurate matching for both exact /dashboard/personal and nested routes
                        const isActive = location.pathname === tab.path
                        return (
                            <Link
                                key={tab.path}
                                to={tab.path}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '10px 16px', borderRadius: '12px',
                                    textDecoration: 'none',
                                    fontSize: '14px', fontWeight: 500, whiteSpace: 'nowrap',
                                    color: isActive ? '#4f46e5' : '#64748b',
                                    background: isActive ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                    transition: 'all 0.2s ease',
                                    border: isActive ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid transparent'
                                }}
                            >
                                <span style={{ color: isActive ? '#818cf8' : 'currentColor' }}>{tab.icon}</span>
                                {tab.label}
                            </Link>
                        )
                    })}
                </div>

                {/* Dynamic Page Content */}
                <div style={{ flex: 1, marginTop: '24px', paddingBottom: '48px' }}>
                    <Outlet />
                </div>

            </main>
        </div>
    )
}

export default PersonalDashboardLayout
