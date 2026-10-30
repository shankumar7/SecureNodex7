import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ShieldAlert, RefreshCw, Eye, Download, ShieldX, CheckCircle, Shield, ArrowRight, Trash2, Activity } from 'lucide-react'
// Zero Firebase: SecureNodeX Native Audit & Alerts

// Reusable Glass Card Component
const GlassCard = ({ title, icon, children, className = '' }: { title: string, icon: React.ReactNode, children: React.ReactNode, className?: string }) => (
    <div className={className} style={{
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(0, 0, 0, 0.05)',
        borderRadius: '24px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        height: '100%',
        boxShadow: '0 10px 40px rgba(0,0,0,0.03)'
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '16px' }}>
            <div style={{ padding: '10px', background: 'rgba(99, 102, 241, 0.1)', color: '#4f46e5', borderRadius: '12px' }}>
                {icon}
            </div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#0f172a', fontFamily: "'Space Grotesk', sans-serif" }}>
                {title}
            </h3>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {children}
        </div>
    </div>
)

// Reusable Action Button Component
const ActionBtn = ({ icon, label, primary = false, danger = false }: any) => (
    <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 16px',
            borderRadius: '12px',
            border: primary ? 'none' : '1px solid rgba(0,0,0,0.08)',
            background: primary ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : (danger ? 'rgba(239, 68, 68, 0.1)' : 'white'),
            color: primary ? 'white' : (danger ? '#ef4444' : '#334155'),
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
            width: '100%',
            justifyContent: 'center',
            borderColor: danger ? 'rgba(239, 68, 68, 0.3)' : (primary ? 'transparent' : 'rgba(0,0,0,0.08)'),
            boxShadow: primary ? '0 4px 12px rgba(99, 102, 241, 0.3)' : '0 2px 4px rgba(0,0,0,0.02)'
        }}
        onMouseEnter={(e) => {
            if (!primary && !danger) e.currentTarget.style.background = '#f8fafc'
        }}
        onMouseLeave={(e) => {
            if (!primary && !danger) e.currentTarget.style.background = 'white'
        }}
    >
        {icon}
        {label}
    </motion.button>
)

const mockAlerts = [
    { id: 'AL-001', type: 'Invalid Handshake', device: 'Unknown (MAC: FA:B3)', time: '10 mins ago', severity: 'high', autoBlocked: true },
    { id: 'AL-002', type: 'Certificate Expired', device: 'Arduino_Weather', time: '2 hours ago', severity: 'medium', autoBlocked: false },
    { id: 'AL-003', type: 'Multiple Auth Failures', device: 'Secure_Node_TX', time: '1 day ago', severity: 'critical', autoBlocked: true },
]

