"use client"
import { motion, type Variants } from "framer-motion"
import { Instagram, Mail, Github, Linkedin } from "lucide-react"
import footerTitleImg from '../../assets/footer_title_img.png'

// Custom X Logo Component
const XIcon = ({ size = 24 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 300 300.25" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M178.57 127.15 290.27 0h-26.46l-97.03 110.38L89.34 0H0l117.13 166.93L0 300.25h26.46l102.4-116.59 81.8 116.59h89.34M36.01 19.54H76.66l187.13 262.13h-40.66" />
    </svg>
)

// Animation variants for reusability
const containerVariants: Variants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.8,
            ease: "easeOut",
            staggerChildren: 0.1,
        },
    },
}

const itemVariants: Variants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.6, ease: "easeOut" },
    },
}

const linkVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: "easeOut" },
    },
}

const socialVariants: Variants = {
    hidden: { opacity: 0, scale: 0 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: {
            type: "spring",
            stiffness: 200,
            damping: 10,
        },
    },
}

const backgroundVariants: Variants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: {
            duration: 2,
            ease: "easeOut",
        },
    },
}

// Footer data for better maintainability
const footerData = {
    sections: [
        {
            title: "Product",
            links: [
                { name: "Features", href: "#" },
                { name: "Security", href: "#" },
                { name: "Pricing", href: "#pricing" },
                { name: "Documentation", href: "/docs" }
            ]
        },
        {
            title: "Resources",
            links: [
                { name: "Help Center", href: "/help" },
                { name: "Community Forum", href: "/community" },
                { name: "Blog", href: "#" },
                { name: "System Status", href: "#" }
            ]
        },
        {
            title: "Company",
            links: [
                { name: "About SecureNodeX", href: "/about" },
                { name: "Contact Us", href: "/contact" },
                { name: "Our Mission", href: "/about" },
                { name: "Team CodeCommit", href: "/about" }
            ]
        },
        {
            title: "Legal",
            links: [
                { name: "Privacy Policy", href: "/privacy" },
                { name: "Terms of Service", href: "/terms" },
                { name: "Cookie Policy", href: "/cookies" },
                { name: "Data Protection", href: "/data-protection" }
            ]
        }
    ],
    social: [
        { href: "https://www.instagram.com/shankumar_7/", label: "Instagram", icon: <Instagram size={20} /> },
        { href: "https://x.com/shankumar_7", label: "X (Twitter)", icon: <div style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><XIcon size={16} /></div> },
        { href: "https://mail.google.com/mail/?view=cm&fs=1&to=securenodex@gmail.com", label: "Email", icon: <Mail size={20} /> },
        { href: "https://github.com/shankumar7", label: "GitHub", icon: <Github size={20} /> },
        { href: "https://www.linkedin.com/in/shankumar7/", label: "LinkedIn", icon: <Linkedin size={20} /> },
    ],
    title: "SecureNodeX",
    subtitle: "Team CodeCommit",
    copyright: "© 2026 All rights reserved",
}

// Reusable components
const NavSection = ({ title, links, index }: { title: string; links: { name: string; href: string }[]; index: number }) => (
    <motion.div variants={itemVariants} custom={index} className="flex flex-col gap-2">
        <motion.h3
            variants={{
                hidden: { opacity: 0, y: -10 },
                visible: { opacity: 1, y: 0, transition: { delay: 0.3 + index * 0.1, duration: 0.5 } }
            }}
            className="mb-2 uppercase text-muted-foreground text-xs font-semibold tracking-wider border-b border-border pb-1 hover:text-foreground transition-colors duration-300 font-['Kanit']"
        >
            {title}
        </motion.h3>
        {links.map((link, linkIndex) => (
            <motion.a
                key={linkIndex}
                variants={linkVariants}
                custom={linkIndex}
                href={link.href}
                whileHover={{
                    x: 8,
                    transition: { type: "spring", stiffness: 300, damping: 20 },
                }}
                className="text-muted-foreground hover:text-foreground transition-colors duration-300 font-['Kanit'] text-xs md:text-sm group relative"
            >
                <span className="relative">
                    {link.name}
                    <motion.span
                        className="absolute bottom-0 left-0 h-0.5 bg-primary"
                        initial={{ width: 0 }}
                        whileHover={{ width: "100%" }}
                        transition={{ duration: 0.3 }}
                    />
                </span>
            </motion.a>
        ))}
    </motion.div>
)

const SocialLink = ({ href, label, icon, index }: { href: string; label: string; icon: React.ReactNode; index: number }) => (
    <motion.a
        variants={socialVariants}
        custom={index}
        href={href}
        whileHover={{
            scale: 1.2,
            rotate: 12,
            transition: { type: "spring", stiffness: 300, damping: 15 },
        }}
        whileTap={{ scale: 0.9 }}
        className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-muted hover:bg-gradient-to-r hover:from-primary hover:to-secondary flex items-center justify-center transition-colors duration-300 group"
        aria-label={label}
    >
        <motion.span
            className="text-xs md:text-sm font-bold text-muted-foreground group-hover:text-primary-foreground"
            whileHover={{ scale: 1.1 }}
        >
            {icon}
        </motion.span>
    </motion.a>
)

