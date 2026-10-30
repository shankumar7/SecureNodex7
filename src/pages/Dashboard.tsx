import { Activity, ShieldCheck, Server, AlertTriangle, Cpu, Globe } from 'lucide-react'

// Reusable Stat Card
const StatCard = ({ title, value, subtext, icon, trend }: any) => (
    <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: '#9ca3af' }}>
                {icon}
            </div>
            <span style={{ fontSize: '14px', color: trend > 0 ? '#4ade80' : '#f87171', fontWeight: 600 }}>
                {trend > 0 ? '+' : ''}{trend}%
            </span>
        </div>
        <div>
            <h4 style={{ fontSize: '14px', color: '#9ca3af', fontWeight: 500, margin: 0 }}>{title}</h4>
            <p style={{ fontSize: '28px', fontWeight: 700, color: 'white', margin: '4px 0 0', fontFamily: "'Space Grotesk', sans-serif" }}>
                {value}
            </p>
        </div>
        <p style={{ fontSize: '12px', color: '#6b7280' }}>{subtext}</p>
    </div>
)

const Dashboard = () => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Header */}
            <div>
                <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'white', fontFamily: "'Space Grotesk', sans-serif" }}>
                    System Overview
                </h1>
                <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
                    Welcome back, Admin. All systems are operational.
                </p>
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
                <StatCard
                    title="Active Nodes"
                    value="1,284"
                    subtext="98.2% Uptime"
                    icon={<Server size={20} />}
                    trend={12.5}
                />
                <StatCard
                    title="Network Traffic"
                    value="42.8 GB/s"
                    subtext="Peak load at 14:00"
                    icon={<Globe size={20} />}
                    trend={8.2}
                />
                <StatCard
                    title="Security Threats"
                    value="0"
                    subtext="Last 24 hours"
                    icon={<ShieldCheck size={20} />}
                    trend={-100}
                />
                <StatCard
                    title="CPU Load"
                    value="45%"
                    subtext="Average across cluster"
                    icon={<Cpu size={20} />}
                    trend={-2.4}
                />
            </div>

            {/* Charts Section (Placeholder) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repea(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                {/* Traffic Chart */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '16px',
                    padding: '24px',
                    minHeight: '300px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'white' }}>Network Traffic</h3>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', color: 'white' }}>1H</span>
                            <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '6px', color: '#64748b' }}>24H</span>
                        </div>
                    </div>
                    {/* Fake Chart Visualization */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', height: '200px', gap: '8px' }}>
                        {[40, 65, 30, 80, 55, 90, 45, 60, 75, 50, 85, 60].map((h, i) => (
                            <div key={i} style={{
                                flex: 1,
                                height: `${h}%`,
                                background: 'linear-gradient(to top, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.6))',
                                borderRadius: '4px 4px 0 0'
                            }} />
                        ))}
                    </div>
                </div>

                {/* Alerts Feed */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '16px',
                    padding: '24px',
                    minHeight: '300px'
                }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'white', marginBottom: '20px' }}>Recent Alerts</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {[
                            { type: 'warning', msg: 'High CPU usage on Node-Alpha', time: '2m ago' },
                            { type: 'success', msg: 'Backup completed successfully', time: '1h ago' },
                            { type: 'info', msg: 'New firmware update available', time: '3h ago' },
                        ].map((alert, i) => (
                            <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                <div style={{
                                    minWidth: '32px', height: '32px', borderRadius: '8px',
                                    background: alert.type === 'warning' ? 'rgba(245, 158, 11, 0.1)' : alert.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: alert.type === 'warning' ? '#fbbf24' : alert.type === 'success' ? '#34d399' : '#60a5fa'
                                }}>
                                    {alert.type === 'warning' ? <AlertTriangle size={16} /> : <Activity size={16} />}
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '14px', color: '#e2e8f0' }}>{alert.msg}</p>
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>{alert.time}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Dashboard
