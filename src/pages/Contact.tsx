import { useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import StickyFooter from '@/components/ui/footer';
import { Mail, Phone, MapPin, ArrowRight } from 'lucide-react';

const Contact = () => {
    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-500/30 overflow-x-hidden relative flex flex-col">
            <Header />

            {/* Background Effects matching Home */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[10%] left-[10%] w-[500px] h-[500px] bg-sky-400/10 rounded-full blur-[120px] mix-blend-multiply" />
                <div className="absolute bottom-[20%] right-[5%] w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] mix-blend-multiply" />
            </div>

            <main className="flex-1 relative z-10 pt-32 pb-20 px-6 max-w-7xl mx-auto w-full">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="text-center max-w-3xl mx-auto mb-16"
                >
                    <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/50 border border-blue-200 text-blue-700 text-xs font-bold tracking-widest uppercase font-mono">
                        Contact Sales & Support
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black font-space-grotesk text-slate-900 tracking-tight mb-6">
                        Let's secure your network.
                    </h1>
                    <p className="text-lg text-slate-500 font-kanit">
                        Whether you are exploring pilot programs for a Smart City or looking to audit our zero-trust architecture, our engineering team is here to help.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start max-w-5xl mx-auto">
                    {/* Contact Methods */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="space-y-8"
                    >
                        <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-100/50 flex items-center justify-center shrink-0">
                                <Mail className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold font-space-grotesk text-slate-900 mb-1">Email Us</h3>
                                <p className="text-slate-500 font-kanit mb-2">Our support team usually responds within 2 hours.</p>
                                <a href="mailto:securenodex@gmail.com" className="text-blue-600 font-bold hover:text-blue-700 font-kanit">securenodex@gmail.com</a>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-100/50 flex items-center justify-center shrink-0">
                                <Phone className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold font-space-grotesk text-slate-900 mb-1">Call Engineering</h3>
                                <p className="text-slate-500 font-kanit mb-2">Available Mon-Fri, 9am - 6pm IST for enterprise accounts.</p>
                                <a href="tel:+911234567890" className="text-blue-600 font-bold hover:text-blue-700 font-kanit">+91 (123) 456-7890</a>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-100/50 flex items-center justify-center shrink-0">
                                <MapPin className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold font-space-grotesk text-slate-900 mb-1">Headquarters</h3>
                                <p className="text-slate-500 font-kanit mb-1">SecureNodeX Tower</p>
                                <p className="text-slate-500 font-kanit">Cyberabad, Hyderabad<br />Telangana 500081, India</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Contact Form */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="bg-white/80 backdrop-blur-xl border border-slate-200 shadow-xl rounded-3xl p-8 lg:p-10 relative overflow-hidden group"
                    >
                        <form className="space-y-6 relative z-10" onSubmit={(e) => e.preventDefault()}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold font-kanit text-slate-600 uppercase tracking-wider">First Name</label>
                                    <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-kanit focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium" placeholder="Jane" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold font-kanit text-slate-600 uppercase tracking-wider">Last Name</label>
                                    <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-kanit focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium" placeholder="Doe" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold font-kanit text-slate-600 uppercase tracking-wider">Work Email</label>
                                <input type="email" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-kanit focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium" placeholder="jane@company.com" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold font-kanit text-slate-600 uppercase tracking-wider">How can we help?</label>
                                <textarea rows={4} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-kanit focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium resize-none" placeholder="Tell us about your project infrastructure needs..." />
                            </div>

                            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-4 font-bold font-space-grotesk flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-600/20">
                                Send Message <ArrowRight className="w-4 h-4" />
                            </button>
                        </form>
                    </motion.div>
                </div>
            </main>

            <div className="relative z-50 bg-slate-900 w-full mt-auto">
                <StickyFooter />
            </div>
        </div>
    );
};

export default Contact;
