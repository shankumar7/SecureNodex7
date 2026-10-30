import { useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import StickyFooter from '@/components/ui/footer';

const DataProtection = () => {
    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-500/30 overflow-x-hidden relative flex flex-col">
            <Header />

            {/* Background Effects matching Home */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-400/20 rounded-full blur-[120px] mix-blend-multiply" />
                <div className="absolute top-[20%] left-[-5%] w-[400px] h-[400px] bg-blue-400/20 rounded-full blur-[100px] mix-blend-multiply" />
            </div>

            <main className="flex-1 relative z-10 pt-32 pb-20 px-6 max-w-4xl mx-auto w-full">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                    <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100/50 border border-indigo-200 text-indigo-700 text-xs font-bold tracking-widest uppercase font-mono">
                        GDPR & SOC2 Guide
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black font-space-grotesk text-slate-900 tracking-tight mb-6">
                        Data Protection
                    </h1>
                    <p className="text-lg text-slate-500 font-kanit mb-12 border-b border-slate-200 pb-8">
                        Effective Date: 21 February 2026
                    </p>

                    <div className="prose prose-slate max-w-none font-kanit text-slate-600 space-y-8 prose-headings:font-space-grotesk prose-headings:font-bold prose-headings:text-slate-900">
                        <section>
                            <h2 className="text-2xl mb-4">1. Our Commitment to Data Sovereignty</h2>
                            <p>
                                At SecureNodeX, we operate on a principle of cryptographic data sovereignty. We orchestrate the identity verification and routing of your packets, but we are mathematically blind to the actual proprietary data your IoT network generates. Because we do not terminate TLS and inspect payloads, your edge logic stays yours.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl mb-4">2. European GDPR & CCPA Compliance</h2>
                            <p>
                                All telemetry, billing, and account metadata collected to maintain your SecureNodeX environment are meticulously siloed to adhere to the rigid standards demanded by European and Californian privacy regulations.
                            </p>
                            <ul className="list-disc pl-6 text-slate-600 mt-4 space-y-2">
                                <li><strong>Right to Erasure:</strong> Purge 100% of your account logs via the API.</li>
                                <li><strong>Right to Portability:</strong> Export node configurations as JSON artifacts instantly.</li>
                                <li><strong>Localization Hooks:</strong> Anchor your control planes to specific cloud regions to satisfy stringent domestic data locality laws.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl mb-4">3. Incident Protocol & SOC2</h2>
                            <p>
                                We are audited annually to verify our SOC2 Type II compliance. In the unprecedented event of a control-plane breach, our anomaly engines will sever edge networking connections within milliseconds. Administrators are legally and operationally guaranteed full transparency and incident disclosure within 24 hours of any verified anomaly event affecting cryptographic identities.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl mb-4">4. Sub-Processor Transparency</h2>
                            <p>
                                We maintain strict Data Processing Agreements (DPAs) with infrastructure providers hosting our isolated edge nodes. They are legally barred from harvesting patterns off your distributed network traffic.
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

export default DataProtection;
