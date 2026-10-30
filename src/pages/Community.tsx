import { useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import StickyFooter from '@/components/ui/footer';
import { MessageSquare, Users, Github, Twitter, ExternalLink } from 'lucide-react';

const Community = () => {
    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-500/30 overflow-x-hidden relative flex flex-col">
            <Header />

            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-400/10 rounded-full blur-[120px] mix-blend-multiply" />
                <div className="absolute bottom-[20%] left-[-5%] w-[500px] h-[500px] bg-indigo-400/10 rounded-full blur-[100px] mix-blend-multiply" />
            </div>

            <main className="flex-1 relative z-10 pt-32 pb-20 px-6 max-w-6xl mx-auto w-full">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="mb-16 text-center max-w-3xl mx-auto"
                >
                    <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100/50 border border-purple-200 text-purple-700 text-xs font-bold tracking-widest uppercase font-mono">
                        SecureNodeX Network
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black font-space-grotesk text-slate-900 tracking-tight mb-6">
                        Community Forum
                    </h1>
                    <p className="text-lg text-slate-500 font-kanit">
                        Connect with fellow engineers, share your hardware configurations, and get help scaling your zero-trust network deployments.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch mb-16">
                    {/* General Discussion */}
                    <motion.div
                        className="bg-white rounded-3xl p-8 lg:p-12 border border-slate-200 shadow-xl overflow-hidden relative group"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-700" />
                        <MessageSquare className="w-12 h-12 text-slate-900 mb-6" />
                        <h2 className="text-3xl font-black font-space-grotesk text-slate-900 mb-4">Discourse Boards</h2>
                        <p className="text-slate-500 font-kanit mb-8 text-lg">
                            Dive into deep technical discussions. Troubleshoot certificate provisioning issues, or share your custom hardware firmware forks.
                        </p>
                        <button className="bg-slate-900 text-white hover:bg-slate-800 font-bold font-space-grotesk py-3 px-6 rounded-xl flex items-center gap-2 transition-colors">
                            Enter Forums <ExternalLink className="w-4 h-4" />
                        </button>
                    </motion.div>

                    {/* Discord/Slack */}
                    <motion.div
                        className="bg-indigo-600 rounded-3xl p-8 lg:p-12 shadow-xl overflow-hidden relative group"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
                        <Users className="w-12 h-12 text-white mb-6 relative z-10" />
                        <h2 className="text-3xl font-black font-space-grotesk text-white mb-4 relative z-10">Real-Time Chat</h2>
                        <p className="text-indigo-100 font-kanit mb-8 text-lg relative z-10">
                            Join our Discord server to chat directly with Team CodeCommit and other platform engineers in real-time.
                        </p>
                        <button className="bg-white text-indigo-600 hover:bg-slate-50 font-bold font-space-grotesk py-3 px-6 rounded-xl flex items-center gap-2 transition-colors relative z-10 shadow-lg shadow-indigo-900/20">
                            Join Discord <ExternalLink className="w-4 h-4" />
                        </button>
                    </motion.div>
                </div>

                {/* Open Source / Social */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="flex flex-col md:flex-row gap-6 justify-center items-center py-8 border-t border-slate-200"
                >
                    <a href="https://github.com/shankumar7" className="flex items-center gap-3 text-slate-600 hover:text-slate-900 font-kanit font-bold transition-colors">
                        <Github className="w-5 h-5" /> Contribute on GitHub
                    </a>
                    <div className="hidden md:block w-px h-6 bg-slate-300" />
                    <a href="https://x.com/shankumar_7" className="flex items-center gap-3 text-slate-600 hover:text-blue-500 font-kanit font-bold transition-colors">
                        <Twitter className="w-5 h-5" /> Follow on X
                    </a>
                </motion.div>
            </main>

            <div className="relative z-50 bg-slate-900 w-full mt-auto">
                <StickyFooter />
            </div>
        </div>
    );
};

export default Community;
