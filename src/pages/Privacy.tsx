import { useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import StickyFooter from '@/components/ui/footer';

const Privacy = () => {
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
                        Security Notice
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black font-space-grotesk text-slate-900 tracking-tight mb-6">
                        Privacy and Security Rules
                    </h1>
                    <p className="text-lg text-slate-500 font-kanit mb-12 border-b border-slate-200 pb-8">
                        Effective Date: 21 February 2026
                    </p>

                    <div className="prose prose-slate max-w-none font-kanit text-slate-600 space-y-8 prose-headings:font-space-grotesk prose-headings:font-bold prose-headings:text-slate-900">
                        <section>
                            <h2 className="text-2xl mb-4">1. Data Collection Policy</h2>
                            <p>
                                As a zero-trust architecture platform, SecureNodeX minimizes data ingestion. We do not inspect message payloads transmitted between your IoT devices and external services. Data collection is strictly limited to:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 mt-4 text-slate-600">
                                <li><strong>Device Telemetry:</strong> Connection statuses, latency metrics, and handshake timestamps to maintain service uptime.</li>
                                <li><strong>Account Details:</strong> Information necessary for billing, account management, and support (e.g., email address, payment details).</li>
                                <li><strong>Security Logs:</strong> Cryptographic handshake failures, blocked unauthorized connection attempts, and API rate-limiting data.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl mb-4">2. Core Security Architecture</h2>
                            <p>
                                We prioritize security over convenience. All device certificates are generated entirely on your local machine using our provisioning tools; SecureNodeX operates solely with public keys.
                            </p>
                            <p className="mt-4">
                                Any attempt by unauthorized entities to exploit cryptographic vulnerabilities will be automatically blackholed by our edge network anomaly detection systems. Your data routing rules are immutable without explicit multi-factor authentication from your dashboard.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl mb-4">3. Data Retention</h2>
                            <p>
                                Transient connection logs are purged every 30 days unless a security alert is triggered, in which case logs are retained for forensic analysis. Device telemetry and activity statistics are aggregated and retained for the lifespan of your account to power your analytics dashboard.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl mb-4">4. Third-Party Sharing</h2>
                            <p>
                                SecureNodeX will never sell your personal data or device metadata. We only share necessary metrics with integrated sub-processors (like Stripe for billing or AWS/Azure underlying infrastructure) that meet our rigorous compliance thresholds, strictly to provide the Services you have requested.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl mb-4">5. User Rights and Deletion</h2>
                            <p>
                                You have full control over your footprint. You may request a complete export of your architectural configurations and telemetry data at any time. Upon account deletion, all active routing endpoints and public keys are immediately scrubbed, and associated data is purged within 7 days from our backups.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl mb-4">6. Contact Security Team</h2>
                            <p>
                                For responsible disclosure of vulnerabilities or detailed inquiries regarding our SOC2/ISO compliance roadmap, please reach out to our engineering team at <strong className="text-indigo-600">security@securenodex.com</strong>.
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

export default Privacy;
