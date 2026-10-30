import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Key, RefreshCw, Activity, Link, ShieldAlert, Download, Copy, Play, CheckCircle2, Cpu } from 'lucide-react'
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

const AuthenticationTab = () => {
    const [isProvisioning, setIsProvisioning] = useState(false);
    const [deviceCert, setDeviceCert] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const firmwareSnippet = `#include <WiFiClientSecure.h>
#include <PubSubClient.h>

// SecureNodeX Device Integration Parameters
const char* manufacturer = "ACME_Corp";       // Manufacturer Name
const char* nodexcode    = "NX-9921A";        // Manufacturer's NodeX Code
const char* modelxcode   = "SENSOR-V2";       // Manufacturer's Model Code

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Trinetra Backend Mosquitto Broker endpoint
const char* mqtt_server = "broker.securenodex.com";
const int mqtt_port = 8883; // mTLS enforced securely

WiFiClientSecure espClient;
PubSubClient client(espClient);

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

void setup() {
  Serial.begin(115200);
  setup_wifi();
  
  // SecureNodeX mTLS provisioning certificates.
  // These should be loaded from the secure enclave or flash memory.
  // espClient.setCACert(root_ca);
  // espClient.setCertificate(device_cert);
  // espClient.setPrivateKey(device_key);

  client.setServer(mqtt_server, mqtt_port);
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting Secure MQTT connection...");
    
    // Create a robust unique connection ID based on manufacturer namespace
    String clientId = String(manufacturer) + "-" + String(modelxcode) + "-";
    clientId += String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str())) {
      Serial.println("connected to SecureNodeX");
      
      // Auto-subscribe to the required authenticated namespace limits
      String commandTopic = String("securenodex/") + manufacturer + "/" + nodexcode + "/commands";
      client.subscribe(commandTopic.c_str());
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();
  
  // Custom manufacturing and telemetry logic here
  // ...
}`;

    const handleCopySnippet = () => {
        navigator.clipboard.writeText(firmwareSnippet);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownloadSnippet = (type: 'ino' | 'json') => {
        let textContent = firmwareSnippet;

        if (type === 'json') {
            textContent = JSON.stringify({
                version: "1.0.0",
                compatibility: ["ARM_M4", "RISC-V"],
                config: {
                    manufacturer: "ACME_Corp",
                    nodexcode: "NX-9921A",
                    modelxcode: "SENSOR-V2"
                },
                source: firmwareSnippet
            }, null, 2);
        }

        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `securenodex_snippet.${type}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleProvisionDevice = async () => {
        setIsProvisioning(true);
        try {
            const deviceId = `NODE_${Math.floor(Math.random() * 1000)}`;
            const result = await edafApi.provisionDevice(deviceId);
            setDeviceCert(result.credentials.certificate);
        } catch (error) {
            console.error("Provisioning failed:", error);
            alert("Failed to provision device. Check console for details.");
        } finally {
            setIsProvisioning(false);
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
                    Authentication
                </h2>
                <p style={{ color: '#475569', marginTop: '8px', fontSize: '15px' }}>
                    Manage mTLS certificates, verify device handshakes, and oversee connection security.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>

                {/* 1. Authentication Method */}
                <GlassCard title="Authentication Method" icon={<Shield size={20} />}>
                    <div style={{ padding: '16px', background: 'white', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)' }}>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>Current Protocol</p>
                        <p style={{ margin: '8px 0 0', color: '#0f172a', fontSize: '18px', fontWeight: 600 }}>Mutual TLS (mTLS) v1.3</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px rgba(16, 185, 129, 0.5)' }} />
                            <span style={{ color: '#059669', fontSize: '13px', fontWeight: 500 }}>Enforcing Strict Mode</span>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginTop: 'auto' }}>
                        <ActionBtn primary icon={<Play size={16} />} label="Test Authentication" />
                        <ActionBtn icon={<Shield size={16} />} label={isProvisioning ? "Provisioning..." : "Provision New Device"} onClick={handleProvisionDevice} disabled={isProvisioning} />
                        <ActionBtn icon={<RefreshCw size={16} />} label="Refresh Status" />
                    </div>
                </GlassCard>

                {/* 2. Certificate Status */}
                <GlassCard title="Certificate Status" icon={<Key size={20} />}>
                    <div style={{ padding: '16px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '16px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                        <p style={{ margin: 0, color: '#d97706', fontSize: '13px', fontWeight: 600 }}>Attention Required</p>
                        <p style={{ margin: '4px 0 0', color: '#334155', fontSize: '14px' }}>1 certificate expiring within 30 days. Auto-renewal is standby.</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: 'auto' }}>
                        <div style={{ gridColumn: 'span 2' }}>
                            <ActionBtn primary icon={<RefreshCw size={16} />} label="Renew Certificate" />
                        </div>
                        <ActionBtn icon={<Key size={16} />} label="Check Validity" />
                        <ActionBtn icon={<RefreshCw size={16} />} label="Refresh Status" />
                        <div style={{ gridColumn: 'span 2' }}>
                            <ActionBtn danger icon={<ShieldAlert size={16} />} label="Revoke Certificate" />
                        </div>
                    </div>
                </GlassCard>

                {/* 3. Handshake Status */}
                <GlassCard title="Handshake Logs" icon={<Activity size={20} />}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '120px', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
                        <div style={{ fontSize: '12px', color: '#64748b', fontFamily: "'JetBrains Mono', monospace" }}>[10:24:12] CH -&gt; SecureNode_01</div>
                        <div style={{ fontSize: '12px', color: '#059669', fontFamily: "'JetBrains Mono', monospace" }}>[10:24:12] SH &lt;- TLS 1.3 Accepted</div>
                        <div style={{ fontSize: '12px', color: '#64748b', fontFamily: "'JetBrains Mono', monospace" }}>[10:24:13] CERT Auth Validated</div>
                        <div style={{ fontSize: '12px', color: '#4f46e5', fontFamily: "'JetBrains Mono', monospace" }}>[10:24:13] Secured MQTT Tunnel Established</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: 'auto' }}>
                        <ActionBtn primary icon={<Link size={16} />} label="Retry Handshake" />
                        <ActionBtn icon={<Link size={16} />} label="Reconnect Device" />
                        <div style={{ gridColumn: 'span 2' }}>
                            <ActionBtn icon={<RefreshCw size={16} />} label="Refresh Status" />
                        </div>
                    </div>
                </GlassCard>

                {/* 4. Certificate Viewer */}
                <GlassCard title="Certificate Viewer" icon={<Key size={20} />}>
                    <div style={{ padding: '16px', background: '#e2e8f0', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#475569', height: '100px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                        {deviceCert || "-----BEGIN CERTIFICATE-----\nWaiting for Device Provisioning...\n-----END CERTIFICATE-----"}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: 'auto' }}>
                        <div style={{ gridColumn: 'span 2' }}>
                            <ActionBtn primary icon={<Key size={16} />} label="Verify Fingerprint" />
                        </div>
                        <ActionBtn icon={<Download size={16} />} label="Download" />
                        <ActionBtn icon={<Copy size={16} />} label="Copy Cert" />
                    </div>
                </GlassCard>

                {/* 5. Firmware Integration Boilerplate */}
                <GlassCard title="Firmware Boilerplate" icon={<Cpu size={20} />} className="md:col-span-2">
                    <div style={{ position: 'relative' }}>
                        <div style={{
                            padding: '20px',
                            background: '#0d1117',
                            borderRadius: '16px',
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: '12px',
                            color: '#e6edf3',
                            maxHeight: '300px',
                            overflowY: 'auto',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <pre style={{ margin: 0 }}>
                                <code>
                                    {firmwareSnippet.split('\n').map((line, i) => {
                                        // Basic inline highlighting
                                        if (line.trim().startsWith('//')) return <div key={i} style={{ color: '#8b949e', fontStyle: 'italic' }}>{line}</div>
                                        if (line.startsWith('#include')) return <div key={i} style={{ color: '#ff7b72' }}>{line}</div>
                                        return <div key={i}>{line || ' '}</div>
                                    })}
                                </code>
                            </pre>
                        </div>
                        <div style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            display: 'flex',
                            gap: '8px'
                        }}>
                            <button
                                onClick={() => handleDownloadSnippet('ino')}
                                style={{ padding: '8px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }}
                                title="Download .ino"
                            >
                                <Download size={14} />
                            </button>
                            <button
                                onClick={handleCopySnippet}
                                style={{
                                    padding: '8px 12px',
                                    background: copied ? '#10b981' : 'rgba(255,255,255,0.1)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    transition: 'all 0.2s'
                                }}
                            >
                                {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                    </div>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
                        Flash this boilerplate to your hardware node to enable zero-touch mTLS provisioning. Ensure your manufacturer codes match your profile settings.
                    </p>
                </GlassCard>

            </div>
        </motion.div>
    )
}

export default AuthenticationTab
