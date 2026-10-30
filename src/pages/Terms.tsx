import { useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import StickyFooter from '@/components/ui/footer';

const Terms = () => {
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
                    <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/50 border border-blue-200 text-blue-700 text-xs font-bold tracking-widest uppercase font-mono">
                        Legal Information
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black font-space-grotesk text-slate-900 tracking-tight mb-6">
                        Terms and Conditions
                    </h1>
                    <p className="text-lg text-slate-500 font-kanit mb-12 border-b border-slate-200 pb-8">
                        Effective Date: 21 February 2026
                    </p>

                    <div className="prose prose-slate max-w-none font-kanit text-slate-600 space-y-8 prose-headings:font-space-grotesk prose-headings:font-bold prose-headings:text-slate-900 prose-a:text-blue-600 hover:prose-a:text-blue-500">
                        <section>
                            <h2 className="text-2xl mb-4">1. Introduction</h2>
                            <p>
                                Welcome to SecureNodeX. By accessing or using our platform, services, APIs, and associated hardware solutions (collectively, the "Services"), you agree to be bound by these Terms and Conditions. Please read them carefully. If you do not agree to these terms, do not use our Services.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl mb-4">2. Use of Services</h2>
                            <p>
                                SecureNodeX provides zero-trust IoT infrastructure. You agree to use the Services only for lawful purposes and in accordance with these Terms. You are responsible for maintaining the confidentiality of your account credentials, device certificates, and cryptographic keys generated through our platform.
                            </p>
                            <ul className="list-disc pl-6 space-y-2 mt-4 text-slate-600">
                                <li>You must not attempt to reverse engineer or bypass our security protocols.</li>
                                <li>You are strictly prohibited from using SecureNodeX to orchestrate botnets, DDoS attacks, or transmit malicious code.</li>
                                <li>Fair use limits apply to message throughput as defined in your selected pricing tier.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl mb-4">3. Data and Privacy</h2>
                            <p>
                                Your privacy is paramount. SecureNodeX employs end-to-end encryption. However, operational telemetry required to maintain service availability is collected. For complete details on how your data is handled, stored, and protected, please refer to our <a href="/privacy">Privacy and Security Rules</a>.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl mb-4">4. Intellectual Property</h2>
                            <p>
                                All intellectual property rights in the Services, including but not limited to our proprietary routing algorithms, dashboard UI/UX, and firmware architectures, remain the exclusive property of SecureNodeX and its licensors. You are granted a limited, non-exclusive, non-transferable license to use the Services.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl mb-4">5. Limitation of Liability</h2>
                            <p>
                                To the maximum extent permitted by law, SecureNodeX shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your use of the Services or hardware failures beyond our control.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl mb-4">6. Modifications</h2>
                            <p>
                                We reserve the right to modify these Terms at any time. We will notify you of any material changes by posting the new Terms on this site and updating the effective date. Your continued use of the Services after such modifications constitutes your acknowledgment and acceptance of the updated Terms.
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

export default Terms;
