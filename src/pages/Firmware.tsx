import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, ArrowRight, Cpu, Globe, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import StickyFooter from '@/components/ui/footer';

const Firmware = () => {
    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const features = [
        {
            icon: <Shield className="w-6 h-6 text-blue-500" />,
            title: "Zero-Trust Protocol",
            desc: "Every node is verified using per-device certificates, ensuring no rogue hardware can join your network."
        },
        {
            icon: <Lock className="w-6 h-6 text-indigo-500" />,
            title: "mTLS v1.3 Encryption",
            desc: "Military-grade mutual TLS encryption for all telemetry and command traffic between edge and cloud."
        },
        {
            icon: <Cpu className="w-6 h-6 text-violet-500" />,
            title: "Hardware Optimized",
            desc: "Lightweight boilerplate optimized for secure enclaves and flash memory on constrained embedded hardware."
        },
        {
            icon: <Globe className="w-6 h-6 text-sky-500" />,
            title: "Global Edge Broker",
            desc: "Unified connectivity to the global SecureNodeX broker network with automatic failover."
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-500/30 overflow-x-hidden relative flex flex-col">
            <Header />

            {/* Background Effects matching Home */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-[120px] mix-blend-multiply" />
                <div className="absolute top-[20%] right-[-5%] w-[400px] h-[400px] bg-indigo-400/10 rounded-full blur-[100px] mix-blend-multiply" />
            </div>

            <main className="flex-1 relative z-10 pt-32 pb-20 px-6 max-w-6xl mx-auto w-full">
                <div className="grid lg:grid-cols-2 gap-16 items-center mb-24">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100/50 border border-indigo-200 text-indigo-700 text-xs font-bold tracking-widest uppercase font-mono">
                            Developer Tools
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black font-space-grotesk text-slate-900 tracking-tight mb-6">
                            Secure Firmware <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600">Integration</span>
                        </h1>
                        <p className="text-lg text-slate-500 font-kanit mb-8 leading-relaxed">
                            Connect your custom IoT hardware to the SecureNodeX zero-trust infrastructure in minutes. Our firmware boilerplate ensures that every node in your fleet is cryptographically verified before it can transmit a single byte of data.
                        </p>

                        <div className="flex flex-wrap gap-4">
                            <Link to="/login">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold font-space-grotesk flex items-center gap-3 shadow-xl shadow-slate-900/20"
                                >
                                    Access Integration Code <ArrowRight size={20} />
                                </motion.button>
                            </Link>
                            <Link to="/docs">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="px-8 py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl font-bold font-space-grotesk"
                                >
                                    Read API Docs
                                </motion.button>
                            </Link>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="relative"
                    >
                        {/* Fake Code Preview / Teaser */}
                        <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl p-8 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/80 to-slate-900 z-10" />

                            <div className="flex items-center gap-2 mb-8 relative z-0 opacity-40">
                                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                            </div>

                            <pre className="font-mono text-sm leading-relaxed text-slate-400 blur-[2px] select-none">
                                <code>
                                    {`#include <WiFiClientSecure.h>
#include <PubSubClient.h>

// SecureNodeX Device Integration Parameters
const char* manufacturer = "********";
const char* nodexcode    = "********";

void setup() {
  // Initializing Zero-Trust Auth...
  espClient.setCACert(root_ca);
  espClient.setCertificate(device_cert);
  
  // Handshake protocol v1.3
  client.setServer(mqtt_server, 8883);
}

void loop() {
  // Encrypted telemetry stream
  client.publish("secure/telemetry", data);
}`}
                                </code>
                            </pre>

                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-8 backdrop-blur-md bg-slate-900/40">
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 260,
                                        damping: 20,
                                        delay: 0.4
                                    }}
                                    className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-3xl flex items-center justify-center text-white mb-8 border border-white/20 shadow-2xl shadow-indigo-500/40 relative group"
                                >
                                    <div className="absolute inset-0 bg-white/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
                                    <Lock size={36} strokeWidth={2.5} className="relative z-10" />
                                </motion.div>

                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ duration: 0.5, delay: 0.6 }}
                                >
                                    <h3 className="text-3xl md:text-4xl font-black text-white font-space-grotesk mb-4 tracking-tight">
                                        Secure Access <br />
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-blue-300">Required</span>
                                    </h3>
                                    <p className="text-slate-200 font-kanit text-base max-w-[320px] mb-10 leading-relaxed opacity-90">
                                        Integration code and unique architecture identifiers are cryptographically protected. Please authenticate to access your personalized node boilerplate.
                                    </p>

                                    <Link to="/login">
                                        <motion.button
                                            whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(79, 70, 229, 0.4)" }}
                                            whileTap={{ scale: 0.95 }}
                                            className="bg-indigo-500 hover:bg-indigo-400 text-white px-10 py-4 rounded-2xl font-black font-space-grotesk transition-all shadow-xl shadow-indigo-500/30 border border-indigo-400/50 text-lg flex items-center gap-3 mx-auto"
                                        >
                                            Authenticate to View <ArrowRight size={20} />
                                        </motion.button>
                                    </Link>
                                </motion.div>
                            </div>
                        </div>

                        {/* Floating Micro-cards */}
                        <div className="absolute -bottom-6 -right-6 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3 z-30">
                            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                                <Zap size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest leading-none mb-1">Status</p>
                                <p className="text-sm font-bold text-slate-900 leading-none">mTLS Verified</p>
                            </div>
                        </div>
                    </motion.div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.4 + (i * 0.1) }}
                            className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 border border-slate-100 italic">
                                {feature.icon}
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 font-space-grotesk mb-3">{feature.title}</h4>
                            <p className="text-sm text-slate-500 font-kanit leading-relaxed">{feature.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </main>

            <div className="relative z-50 bg-slate-900 w-full mt-auto">
                <StickyFooter />
            </div>
        </div>
    );
};

export default Firmware;

