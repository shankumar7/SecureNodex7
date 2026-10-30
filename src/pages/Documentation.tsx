import { useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import StickyFooter from '@/components/ui/footer';
import { BookOpen, Code2, Terminal, FileCode2, ArrowRight } from 'lucide-react';

const Documentation = () => {
    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const sections = [
        {
            icon: <Terminal className="w-6 h-6 text-blue-600" />,
            title: "Quickstart Guide",
            desc: "Provision your first hardware node and connect to the edge network in under 5 minutes.",
            link: "#"
        },
        {
            icon: <Code2 className="w-6 h-6 text-indigo-600" />,
            title: "Ground work",
            desc: "RESTful endpoints and WebSocket streams for managing your device fleet programmatically.",
            link: "#"
        },
        {
            icon: <BookOpen className="w-6 h-6 text-emerald-600" />,
            title: "Architecture Decisions",
            desc: "Deep-dives into our elliptic curve zero-trust model and underlying infrastructure protocols.",
            link: "#"
        },
        {
            icon: <FileCode2 className="w-6 h-6 text-violet-600" />,
            title: "SDKs & Libraries",
            desc: "Client wrappers for Python, Node.js, and C++ to accelerate your hardware integration.",
            link: "#"
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-500/30 overflow-x-hidden relative flex flex-col">
            <Header />

            {/* Background Effects matching Home */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[10%] left-[10%] w-[500px] h-[500px] bg-sky-400/10 rounded-full blur-[120px] mix-blend-multiply" />
                <div className="absolute bottom-[20%] right-[5%] w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] mix-blend-multiply" />
            </div>

            <main className="flex-1 relative z-10 pt-32 pb-20 px-6 max-w-6xl mx-auto w-full">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="mb-16 text-center max-w-3xl mx-auto"
                >
                    <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/50 border border-blue-200 text-blue-700 text-xs font-bold tracking-widest uppercase font-mono">
                        Developer Resources
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black font-space-grotesk text-slate-900 tracking-tight mb-6">
                        Documentation
                    </h1>
                    <p className="text-lg text-slate-500 font-kanit">
                        Everything you need to successfully deploy, scale, and secure your IoT infrastructure on SecureNodeX.
                    </p>
                </motion.div>

                {/* Search Bar Placeholder */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="max-w-2xl mx-auto mb-16 relative"
                >
                    <input
                        type="text"
                        placeholder="Search for APIs, guides, or concepts..."
                        className="w-full bg-white border border-slate-200 shadow-sm rounded-2xl px-6 py-4 text-slate-900 font-kanit focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-lg"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-blue-50 text-blue-600 font-mono text-xs font-bold px-2 py-1 rounded border border-blue-100">
                        ⌘K
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                    {sections.map((sec, idx) => (
                        <motion.a
                            href={sec.link}
                            key={idx}
                            className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group block relative overflow-hidden"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 + (idx * 0.1) }}
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-6 relative z-10">
                                {sec.icon}
                            </div>
                            <h3 className="text-2xl font-bold font-space-grotesk text-slate-900 mb-3 relative z-10">{sec.title}</h3>
                            <p className="text-slate-500 font-kanit leading-relaxed mb-6 relative z-10">{sec.desc}</p>

                            <div className="flex items-center text-blue-600 font-bold font-kanit text-sm uppercase tracking-wider group-hover:gap-3 transition-all relative z-10">
                                Read Guide <ArrowRight className="w-4 h-4 ml-2" />
                            </div>
                        </motion.a>
                    ))}
                </div>
            </main>

            <div className="relative z-50 bg-slate-900 w-full mt-auto">
                <StickyFooter />
            </div>
        </div>
    );
};

export default Documentation;