export default function StickyFooter() {
    return (
        <div id="footer" className="relative w-full">
            <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.1 }}
                variants={containerVariants}
                className="bg-gradient-to-br from-card via-muted to-card/90 py-12 px-4 md:px-12 w-full flex flex-col relative overflow-hidden shrink-0"
            >
                {/* Animated Background Elements */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

                {/* Random Active Grid Cells */}
                {[...Array(6)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute bg-primary/10 w-[14px] h-[24px]"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                        }}
                        animate={{
                            opacity: [0, 1, 0],
                        }}
                        transition={{
                            duration: Math.random() * 3 + 2,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "easeInOut",
                            delay: Math.random() * 2,
                        }}
                    />
                ))}




                <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent pointer-events-none" />

                {/* Deep Inner Shadow for Depth */}
                <div className="absolute inset-0 shadow-[inset_0px_10px_50px_rgba(0,0,0,0.7)] pointer-events-none z-20" />

                <motion.div
                    variants={backgroundVariants}
                    className="absolute top-0 right-0 w-48 h-48 md:w-96 md:h-96 bg-primary/5 rounded-full blur-3xl"
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.2, 0.4, 0.2],
                    }}
                    transition={{
                        duration: 4,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                    }}
                />

                <motion.div
                    variants={backgroundVariants}
                    className="absolute bottom-0 left-0 w-48 h-48 md:w-96 md:h-96 bg-secondary/5 rounded-full blur-3xl"
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.2, 0.4, 0.2],
                    }}
                    transition={{
                        duration: 5,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                        delay: 1,
                    }}
                />

                {/* Navigation Section */}
                <motion.div variants={containerVariants} className="relative z-10">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-12 lg:gap-20">
                        {footerData.sections.map((section, index) => (
                            <NavSection key={section.title} title={section.title} links={section.links} index={index} />
                        ))}
                    </div>
                </motion.div>

                {/* Footer Bottom Section */}
                <motion.div
                    variants={{
                        hidden: { opacity: 0, y: 30 },
                        visible: { opacity: 1, y: 0, transition: { delay: 0.8, duration: 0.8, ease: "easeOut" } }
                    }}
                    className="flex flex-col md:flex-row justify-between items-start md:items-end relative z-10 gap-4 md:gap-6 mt-6"
                >
                    <div className="flex-1">
                        <motion.img
                            src={footerTitleImg}
                            alt={footerData.title}
                            variants={{
                                hidden: { opacity: 0, x: -50 },
                                visible: { opacity: 1, x: 0, transition: { delay: 1, duration: 0.8, ease: "easeOut" } }
                            }}
                            whileHover={{
                                scale: 1.02,
                                transition: { type: "spring", stiffness: 300, damping: 20 },
                            }}
                            className="w-full max-w-[300px] h-auto object-contain origin-left"
                        />

                        <motion.div
                            variants={{
                                hidden: { opacity: 0, width: 0 },
                                visible: { opacity: 1, width: "auto", transition: { delay: 1.2, duration: 0.6 } }
                            }}
                            className="flex items-center gap-3 md:gap-4 mt-3 md:mt-4"
                        >
                            <motion.div
                                className="w-8 md:w-12 h-0.5 bg-gradient-to-r from-primary to-secondary"
                                animate={{
                                    scaleX: [1, 1.2, 1],
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Number.POSITIVE_INFINITY,
                                    ease: "easeInOut",
                                }}
                            />
                            <motion.p
                                variants={{
                                    hidden: { opacity: 0 },
                                    visible: { opacity: 1, transition: { delay: 1.4, duration: 0.5 } }
                                }}
                                className="text-muted-foreground text-xs md:text-sm font-['Kanit'] hover:text-foreground transition-colors duration-300"
                            >
                                {footerData.subtitle}
                            </motion.p>
                        </motion.div>
                    </div>

                    <motion.div
                        variants={{
                            hidden: { opacity: 0, x: 50 },
                            visible: { opacity: 1, x: 0, transition: { delay: 1.6, duration: 0.6 } }
                        }}
                        className="text-left md:text-right"
                    >
                        <motion.p
                            variants={{
                                hidden: { opacity: 0 },
                                visible: { opacity: 1, transition: { delay: 1.8, duration: 0.5 } }
                            }}
                            className="text-muted-foreground text-xs md:text-sm mb-2 md:mb-3 hover:text-foreground transition-colors duration-300 font-['Kanit']"
                        >
                            {footerData.copyright}
                        </motion.p>

                        <motion.div
                            variants={containerVariants}
                            transition={{ delay: 2, staggerChildren: 0.1 }}
                            className="flex gap-2 md:gap-3"
                        >
                            {footerData.social.map((social, index) => (
                                <SocialLink
                                    key={social.label}
                                    href={social.href}
                                    label={social.label}
                                    icon={social.icon}
                                    index={index}
                                />
                            ))}
                        </motion.div>
                    </motion.div>
                </motion.div>
            </motion.div>
        </div>
    )
}
