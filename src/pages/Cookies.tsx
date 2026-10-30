import { useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import StickyFooter from '@/components/ui/footer';

const Cookies = () => {
    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-500/30 overflow-x-hidden relative flex flex-col">
            <Header />

            {/* Background Effects matching Home */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-[120px] mix-blend-multiply" />
                <div className="absolute top-[20%] right-[-5%] w-[400px] h-[400px] bg-indigo-400/20 rounded-full blur-[100px] mix-blend-multiply" />
            </div>

            <main className="flex-1 relative z-10 pt-32 pb-20 px-6 max-w-4xl mx-auto w-full">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                    <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100/50 border border-indigo-200 text-indigo-700 text-xs font-bold tracking-widest uppercase font-mono">
                        Cookie Declaration
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black font-space-grotesk text-slate-900 tracking-tight mb-6">
                        Cookie Policy
                    </h1>
                    <p className="text-lg text-slate-500 font-kanit mb-12 border-b border-slate-200 pb-8">
                        Effective Date: 21 February 2026
                    </p>

                    <div className="prose prose-slate max-w-none font-kanit text-slate-600 space-y-8 prose-headings:font-space-grotesk prose-headings:font-bold prose-headings:text-slate-900">
                        <section>
                            <h2 className="text-2xl mb-4">1. What are cookies?</h2>
                            <p>
                                Cookies are small text files stored on your browser or device by websites, apps, online media, and advertisements. At SecureNodeX, we prioritize preserving a lean, zero-trust profile, but we leverage strictly necessary cookies to keep your dashboard secure and resilient.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl mb-4">2. The Cookies We Deploy</h2>
                            <ul className="list-disc pl-6 text-slate-600 space-y-2 mt-4">
                                <li><strong>Essential Security Cookies:</strong> These tokens detect active sessions to prevent Cross-Site Request Forgery (CSRF). They cannot be disabled as they secure your multi-factor authentication layer.</li>
                                <li><strong>Performance Logging:</strong> Anonymous load-balancing heuristics that ensure your traffic is perfectly distributed across our edge clusters during high-throughput anomaly events.</li>
                                <li><strong>Preferences:</strong> Saving simple UI/UX decisions, like whether you prefer viewing your device grids in Light or Dark Mode.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl mb-4">3. Third-Party Analytics</h2>
                            <p>
                                SecureNodeX completely avoids invasive tracking frameworks. If you participate in our developer pilot programs, we may utilize privacy-friendly aggregate tracking (like Plausible Analytics) to monitor our documentation's readability.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl mb-4">4. Managing Your Footprint</h2>
                            <p>
                                If you wish to disable performance cookies, you can prune them securely via your browser settings. Be advised that flushing session cookies will immediately terminate any active administrative connections to your SecureNodeX node.
                            </p>
                        </section>
                    </div>
                </motion.div>
            </main>

            <div className="relative z-50 bg-slate-900 w-full mt-auto">
                <StickyFooter />
            </div>
        </div>
    );
};

export default Cookies;
