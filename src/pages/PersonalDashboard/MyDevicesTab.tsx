import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Server, Plus, RefreshCw, Search, Filter, ShieldCheck, PowerOff, RefreshCcw, Trash2, ChevronRight, CheckSquare, Settings } from 'lucide-react'
import { collection, query, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { edafApi } from '../../services/api'

// Reusable Action Button Component
const ActionBtn = ({ icon, label, primary = false, onClick, danger = false }: any) => (
    <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 14px',
            borderRadius: '10px',
            border: primary ? 'none' : '1px solid rgba(0,0,0,0.08)',
            background: primary ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : (danger ? 'rgba(239, 68, 68, 0.1)' : 'white'),
            color: primary ? 'white' : (danger ? '#ef4444' : '#334155'),
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
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

const MyDevicesTab = () => {
    const [selectedDevice, setSelectedDevice] = useState<any>(null);
    const [devices, setDevices] = useState<any[]>([]);

    useEffect(() => {
        const q = query(collection(db, 'devices'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedDevices: any[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                fetchedDevices.push({
                    id: doc.id,
                    name: data.id || 'Unnamed Device',
                    status: data.status === 'provisioned' ? 'online' : 'offline',
                    type: data.cert_type === 'ECC/SECP256R1' ? 'Secure Edge Node' : 'Unknown',
                    ip: data.ip || 'DHCP Pending',
                    certExpiry: 'Active'
                });
            });
            // If empty, supply a placeholder so the table isn't completely blank
            if (fetchedDevices.length === 0) {
                setDevices([
                    { id: 'pending', name: 'No Devices Found', status: 'offline', type: 'System', ip: '-', certExpiry: '-' }
                ]);
            } else {
                setDevices(fetchedDevices);
            }
        });
        return () => unsubscribe();
    }, []);

    // Handle Device Provisioning API Call
    const handleProvision = async () => {
        try {
            await edafApi.provisionDevice(selectedDevice.id);
            alert(`Device ${selectedDevice.name} provisioned successfully!`);
        } catch (error: any) {
            alert(`Provisioning Failed: ${error.message}`);
        }
    };

    // Render the Details Slide-over/Panel if a device is selected
    if (selectedDevice) {
        return (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={() => setSelectedDevice(null)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                        <ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} />
                    </button>
                    <div>
                        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', fontFamily: "'Space Grotesk', sans-serif", margin: 0 }}>
                            {selectedDevice.name}
                        </h2>
                        <span style={{ color: '#64748b', fontSize: '13px' }}>ID: {selectedDevice.id}</span>
                    </div>
                </div>

                <div style={{
                    background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(24px)', border: '1px solid rgba(0, 0, 0, 0.05)', borderRadius: '24px', padding: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.03)'
                }}>
                    <h3 style={{ fontSize: '16px', color: '#0f172a', marginBottom: '20px' }}>Device Actions</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                        <ActionBtn icon={<CheckSquare size={16} />} label="Provision Device" primary onClick={handleProvision} />
                        <ActionBtn icon={<ShieldCheck size={16} />} label="View Certificate" />
                        <ActionBtn icon={<RefreshCcw size={16} />} label="Reconnect Device" />
                        <ActionBtn icon={<Trash2 size={16} />} label="Remove Node" danger />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    {/* Placeholder stat blocks for the specific device */}
                    <div style={{ background: 'white', border: '1px solid rgba(0, 0, 0, 0.05)', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                        <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 8px 0' }}>IP Address</p>
                        <p style={{ color: '#0f172a', fontSize: '18px', fontWeight: 600, margin: 0 }}>{selectedDevice.ip}</p>
                    </div>
                    <div style={{ background: 'white', border: '1px solid rgba(0, 0, 0, 0.05)', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                        <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 8px 0' }}>Certificate Expiry</p>
                        <p style={{ color: '#0f172a', fontSize: '18px', fontWeight: 600, margin: 0 }}>{selectedDevice.certExpiry}</p>
                    </div>
                </div>
            </motion.div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em', margin: 0 }}>
                        My Devices
                    </h2>
                    <p style={{ color: '#475569', marginTop: '8px', fontSize: '15px' }}>
                        Manage, monitor, and configure all edge endpoints securely connected to the broker.
                    </p>
                </div>

                {/* Global Actions Toolbar */}
                <div style={{ display: 'flex', gap: '12px' }}>
                    <ActionBtn icon={<Plus size={16} />} label="Add Device" primary />
                    <ActionBtn icon={<Settings size={16} />} label="Bulk Actions" />
                </div>
            </div>

            {/* List Header and Controls */}
            <div style={{
                background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(24px)', border: '1px solid rgba(0, 0, 0, 0.05)', borderRadius: '24px', padding: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.03)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div style={{ position: 'relative', width: '300px' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type="text"
                            placeholder="Search devices..."
                            style={{
                                width: '100%', background: 'white', border: '1px solid rgba(0,0,0,0.08)',
                                borderRadius: '12px', padding: '10px 12px 10px 36px', color: '#0f172a', fontSize: '14px', outline: 'none'
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <ActionBtn icon={<RefreshCw size={16} />} label="Refresh List" />
                        <ActionBtn icon={<Filter size={16} />} label="Filter" />
                    </div>
                </div>

                {/* Data Table */}
                <div style={{ width: '100%', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', color: '#64748b', fontSize: '13px' }}>
                                <th style={{ padding: '16px', fontWeight: 500 }}>Device Name & ID</th>
                                <th style={{ padding: '16px', fontWeight: 500 }}>Status</th>
                                <th style={{ padding: '16px', fontWeight: 500 }}>Type</th>
                                <th style={{ padding: '16px', fontWeight: 500, textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {devices.map((dev: any) => (
                                <tr key={dev.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ color: '#0f172a', fontWeight: 500, fontSize: '15px' }}>{dev.name}</div>
                                        <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>{dev.id}</div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <span style={{
                                            padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
                                            background: dev.status === 'online' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                            color: dev.status === 'online' ? '#059669' : '#dc2626'
                                        }}>
                                            {dev.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px', color: '#475569', fontSize: '14px' }}>
                                        {dev.type}
                                    </td>
                                    <td style={{ padding: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                        <ActionBtn icon={<Server size={14} />} label="View" onClick={() => setSelectedDevice(dev)} />
                                        <ActionBtn icon={<PowerOff size={14} />} label="Disable" danger />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </motion.div>
    )
}

export default MyDevicesTab
