import React from 'react'
import { motion } from 'framer-motion'
import { Activity, Server, Clock, RefreshCw, Info, Wifi, Plus, Settings, Filter, FileText, Download, List } from 'lucide-react'

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
const ActionBtn = ({ icon, label, primary = false }: { icon: React.ReactNode, label: string, primary?: boolean }) => (
    <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 16px',
            borderRadius: '12px',
            border: primary ? 'none' : '1px solid rgba(0,0,0,0.08)',
            background: primary ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'white',
            color: primary ? 'white' : '#334155',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
            width: '100%',
            justifyContent: 'center',
            boxShadow: primary ? '0 4px 12px rgba(99, 102, 241, 0.3)' : '0 2px 4px rgba(0,0,0,0.02)'
        }}
        onMouseEnter={(e) => {
            if (!primary) e.currentTarget.style.background = '#f8fafc'
        }}
        onMouseLeave={(e) => {
            if (!primary) e.currentTarget.style.background = 'white'
        }}
    >
        {icon}
        {label}
    </motion.button>
)

const OverviewTab = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
        >
            <div style={{ marginBottom: '8px' }}>
                <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em', margin: 0 }}>
                    Dashboard Overview
                </h2>
                <p style={{ color: '#475569', marginTop: '8px', fontSize: '15px' }}>
                    Monitor your environment status, connected devices, and recent network activity.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>

                {/* 1. System Status Card */}
                <GlassCard title="System Status" icon={<Activity size={20} />}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '16px', borderRadius: '16px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 12px rgba(16, 185, 129, 0.5)' }} />
                        <div>
                            <p style={{ margin: 0, color: '#059669', fontWeight: 600, fontSize: '15px' }}>All Systems Operational</p>
                            <p style={{ margin: 0, color: '#475569', fontSize: '13px', marginTop: '4px' }}>Broker connection is stable.</p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginTop: 'auto' }}>
                        <ActionBtn primary icon={<RefreshCw size={16} />} label="Refresh Status" />
                        <ActionBtn icon={<Info size={16} />} label="View System Details" />
                        <ActionBtn icon={<Wifi size={16} />} label="Reconnect Broker" />
                    </div>
                </GlassCard>

                {/* 2. Device Summary Card */}
                <GlassCard title="Device Summary" icon={<Server size={20} />}>
                    <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '16px 0' }}>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ margin: 0, fontSize: '36px', fontWeight: 700, color: '#0f172a', fontFamily: "'Space Grotesk', sans-serif" }}>4</p>
                            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Total Devices</p>
                        </div>
                        <div style={{ width: '1px', height: '40px', background: 'rgba(0,0,0,0.1)' }} />
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ margin: 0, fontSize: '36px', fontWeight: 700, color: '#10b981', fontFamily: "'Space Grotesk', sans-serif" }}>3</p>
                            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Online Active</p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: 'auto' }}>
                        <div style={{ gridColumn: 'span 2' }}>
                            <ActionBtn primary icon={<List size={16} />} label="View All Devices" />
                        </div>
                        <ActionBtn icon={<Plus size={16} />} label="Add Devices" />
                        <ActionBtn icon={<Settings size={16} />} label="Manage" />
                        <div style={{ gridColumn: 'span 2' }}>
                            <ActionBtn icon={<Filter size={16} />} label="Filter Devices" />
                        </div>
                    </div>
                </GlassCard>

                {/* 3. Recent Activity Card */}
                <GlassCard title="Recent Activity" icon={<Clock size={20} />}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Mock Logs */}
                        {[
                            { msg: 'Node_Alpha connected successfully.', time: '2m ago', isOk: true },
                            { msg: 'New firmware OTA triggered for Node_X.', time: '1h ago', isOk: true },
                            { msg: 'Auth handshake failed for unknown MAC.', time: '3h ago', isOk: false }
                        ].map((log, i) => (
                            <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px', background: 'white', borderRadius: '12px', borderLeft: `3px solid ${log.isOk ? '#3b82f6' : '#ef4444'}`, border: '1px solid rgba(0,0,0,0.05)', borderLeftWidth: '3px' }}>
                                <div style={{ flex: 1 }}>
                                    <p style={{ margin: 0, fontSize: '14px', color: '#334155' }}>{log.msg}</p>
                                    <span style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>{log.time}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: 'auto' }}>
                        <div style={{ gridColumn: 'span 2' }}>
                            <ActionBtn primary icon={<FileText size={16} />} label="View Full Logs" />
                        </div>
                        <ActionBtn icon={<RefreshCw size={16} />} label="Refresh Activity" />
                        <ActionBtn icon={<Filter size={16} />} label="Filter" />
                        <div style={{ gridColumn: 'span 2' }}>
                            <ActionBtn icon={<Download size={16} />} label="Export Logs" />
                        </div>
                    </div>
                </GlassCard>

            </div>
        </motion.div>
    )
}

export default OverviewTab
