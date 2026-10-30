import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../components/Header';
import StickyFooter from '@/components/ui/footer';
import { ChevronDown, MessageCircleQuestion, PhoneCall, FileText } from 'lucide-react';

const faqs = [
    {
        question: "How do I generate an ECC certificate for my edge node?",
        answer: "Certificates are generated locally on your machine using our open-source securenodex-cli tool. We never see or transmit your private keys. Run `securenodex-cli init` in your terminal to begin."
    },
    {
        question: "What happens if a node loses internet connectivity?",
        answer: "The node will maintain its local state and queue telemetry. Once connectivity is restored, it will securely re-handshake using its MQTTS certificate and flush the queue sequentially."
    },
    {
        question: "Can I use RSA instead of Elliptic Curve?",
        answer: "By default, SecureNodeX enforces ECC (secp256r1) due to its superior performance-to-security ratio on constrained hardware nodes. RSA is supported but requires explicit configuration."
    },
    {
        question: "How do I add team members to my dashboard?",
        answer: "Navigate to Settings -> Access Control. You can invite team members via email and assign them generic Operator, Admin, or Billing roles."
    }
];

const HelpCenter = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-500/30 overflow-x-hidden relative flex flex-col">
            <Header />

            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[10%] left-[10%] w-[500px] h-[500px] bg-blue-300/10 rounded-full blur-[120px] mix-blend-multiply" />
                <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] bg-sky-300/10 rounded-full blur-[100px] mix-blend-multiply" />
            </div>

            <main className="flex-1 relative z-10 pt-32 pb-20 px-6 max-w-4xl mx-auto w-full">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="text-center mb-16"
                >
                    <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/50 border border-blue-200 text-blue-700 text-xs font-bold tracking-widest uppercase font-mono">
                        Support
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black font-space-grotesk text-slate-900 tracking-tight mb-6">
                        Help Center
                    </h1>
                    <p className="text-lg text-slate-500 font-kanit max-w-2xl mx-auto">
                        Search our knowledge base, browse frequently asked questions, or get in touch with our engineering support directly.
                    </p>
                </motion.div>

                {/* Contact Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                    <motion.a
                        href="/contact"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all text-center flex flex-col items-center"
                    >
                        <MessageCircleQuestion className="w-8 h-8 text-blue-600 mb-4" />
                        <h3 className="font-bold font-space-grotesk text-slate-900 mb-2">Email Support</h3>
                        <p className="text-sm text-slate-500 font-kanit">Create a ticket with our team</p>
                    </motion.a>

                    <motion.a
                        href="/docs"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all text-center flex flex-col items-center"
                    >
                        <FileText className="w-8 h-8 text-indigo-600 mb-4" />
                        <h3 className="font-bold font-space-grotesk text-slate-900 mb-2">Documentation</h3>
                        <p className="text-sm text-slate-500 font-kanit">Read the comprehensive guides</p>
                    </motion.a>

                    <motion.a
                        href="/contact"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all text-center flex flex-col items-center"
                    >
                        <PhoneCall className="w-8 h-8 text-sky-600 mb-4" />
                        <h3 className="font-bold font-space-grotesk text-slate-900 mb-2">Enterprise Sales</h3>
                        <p className="text-sm text-slate-500 font-kanit">Schedule a technical call</p>
                    </motion.a>
                </div>

                {/* FAQ */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                >
                    <h2 className="text-2xl font-black font-space-grotesk text-slate-900 mb-6">Frequently Asked Questions</h2>
                    <div className="space-y-4">
                        {faqs.map((faq, index) => (
                            <div
                                key={index}
                                className={`bg-white border rounded-2xl overflow-hidden transition-all ${openIndex === index ? 'border-blue-200 shadow-md' : 'border-slate-200 shadow-sm'}`}
                            >
                                <button
                                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                    className="w-full flex items-center justify-between p-6 text-left"
                                >
                                    <span className="font-bold font-kanit text-slate-900 text-lg">{faq.question}</span>
                                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${openIndex === index ? 'rotate-180' : ''}`} />
                                </button>
                                <AnimatePresence>
                                    {openIndex === index && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            <div className="p-6 pt-0 text-slate-600 font-kanit leading-relaxed border-t border-slate-100 mt-2">
                                                {faq.answer}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </main>

            <div className="relative z-50 bg-slate-900 w-full mt-auto">
                <StickyFooter />
            </div>
        </div>
    );
};

export default HelpCenter;