const SecurityAlertsTab = () => {
    const [alerts, setAlerts] = useState<any[]>(mockAlerts);

    useEffect(() => {
        fetch('http://localhost:8443/v1/audit/events')
            .then(res => res.json())
            .then(data => {
                if (data && data.items && data.items.length > 0) {
                    const fetched = data.items.slice(0, 10).map((ev: any, idx: number) => ({
                        id: `EV-${idx + 1}`,
                        type: ev.event_type || 'Audit Event',
                        device: ev.actor_id || 'Cluster Node',
                        time: new Date(ev.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        severity: ev.event_type?.includes('TAMPER') || ev.event_type?.includes('FAIL') ? 'critical' : 'medium',
                        autoBlocked: true,
                    }));
                    setAlerts(fetched);
                }
            })
            .catch(() => {
                setAlerts(mockAlerts);
            });
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
        >
            <div style={{ marginBottom: '8px' }}>
                <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em', margin: 0 }}>
                    Security Alerts
                </h2>
                <p style={{ color: '#475569', marginTop: '8px', fontSize: '15px' }}>
                    Monitor intrusion attempts, certificate violations, and automatic protection protocols.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>

                {/* 1. Alert Summary & Severity */}
                <GlassCard title="Alert Summary" icon={<ShieldAlert size={20} />}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                        <div style={{ textAlign: 'center', flex: 1 }}>
                            <p style={{ margin: 0, fontSize: '32px', fontWeight: 700, color: '#ef4444', fontFamily: "'Space Grotesk', sans-serif" }}>1</p>
                            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Critical</p>
                        </div>
                        <div style={{ width: '1px', height: '30px', background: 'rgba(0,0,0,0.1)' }} />
                        <div style={{ textAlign: 'center', flex: 1 }}>
                            <p style={{ margin: 0, fontSize: '32px', fontWeight: 700, color: '#f59e0b', fontFamily: "'Space Grotesk', sans-serif" }}>1</p>
                            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Medium</p>
                        </div>
                        <div style={{ width: '1px', height: '30px', background: 'rgba(0,0,0,0.1)' }} />
                        <div style={{ textAlign: 'center', flex: 1 }}>
                            <p style={{ margin: 0, fontSize: '32px', fontWeight: 700, color: '#0f172a', fontFamily: "'Space Grotesk', sans-serif" }}>1</p>
                            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Low</p>
                        </div>
                    </div>

                    <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        <p style={{ margin: 0, color: '#ef4444', fontSize: '13px', fontWeight: 600 }}>System Integrity: Compromised Auth Attempt Detected</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: 'auto' }}>
                        <div style={{ gridColumn: 'span 2' }}>
                            <ActionBtn primary icon={<Eye size={16} />} label="View All Alerts" />
                        </div>
                        <ActionBtn icon={<RefreshCw size={16} />} label="Refresh Alerts" />
                        <ActionBtn icon={<Download size={16} />} label="Export Log" />
                        <div style={{ gridColumn: 'span 2' }}>
                            <ActionBtn danger icon={<ShieldX size={16} />} label="Block All Critical" />
                        </div>
                    </div>
                </GlassCard>

                {/* 2. Live Alerts Feed */}
                <GlassCard title="Live Threat Feed" icon={<Activity size={20} />}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1, maxHeight: '300px' }}>
                        {alerts.map((alert) => (
                            <div key={alert.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'white', borderRadius: '12px', border: alert.severity === 'critical' || alert.severity === 'high' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(0,0,0,0.05)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: 500 }}>{alert.type}</span>
                                    <span style={{ fontSize: '11px', color: '#64748b' }}>{alert.time}</span>
                                </div>
                                <div style={{ fontSize: '13px', color: '#475569' }}>Source: {alert.device}</div>
                                {alert.autoBlocked && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#059669', marginTop: '4px' }}>
                                        <Shield size={12} /> Auto-Blocked by Firewall
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                        <ActionBtn primary icon={<ArrowRight size={16} />} label="Open Threat Manager" />
                        <ActionBtn icon={<RefreshCw size={16} />} label="Refresh Feed" />
                    </div>
                </GlassCard>

                {/* 3. Automatic Protection & Management */}
                <GlassCard title="Incident Response" icon={<Shield size={20} />}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <CheckCircle size={16} />
                                </div>
                                <div>
                                    <p style={{ margin: 0, color: '#059669', fontSize: '14px', fontWeight: 600 }}>Active Protection</p>
                                    <p style={{ margin: '2px 0 0', color: '#475569', fontSize: '12px' }}>2 threats mitigated automatically.</p>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                            <ActionBtn icon={<Eye size={16} />} label="View Automated Actions" />
                            <ActionBtn icon={<ShieldX size={16} />} label="Isolate Compromised Node" />
                        </div>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', marginTop: 'auto', paddingTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div style={{ gridColumn: 'span 2' }}>
                            <ActionBtn primary icon={<CheckCircle size={16} />} label="Mark All Resolved" />
                        </div>
                        <ActionBtn icon={<Archive size={16} />} label="Archive Selected" />
                        <ActionBtn danger icon={<Trash2 size={16} />} label="Clear Alerts" />
                    </div>
                </GlassCard>

            </div>
        </motion.div>
    )
}

// Temporary icon addition for Archive
const Archive = (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
)

export default SecurityAlertsTab
