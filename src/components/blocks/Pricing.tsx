import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Server, Crown, Terminal, Shield, Network } from 'lucide-react';
import { Link } from 'react-router-dom';

const Pricing = () => {
    const [isYearly, setIsYearly] = useState(true);

    return (
        <section className="py-32 bg-white text-slate-900 font-sans selection:bg-blue-500/30 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-100/50 rounded-full blur-[120px] opacity-60 animate-pulse" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-50" />
            </div>

            <div className="max-w-[1400px] mx-auto px-4 md:px-8 relative z-10">

                {/* Header */}
                <div className="text-center mb-20 relative">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-5xl md:text-7xl font-black font-space-grotesk tracking-tighter mb-8 drop-shadow-sm">
                            Simple <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Pricing</span>
                        </h2>
                        <p className="text-xl text-slate-600 max-w-2xl mx-auto font-light">
                            Military-grade IoT security scaled perfectly for your deployment.
                        </p>
                    </motion.div>

                    {/* Toggle Switch */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="flex items-center justify-center gap-6 text-sm font-medium mt-12 bg-white p-2 rounded-full inline-flex border border-slate-200 shadow-sm mx-auto"
                    >
                        <span className={`${!isYearly ? "text-slate-900 font-bold" : "text-slate-500"} transition-colors px-4`}>Monthly</span>
                        <button
                            onClick={() => setIsYearly(!isYearly)}
                            className="w-16 h-8 bg-slate-100 rounded-full relative transition-colors duration-300 focus:outline-none border border-slate-200 shadow-inner"
                        >
                            <motion.div
                                className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full absolute top-[3px] shadow-sm"
                                animate={{ left: isYearly ? "36px" : "4px" }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                        </button>
                        <div className="flex items-center gap-2 pr-2">
                            <span className={`${isYearly ? "text-slate-900 font-bold" : "text-slate-500"} transition-colors`}>Yearly</span>
                            <span className="bg-blue-50 text-blue-600 border border-blue-200 text-xs px-3 py-1 rounded-full font-bold tracking-wide">Save 20%</span>
                        </div>
                    </motion.div>
                </div>

                {/* Pricing Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">

                    {/* Basic Plan */}
                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all relative group">
                        <div className="flex items-center gap-2 text-blue-600 text-xs font-bold uppercase tracking-widest mb-4">
                            <Terminal className="w-4 h-4" /> Developer
                        </div>
                        <h3 className="text-3xl font-bold font-space-grotesk mb-3 text-slate-900">Basic</h3>
                        <p className="text-slate-600 text-sm mb-8 min-h-[48px] leading-relaxed">Perfect for developer and personal use.</p>

                        <div className="mb-6">
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-black font-space-grotesk text-slate-900">₹{isYearly ? '3,990' : '399'}</span>
                            </div>
                            <div className="text-slate-500 text-sm mt-1 font-mono">/{isYearly ? 'yr' : 'mo'} for up to 500 devices</div>
                        </div>

                        <button className="w-full py-4 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-900 rounded-2xl font-bold transition-colors mb-8 group-hover:border-slate-300 shadow-sm">
                            Start Building
                        </button>

                        <div className="text-xs font-bold tracking-widest uppercase text-slate-500 mb-4 font-mono">Core Features</div>
                        <ul className="space-y-4 text-sm text-slate-700 mb-8">
                            <li className="flex items-start gap-3"><Check className="w-5 h-5 shrink-0 text-blue-500" /> Up to 500 connected devices</li>
                            <li className="flex items-start gap-3"><Check className="w-5 h-5 shrink-0 text-blue-500" /> Standard ECC Authentication</li>
                            <li className="flex items-start gap-3"><Check className="w-5 h-5 shrink-0 text-blue-500" /> Basic MQTT Encryption</li>
                            <li className="flex items-start gap-3"><Check className="w-5 h-5 shrink-0 text-blue-500" /> Community Forum Support</li>
                        </ul>
                    </div>

                    {/* Pro Plan */}
                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all relative group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-widest">
                                <Server className="w-4 h-4" /> Production
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold font-space-grotesk mb-3 text-slate-900">Professional</h3>
                        <p className="text-slate-600 text-sm mb-8 min-h-[48px] leading-relaxed">For growing fleets requiring reliable, automated provisioning.</p>

                        <div className="mb-6">
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-black font-space-grotesk text-slate-900">₹{isYearly ? '29,900' : '2,990'}</span>
                            </div>
                            <div className="text-slate-500 text-sm mt-1 font-mono">/{isYearly ? 'yr' : 'mo'} for up to 20,000 devices</div>
                        </div>

                        <button className="w-full py-4 px-4 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-2xl font-bold transition-colors mb-8 hover:border-indigo-300">
                            Start Free Trial
                        </button>

                        <div className="text-xs font-bold tracking-widest uppercase text-slate-500 mb-4 font-mono">Everything in Basic, plus:</div>
                        <ul className="space-y-4 text-sm text-slate-700 mb-8">
                            <li className="flex items-start gap-3"><Check className="w-5 h-5 shrink-0 text-indigo-500" /> 10,000,000 messages / day</li>
                            <li className="flex items-start gap-3"><Check className="w-5 h-5 shrink-0 text-indigo-500" /> Automated Zero-Touch Provisioning</li>
                            <li className="flex items-start gap-3"><Check className="w-5 h-5 shrink-0 text-indigo-500" /> Over-The-Air (OTA) Updates</li>
                            <li className="flex items-start gap-3"><Check className="w-5 h-5 shrink-0 text-indigo-500" /> Device Telemetry Dashboard</li>
                            <li className="flex items-start gap-3"><Check className="w-5 h-5 shrink-0 text-indigo-500" /> Standard Email Support</li>
                        </ul>
                    </div>

                    {/* Business Plan - Highlighted */}
                    <div className="bg-blue-50/50 rounded-[2.5rem] p-8 border border-blue-200 shadow-[0_8px_30px_rgba(59,130,246,0.12)] relative transform hover:-translate-y-2 transition-transform duration-500 backdrop-blur-2xl">
                        <div className="absolute -top-4 right-8 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-[0_4px_10px_rgba(59,130,246,0.3)]">
                            Most Popular
                        </div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-cyan-600 text-xs font-bold uppercase tracking-widest">
                                <Network className="w-4 h-4" /> Enterprise
                            </div>
                            <Crown className="w-5 h-5 text-amber-500" />
                        </div>
                        <h3 className="text-3xl font-bold font-space-grotesk mb-3 text-slate-900">Scale</h3>
                        <p className="text-slate-700 text-sm mb-8 min-h-[48px] leading-relaxed">Advanced security controls for large-scale distributed IoT deployments.</p>

                        <div className="mb-6">
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-black font-space-grotesk text-slate-900">₹{isYearly ? '89,900' : '8,990'}</span>
                            </div>
                            <div className="text-blue-600/80 text-sm mt-1 font-mono">/{isYearly ? 'yr' : 'mo'} for up to 150,000 devices</div>
                        </div>

                        <div className="flex flex-col gap-3 mb-8">
                            <button className="w-full py-4 px-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-2xl font-bold transition-all shadow-[0_4px_15px_rgba(59,130,246,0.3)]">
                                Upgrade to Scale
                            </button>
                        </div>

                        <div className="text-xs font-bold tracking-widest uppercase text-blue-700/80 mb-4 font-mono">Everything in Pro, plus:</div>
                        <ul className="space-y-4 text-sm text-slate-800 mb-8">
                            <li className="flex items-start gap-3"><Check className="w-5 h-5 shrink-0 text-cyan-500" /> Unlimited messaging (Fair Use)</li>
                            <li className="flex items-start gap-3"><Check className="w-5 h-5 shrink-0 text-cyan-500" /> Hardware Security Module (HSM)</li>
                            <li className="flex items-start gap-3"><Check className="w-5 h-5 shrink-0 text-cyan-500" /> Advanced Threat Anomaly Detection</li>
                            <li className="flex items-start gap-3"><Check className="w-5 h-5 shrink-0 text-cyan-500" /> Custom API Rate Limiting</li>
                            <li className="flex items-start gap-3"><Check className="w-5 h-5 shrink-0 text-cyan-500" /> 24/7 Priority Support (SLA)</li>
                        </ul>
                    </div>

                    {/* Custom Enterprise Plan */}
                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all relative group flex flex-col justify-between h-full">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-widest">
                                    <Shield className="w-4 h-4" /> Custom
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold font-space-grotesk mb-3 text-slate-900">Custom</h3>
                            <p className="text-slate-600 text-sm mb-8 min-h-[48px] leading-relaxed">Dedicated infrastructure for nation-state level critical deployments.</p>

                            <div className="mb-6">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black font-space-grotesk text-slate-900 tracking-tight">Let's talk</span>
                                </div>
                                <div className="text-slate-500 text-sm mt-1 font-mono">Custom pricing & quotas</div>
                            </div>

                            <Link to="/contact" className="block w-full py-4 px-4 bg-transparent border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-900 rounded-2xl font-bold transition-all mb-8 text-center">
                                Contact Sales
                            </Link>

                            <div className="text-xs font-bold tracking-widest uppercase text-slate-500 mb-4 font-mono">Enterprise exclusives:</div>
                            <ul className="space-y-4 text-sm text-slate-700 mb-8">
                                <li className="flex items-start gap-3"><Check className="w-5 h-5 shrink-0 text-emerald-500" /> Dedicated Private Cloud Instance</li>
                                <li className="flex items-start gap-3"><Check className="w-5 h-5 shrink-0 text-emerald-500" /> On-Premise Deployment Options</li>
                                <li className="flex items-start gap-3"><Check className="w-5 h-5 shrink-0 text-emerald-500" /> White-label Device Firmware</li>
                                <li className="flex items-start gap-3"><Check className="w-5 h-5 shrink-0 text-emerald-500" /> Dedicated Security Engineer</li>
                            </ul>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};

export { Pricing };
