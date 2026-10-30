"use client";

import { motion } from "framer-motion";
import {
    ShieldCheck,
    Zap,
    Globe,
    Check,
    X,
    Cpu as Hardware,
    Terminal,
    Network,
    Container
} from "lucide-react";


const comparisonData = [
    { feature: 'Device Authentication', legacy: 'Passwords/Shared Keys', nodex: 'Unique Device Identity' },
    { feature: 'Credential Management', legacy: 'Hardcoded/Manual', nodex: 'Automated & Secure' },
    { feature: 'Device Provisioning', legacy: 'Manual', nodex: 'Automated' },
    { feature: 'Security Level', legacy: 'Weak to Moderate', nodex: 'Military-Grade (Encrypted)' },
    { feature: 'Access Control', legacy: 'Limited/Static', nodex: 'Controlled & Restricted' },
    { feature: 'Vendor Lock-In', legacy: 'High (Proprietary)', nodex: 'Low (Open-Source Core)' },
    { feature: 'Suitability for IoT', legacy: 'Poor (High Overhead)', nodex: 'High (Optimized)' }
];

const ProposedSystem = () => {
    return (
        <section className="py-32 bg-slate-900 relative overflow-hidden text-white selection:bg-blue-500/30">
            {/* Dynamic Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] opacity-40 animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[100px] opacity-40 animate-pulse delay-1000" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20" />
            </div>

            <div className="container mx-auto px-4 md:px-8 relative z-10">

                {/* Proposed System Header */}
                <div className="text-center mb-24 relative">
                    <div className="relative">

                        <h2 className="text-6xl md:text-8xl font-black font-space-grotesk tracking-tighter leading-[0.9] drop-shadow-2xl relative inline-block">
                            <span className="absolute -left-8 top-0 text-blue-500/20 text-4xl font-mono hidden md:block">[</span>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-500 animate-gradient-x">Secure</span>
                            <span className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">NodeX</span>
                            <span className="absolute -right-8 bottom-0 text-blue-500/20 text-4xl font-mono hidden md:block">]</span>
                        </h2>

                        <p className="text-xl md:text-2xl text-slate-300 font-sans font-light mt-8 max-w-3xl mx-auto leading-relaxed drop-shadow-sm">
                            Designed to overcome the security limitations of existing IoT systems by providing a <span className="text-blue-300 font-normal">secure</span>, <span className="text-indigo-300 font-normal">automated</span>, and <span className="text-blue-300 font-normal">scalable</span> device authentication framework.
                        </p>
                    </div>
                </div>

                {/* Core Capabilities Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-32">
                    {[
                        { label: 'Identity', value: 'Unique Identity', desc: 'Zero-Touch Provisioning', icon: <Zap className="w-32 h-32" />, span: 'md:col-span-4' },
                        { label: 'Communication', value: 'Encrypted', desc: 'Absolute Confidentiality', icon: <ShieldCheck className="w-24 h-24" />, span: 'md:col-span-2' },
                        { label: 'Access', value: 'Granular', desc: 'Micro-Segmentation', icon: <Container className="w-24 h-24" />, span: 'md:col-span-2' },
                        { label: 'Deployment', value: 'Agnostic', desc: 'Seamless Edge-to-Cloud', icon: <Globe className="w-32 h-32" />, span: 'md:col-span-4' }
                    ].map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                            whileHover={{ y: -5, scale: 1.02 }}
                            className={`${stat.span} relative bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-[2rem] p-10 overflow-hidden group hover:border-blue-500/50 transition-all duration-500`}
                        >
                            {/* Holographic Noise & Gradient */}
                            <div className="absolute inset-0 bg-grid-white/[0.02] [mask-image:linear-gradient(to_bottom,transparent,black)]" />
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            {/* Watermark Icon */}
                            <div className="absolute -right-4 -bottom-4 text-white/5 rotate-[-15deg] group-hover:scale-110 group-hover:rotate-0 transition-transform duration-700 ease-out">{stat.icon}</div>

                            <div className="relative z-10">
                                <div className="text-blue-400 font-mono text-xs mb-2 tracking-widest uppercase flex items-center gap-2">
                                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                    {stat.label}
                                </div>
                                <div className="text-5xl md:text-6xl font-space-grotesk font-black text-white mb-4 tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-cyan-300 transition-all duration-300">
                                    {stat.value}
                                </div>
                                <div className="text-slate-400 font-medium">{stat.desc}</div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Vision Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-32 items-center">
                    <div>
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.7 }}
                        >
                            <span className="text-blue-400 font-bold tracking-[0.2em] text-sm uppercase flex items-center gap-3">
                                <span className="w-8 h-[1px] bg-blue-500/50" />
                                Our Vision
                            </span>
                            <h2 className="text-5xl md:text-7xl font-black font-space-grotesk tracking-tighter mt-6 mb-8 leading-[1.0] drop-shadow-xl">
                                A Future Where <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Trust</span> Is Absolute.
                            </h2>
                            <p className="text-lg text-slate-300 font-kanit font-light leading-relaxed mb-10 border-l-2 border-blue-500/30 pl-6">
                                We envision a world where every connected device, from critical infrastructure to personal wearables, can cryptographically prove its identity and integrity without human intervention.
                            </p>
                        </motion.div>

                        <div className="space-y-4">
                            {[
                                { icon: <ShieldCheck className="w-6 h-6" />, title: 'Uncompromised Security', desc: 'Eliminating attack vectors at the source.' },
                                { icon: <Zap className="w-6 h-6" />, title: 'Seamless Integration', desc: 'Plug-and-play security for any ecosystem.' },
                                { icon: <Globe className="w-6 h-6" />, title: 'Global Scalability', desc: 'Securing billions of devices effortlessly.' }
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: 0.2 + (i * 0.1) }}
                                    whileHover={{ x: 10, backgroundColor: "rgba(255,255,255,0.03)" }}
                                    className="flex items-start gap-5 p-5 rounded-2xl hover:border-slate-600/50 transition-all border border-transparent"
                                >
                                    <div className="text-blue-400 shrink-0 p-3 bg-blue-500/10 rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.15)]">{item.icon}</div>
                                    <div>
                                        <h3 className="text-xl font-bold font-space-grotesk text-white mb-1 group-hover:text-blue-300 transition-colors">{item.title}</h3>
                                        <p className="text-slate-400 text-sm">{item.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="relative lg:pl-10"
                    >
                        {/* Outer Glow */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-blue-600/20 blur-[100px] rounded-full pointer-events-none" />

                        {/* Glass Container */}
                        <div className="relative aspect-square rounded-[3rem] border border-white/10 bg-slate-900/40 backdrop-blur-2xl overflow-hidden shadow-2xl flex items-center justify-center group">

                            {/* Animated Grid Background */}
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000_40%,transparent_100%)] transition-transform duration-1000 group-hover:scale-105" />

                            {/* Rotating Outer Rings */}
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                                className="absolute w-[80%] h-[80%] border border-blue-500/20 rounded-full border-dashed"
                            />
                            <motion.div
                                animate={{ rotate: -360 }}
                                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                                className="absolute w-[60%] h-[60%] border border-indigo-400/20 rounded-full border-[3px] border-dotted"
                            />

                            {/* Center Shield Core */}
                            <motion.div
                                animate={{
                                    boxShadow: ['0 0 30px rgba(59,130,246,0.2)', '0 0 60px rgba(59,130,246,0.5)', '0 0 30px rgba(59,130,246,0.2)']
                                }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="relative z-10 w-40 h-40 bg-slate-950/80 backdrop-blur-md rounded-full border border-blue-500/30 flex items-center justify-center p-8 group-hover:border-blue-400/60 transition-colors duration-500"
                            >
                                <div className="absolute inset-0 bg-blue-500/10 rounded-full animate-pulse" />
                                <ShieldCheck className="w-full h-full text-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] relative z-10" />

                                {/* Inner scanning line */}
                                <div className="absolute inset-0 overflow-hidden rounded-full z-20 pointer-events-none">
                                    <motion.div
                                        animate={{ top: ['-20%', '120%'] }}
                                        transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                                        className="absolute left-0 w-full h-[2px] bg-blue-400/50 shadow-[0_0_10px_#60a5fa] blur-[1px]"
                                    />
                                </div>
                            </motion.div>

                            {/* Static Floating Nodes */}
                            {[
                                { icon: <Hardware size={24} />, pos: "top-[20%] left-[20%]", delay: 0 },
                                { icon: <Globe size={24} />, pos: "top-[20%] left-[80%]", delay: 0.5 },
                                { icon: <Zap size={24} />, pos: "top-[80%] left-[20%]", delay: 1.0 },
                                { icon: <Network size={24} />, pos: "top-[80%] left-[80%]", delay: 1.5 }
                            ].map((node, i) => (
                                <motion.div
                                    key={i}
                                    className={`absolute ${node.pos} -translate-x-1/2 -translate-y-1/2 z-20`}
                                    initial={{ opacity: 0, scale: 0 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.5 + node.delay, type: "spring", stiffness: 200, damping: 20 }}
                                >
                                    <motion.div
                                        animate={{ y: [0, -10, 0] }}
                                        transition={{ duration: 4, repeat: Infinity, delay: node.delay, ease: "easeInOut" }}
                                        className="w-14 h-14 rounded-2xl bg-slate-800/90 border border-slate-700 backdrop-blur-md flex items-center justify-center text-blue-100 shadow-[0_0_30px_rgba(0,0,0,0.5)] relative overflow-hidden group/node"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent opacity-0 group-hover/node:opacity-100 transition-opacity" />
                                        {node.icon}
                                    </motion.div>
                                </motion.div>
                            ))}

                            {/* Connecting SVG Lines */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" style={{ filter: "drop-shadow(0 0 8px rgba(59,130,246,0.3))" }}>
                                <motion.line x1="20%" y1="20%" x2="50%" y2="50%" stroke="rgba(59,130,246,0.4)" strokeWidth="2" strokeDasharray="6 6" animate={{ strokeDashoffset: [0, -24] }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
                                <motion.line x1="80%" y1="20%" x2="50%" y2="50%" stroke="rgba(59,130,246,0.4)" strokeWidth="2" strokeDasharray="6 6" animate={{ strokeDashoffset: [0, 24] }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
                                <motion.line x1="20%" y1="80%" x2="50%" y2="50%" stroke="rgba(59,130,246,0.4)" strokeWidth="2" strokeDasharray="6 6" animate={{ strokeDashoffset: [0, 24] }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
                                <motion.line x1="80%" y1="80%" x2="50%" y2="50%" stroke="rgba(59,130,246,0.4)" strokeWidth="2" strokeDasharray="6 6" animate={{ strokeDashoffset: [0, -24] }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
                            </svg>

                        </div>
                    </motion.div>
                </div>

                {/* The Edge / Comparison Table */}
                <div className="mb-32">
                    <div className="text-center mb-16">
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-4xl md:text-5xl font-black font-space-grotesk text-white drop-shadow-lg"
                        >
                            The Edge
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="text-slate-400 mt-4 text-lg"
                        >
                            Why SecureNodeX outperforms legacy IoT security.
                        </motion.p>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-xl rounded-[2.5rem] overflow-hidden shadow-2xl relative"
                    >
                        <div className="absolute inset-0 bg-blue-500/5 pointer-events-none mix-blend-overlay" />
                        <div className="overflow-x-auto relative z-10 w-full max-w-4xl mx-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="p-6 text-slate-400 uppercase text-xs font-bold tracking-widest w-2/5">Feature</th>
                                        <th className="p-6 text-slate-400 uppercase text-xs font-bold tracking-widest w-1/4">Legacy</th>
                                        <th className="p-6 text-blue-500 uppercase text-xs font-bold tracking-widest w-1/3">Secure</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {comparisonData.map((row, i) => (
                                        <tr key={i} className="border-b border-white/5 last:border-0 pointer-events-none">
                                            <td className="p-6 font-semibold text-white font-space-grotesk text-lg">{row.feature}</td>
                                            <td className="p-6 text-slate-400 text-sm flex items-center gap-3">
                                                <X className="w-4 h-4 text-red-500 shrink-0" />
                                                <span className="font-medium">{row.legacy}</span>
                                            </td>
                                            <td className="p-6 text-blue-200 text-sm relative">
                                                <div className="flex items-center gap-3">
                                                    <Check className="w-4 h-4 text-green-400 shrink-0" />
                                                    <span className="font-medium">{row.nodex}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                </div>

                {/* Technical Stack */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                    <div>
                        <motion.span
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            className="text-blue-400 font-bold tracking-[0.2em] text-sm uppercase flex items-center gap-3"
                        >
                            <span className="w-8 h-[1px] bg-blue-500/50" />
                            Architecture
                        </motion.span>
                        <motion.h2
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="text-4xl md:text-5xl font-black font-space-grotesk text-white mt-6 mb-8 drop-shadow-lg"
                        >
                            Secure Implementation
                        </motion.h2>
                        <p className="text-xl text-slate-300 font-kanit font-light leading-relaxed mb-10">
                            Utilizing advanced cryptography for absolute confidentiality. Modular, scalable, and optimized for high-performance IoT environments.
                        </p>

                        <div className="grid grid-cols-2 gap-8">
                            {[
                                { icon: <Hardware size={24} />, title: 'Edge Node', text: 'Hardware Layer' },
                                { icon: <Terminal size={24} />, title: 'Core Logic', text: 'Backend Logic' },
                                { icon: <Network size={24} />, title: 'Encrypted Channel', text: 'Secure Transport' },
                                { icon: <Container size={24} />, title: 'Isolated Runtime', text: 'Containerization' }
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.4, delay: i * 0.1 }}
                                    whileHover={{ x: 5 }}
                                    className="flex items-center gap-5 group cursor-default"
                                >
                                    <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-xl group-hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] border border-slate-700 group-hover:border-blue-500">
                                        {item.icon}
                                    </div>
                                    <div>
                                        <div className="font-bold text-white font-space-grotesk text-lg group-hover:text-blue-300 transition-colors">{item.title}</div>
                                        <div className="text-slate-500 text-xs font-mono">{item.text}</div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="relative"
                    >
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 rounded-[2.2rem] opacity-30 blur-lg animate-pulse" />
                        <div className="bg-slate-950/90 rounded-[2rem] border border-slate-800 p-8 font-mono text-sm leading-relaxed text-slate-300 shadow-2xl relative overflow-hidden backdrop-blur-xl">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500" />

                            <div className="flex gap-2 mb-8 items-center border-b border-slate-800 pb-4">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                                </div>
                                <div className="ml-auto text-xs text-slate-600">secure_handshake.ts</div>
                            </div>

                            <div className="space-y-4 opacity-90 font-medium">
                                <p><span className="text-purple-400">const</span> <span className="text-yellow-200">secureConnect</span> <span className="text-slate-500">=</span> <span className="text-purple-400">async</span> (device) <span className="text-purple-400">=&gt;</span> &#123;</p>
                                <p className="pl-6 text-slate-500 italic">// 1. Verify device signature</p>
                                <p className="pl-6"><span className="text-purple-400">const</span> signature <span className="text-slate-500">=</span> <span className="text-blue-400">await</span> crypto.<span className="text-blue-300">verify</span>(device.key);</p>
                                <p className="pl-6"><span className="text-purple-400">if</span> (!signature) <span className="text-purple-400">align</span> <span className="text-red-400">throw</span> <span className="text-yellow-200">SecurityError</span>();</p>
                                <br />
                                <p className="pl-6 text-slate-500 italic">// 2. Establish Secure Tunnel</p>
                                <p className="pl-6"><span className="text-purple-400">return</span> <span className="text-blue-400">new</span> <span className="text-yellow-200">SecureTunnel</span>(device.id);</p>
                                <p>&#125;</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export { ProposedSystem };
