import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Terminal, Send, Square, RotateCcw, Trash2, RefreshCw, Activity, Server, Radio, Zap } from 'lucide-react'
import { edafApi } from '../../services/api'

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
const ActionBtn = ({ icon, label, primary = false, danger = false, onClick, disabled }: any) => (
    <motion.button
        onClick={onClick}
        disabled={disabled}
        whileHover={disabled ? {} : { scale: 1.02 }}
        whileTap={disabled ? {} : { scale: 0.98 }}
        style={{
            opacity: disabled ? 0.6 : 1,
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 16px',
            borderRadius: '12px',
            border: primary ? 'none' : '1px solid rgba(0,0,0,0.08)',
            background: primary ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : (danger ? 'rgba(239, 68, 68, 0.1)' : 'white'),
            color: primary ? 'white' : (danger ? '#ef4444' : '#334155'),
            fontSize: '14px',
            fontWeight: 500,
            cursor: disabled ? 'not-allowed' : 'pointer',
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

const DeviceControlTab = () => {
    const [command, setCommand] = useState('');
    const [terminalLogs, setTerminalLogs] = useState([
        { type: 'info', text: 'Broker connection initialized on port 8883.' },
        { type: 'success', text: 'Subscribed to topic: edaf/devices/+/control' }
    ]);
    const [isPublishing, setIsPublishing] = useState(false);
    const activeDevice = 'Node_Alpha'; // hardcoded selected device for now

    const handlePublish = async (cmdPayload: string) => {
        if (!cmdPayload.trim()) return;
        setIsPublishing(true);

        // Add optimistic log
        const timestamp = new Date().toLocaleTimeString([], { hour12: false });
        setTerminalLogs(prev => [...prev, { type: 'tx', text: `[${timestamp}] TX: ${cmdPayload} -> edaf/devices/${activeDevice}/control` }]);

        try {
            await edafApi.publishCommand(activeDevice, cmdPayload);
            setTerminalLogs(prev => [...prev, { type: 'rx', text: `[${new Date().toLocaleTimeString([], { hour12: false })}] RX: ACK Server Deliverery Confirmed` }]);
            setCommand('');
        } catch (error: any) {
            setTerminalLogs(prev => [...prev, { type: 'error', text: `[ERROR]: ${error.message}` }]);
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
        >
            <div style={{ marginBottom: '8px' }}>
                <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em', margin: 0 }}>
                    Device Control
                </h2>
                <p style={{ color: '#475569', marginTop: '8px', fontSize: '15px' }}>
                    Operate verified devices, inject MQTT payloads, and monitor real-time command execution.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(400px, 2fr)', gap: '24px' }}>

                {/* Left Column: Device Selection & Status */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* 1. Verified Device List */}
                    <GlassCard title="Verified Devices" icon={<Server size={20} />}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {['Node_Alpha', 'Node_X_Router'].map((dev, i) => (
                                <div key={i} style={{ padding: '12px 16px', background: i === 0 ? 'rgba(99, 102, 241, 0.1)' : 'white', border: i === 0 ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid rgba(0,0,0,0.05)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                    <div>
                                        <p style={{ margin: 0, color: '#0f172a', fontSize: '15px', fontWeight: 500 }}>{dev}</p>
                                        <p style={{ margin: 0, color: '#64748b', fontSize: '12px', marginTop: '2px' }}>mTLS Verified</p>
                                    </div>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px rgba(16, 185, 129, 0.5)' }} />
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginTop: 'auto' }}>
                            <ActionBtn icon={<RefreshCw size={16} />} label="Refresh List" />
                        </div>
                    </GlassCard>

                    {/* 2. Live Status Indicator */}
                    <GlassCard title="Live Link Status" icon={<Activity size={20} />}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', padding: '24px 0', borderBottom: '1px dashed rgba(0,0,0,0.1)' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ width: '48px', height: '48px', margin: '0 auto 8px', background: 'rgba(16, 185, 129, 0.1)', color: '#059669', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Radio size={24} />
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>Ping</div>
                                <div style={{ fontSize: '18px', color: '#0f172a', fontWeight: 600 }}>12ms</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ width: '48px', height: '48px', margin: '0 auto 8px', background: 'rgba(99, 102, 241, 0.1)', color: '#4f46e5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Zap size={24} />
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>Load</div>
                                <div style={{ fontSize: '18px', color: '#0f172a', fontWeight: 600 }}>4%</div>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginTop: 'auto', paddingTop: '16px' }}>
                            <ActionBtn icon={<Radio size={16} />} label="Ping Device" onClick={() => handlePublish("PING")} disabled={isPublishing} />
                            <ActionBtn icon={<RotateCcw size={16} />} label="Force Reconnect" onClick={() => handlePublish("RESTART_WIFI")} disabled={isPublishing} />
                        </div>
                    </GlassCard>

                </div>

                {/* Right Column: 3. MQTT Command Monitor */}
                <GlassCard title="MQTT Command Terminal" icon={<Terminal size={20} />}>

                    {/* Terminal Window */}
                    <div style={{
                        flex: 1, minHeight: '300px', background: '#09090b', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)',
                        padding: '16px', display: 'flex', flexDirection: 'column', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px'
                    }}>
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {terminalLogs.map((log, i) => {
                                let color = '#cbd5e1';
                                if (log.type === 'info') color = '#94a3b8';
                                if (log.type === 'success') color = '#34d399';
                                if (log.type === 'tx') color = '#818cf8';
                                if (log.type === 'rx') color = '#cbd5e1';
                                if (log.type === 'error') color = '#ef4444';

                                return (
                                    <div key={i} style={{ color }}>&gt; {log.text}</div>
                                )
                            })}

                            {/* Blinking cursor */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6366f1', marginTop: '8px' }}>
                                &gt; <span style={{ width: '8px', height: '16px', background: '#6366f1', animation: 'blink 1s step-end infinite' }} />
                            </div>
                        </div>

                        {/* Status bar */}
                        <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '11px' }}>
                            <span>Topic: device/Node_Alpha/tx</span>
                            <span>QoS: 1</span>
                        </div>
                    </div>

                    {/* Input & Controls */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
                        <input
                            type="text"
                            value={command}
                            onChange={(e) => setCommand(e.target.value)}
                            placeholder="Enter MQTT payload (e.g., {'cmd': 'reboot'})"
                            style={{
                                width: '100%', background: 'white', border: '1px solid rgba(0,0,0,0.1)',
                                padding: '14px 16px', borderRadius: '12px', color: '#0f172a', fontSize: '14px', outline: 'none',
                                fontFamily: "'JetBrains Mono', monospace", boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                            }}
                        />
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ flex: 1 }}>
                                <ActionBtn primary icon={<Send size={16} />} label={isPublishing ? "Sending..." : "Publish Payload"} onClick={() => handlePublish(command)} disabled={isPublishing || !command.trim()} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <ActionBtn danger icon={<Square size={16} />} label="Stop Flow" onClick={() => handlePublish("EMERGENCY_STOP")} disabled={isPublishing} />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                            <ActionBtn icon={<RotateCcw size={16} />} label="Reset Node" onClick={() => handlePublish("REBOOT_NODE")} disabled={isPublishing} />
                            <ActionBtn icon={<Trash2 size={16} />} label="Clear Buffer" onClick={() => setTerminalLogs([])} />
                            <ActionBtn icon={<RefreshCw size={16} />} label="Refresh Terminal" />
                        </div>
                    </div>
                </GlassCard>

            </div>
        </motion.div>
    )
}

export default DeviceControlTab
