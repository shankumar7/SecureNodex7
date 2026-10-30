import { useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import StickyFooter from '@/components/ui/footer';
import { ShieldAlert, Cpu, Lock, Network } from 'lucide-react';
import shanImg from '../assets/Shankumar_Pitta.png';
import aditiImg from '../assets/aditi.jpeg';
import rithwikImg from '../assets/Dokku_Rithwik.png';
import premImg from '../assets/prem.jpeg';

const fadeIn: any = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
};

const team = [
    { name: 'Shankumar Pitta', role: 'Architecture & Cryptography', image: shanImg },
    { name: 'Aditi', role: 'Researcher', image: aditiImg },
    { name: 'Rithwik Dokku', role: 'Network Security', image: rithwikImg },
    { name: 'Prem', role: 'Client Side Developer', image: premImg },
];

const About = () => {
    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-500/30 overflow-x-hidden relative flex flex-col">
            <Header />

            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[0%] left-[-10%] w-[600px] h-[600px] bg-blue-300/10 rounded-full blur-[120px] mix-blend-multiply" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-300/10 rounded-full blur-[120px] mix-blend-multiply" />
            </div>

            <main className="flex-1 relative z-10 pt-32 pb-20 px-6 max-w-7xl mx-auto w-full space-y-32">

                {/* Hero Section */}
                <motion.section
                    className="text-center max-w-4xl mx-auto"
                    {...fadeIn}
                >
                    <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200 border border-slate-300 text-slate-700 text-xs font-bold tracking-widest uppercase font-mono">
                        Our Mission
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black font-space-grotesk text-slate-900 tracking-tight mb-8 leading-tight">
                        We are fundamentally changing how hardware trusts the cloud.
                    </h1>
                    <p className="text-xl text-slate-500 font-kanit leading-relaxed">
                        SecureNodeX wasn't built to iterate on existing IoT platforms. It was built from the ground up by Team CodeCommit to enforce complete zero-trust verification at the very edge of the network. We believe that if you can't verify the cryptographic identity of the hardware, you don't own the data.
                    </p>
                </motion.section>

                {/* Values / Core Tenets Grid */}
                <section>
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-black font-space-grotesk text-slate-900">Engineering Tenets</h2>
                        <p className="text-slate-500 font-kanit mt-4">The core principles that drive our codebase.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { icon: <Lock />, title: "Trust Nothing", desc: "Every connection, payload, and heartbeat is cryptographically signed and verified." },
                            { icon: <ShieldAlert />, title: "Assume Breach", desc: "Our network topologies isolate devices to prevent lateral movement on compromise." },
                            { icon: <Cpu />, title: "Bare-Metal Speed", desc: "Security shouldn't cost latency. Our mTLS offloading is built for real-time telemetry." },
                            { icon: <Network />, title: "Line-of-Sight Routing", desc: "Data never touches an intermediary database without an explicit customer policy." }
                        ].map((item, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1, duration: 0.5 }}
                                className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-xl transition-all"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-800 mb-6">
                                    {item.icon}
                                </div>
                                <h3 className="text-xl font-bold font-space-grotesk text-slate-900 mb-2">{item.title}</h3>
                                <p className="text-slate-500 font-kanit text-sm leading-relaxed">{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* Team Section */}
                <section className="bg-slate-900 rounded-[3rem] p-12 md:p-20 relative overflow-hidden text-center md:text-left">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />

                    <div className="relative z-10 mb-16 max-w-2xl">
                        <h2 className="text-3xl md:text-5xl font-black font-space-grotesk text-white mb-6">Built by Team CodeCommit</h2>
                        <p className="text-slate-400 font-kanit text-lg">
                            We are a group of engineers obsessed with distributed systems, kernel-level networking, and elliptic curve cryptography. We built SecureNodeX to solve the problems we faced in our own deployments.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
                        {team.map((member, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1, duration: 0.5 }}
                                className="group relative"
                            >
                                <div className="aspect-square rounded-3xl overflow-hidden mb-6 bg-slate-800 border border-slate-700 relative">
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60 z-10" />
                                    <img
                                        src={member.image}
                                        alt={member.name}
                                        className="w-full h-full object-cover object-top filter grayscale group-hover:grayscale-0 transition-all duration-500 transform group-hover:scale-105"
                                    />
                                </div>
                                <h3 className="text-xl font-bold font-space-grotesk text-white mb-1">{member.name}</h3>
                                <p className="text-blue-400 font-kanit text-sm font-bold uppercase tracking-wider">{member.role}</p>
                            </motion.div>
                        ))}
                    </div>
                </section>
            </main>

            <div className="relative z-50 bg-slate-900 w-full mt-auto">
                <StickyFooter />
            </div>
        </div>
    );
};

export default About;
