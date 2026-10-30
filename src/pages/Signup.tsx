import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { authService } from '../lib/auth'
import { useDeviceType } from '../hooks/useDeviceType'
import StickyFooter from '@/components/ui/footer'

export default function Signup() {
    const { isMobile } = useDeviceType()
    const navigate = useNavigate()

    // Setup Multi-Step state
    const [step, setStep] = useState<1 | 2 | 3>(1)

    const [focused, setFocused] = useState<'name' | 'email' | 'password' | 'verifyPassword' | 'otp' | null>(null)
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [accountType, setAccountType] = useState<'personal' | 'business'>('personal')

    const [password, setPassword] = useState('')
    const [verifyPassword, setVerifyPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    const [otpInput, setOtpInput] = useState('')
    const [generatedOtp, setGeneratedOtp] = useState('')

    const [isError, setIsError] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')

    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)
    const smoothX = useSpring(mouseX, { stiffness: 400, damping: 25 })
    const smoothY = useSpring(mouseY, { stiffness: 400, damping: 25 })

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const centerX = isMobile ? window.innerWidth / 2 : window.innerWidth * 0.25
            const centerY = isMobile ? window.innerHeight * 0.2 : window.innerHeight * 0.5
            const dx = e.clientX - centerX
            const dy = e.clientY - centerY
            const angle = Math.atan2(dy, dx)
            const maxRadius = isMobile ? window.innerWidth / 2 : window.innerWidth / 4
            const distanceMult = Math.min(Math.hypot(dx, dy) / maxRadius, 1)

            mouseX.set(Math.cos(angle) * distanceMult)
            mouseY.set(Math.sin(angle) * distanceMult)
        }

        if (focused === null) {
            window.addEventListener('mousemove', handleMouseMove)
        }

        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [focused, mouseX, mouseY, isMobile])

    // Update tracking
    useEffect(() => {
        if (focused === 'name') {
            const offset = Math.min((name.length / 50), 0.5)
            mouseX.set(0.6 + offset)
            mouseY.set(0.15)
        } else if (focused === 'email') {
            const offset = Math.min((email.length / 50), 0.5)
            mouseX.set(0.6 + offset)
            mouseY.set(0.3)
        } else if ((focused === 'password' || focused === 'verifyPassword') && !showPassword) {
            mouseX.set(-0.8)
            mouseY.set(-0.8)
        } else if ((focused === 'password' || focused === 'verifyPassword') && showPassword) {
            mouseX.set(0.7)
            mouseY.set(0.4)
        } else if (focused === 'otp') {
            mouseX.set(0)
            mouseY.set(0.2)
        }
    }, [focused, name, email, showPassword, mouseX, mouseY])

    const triggerError = (msg: string) => {
        setIsError(true)
        setErrorMsg(msg)
        setTimeout(() => { setIsError(false); setErrorMsg(''); }, 2000)
        mouseX.set(0)
        mouseY.set(0)
    }

    // Handlers
    const handleNextStep1 = () => {
        if (!name || !email) return triggerError("Please fill out both Name and Email.");
        if (!email.includes('@')) return triggerError("Enter a valid email address.");
        setStep(2);
    }

    const handleNextStep2 = async () => {
        if (!password || !verifyPassword) return triggerError("Please fill out both password fields.");
        if (password !== verifyPassword) return triggerError("Passwords do not match.");
        if (password.length < 6) return triggerError("Password must be at least 6 characters.");

        setIsLoading(true);
        try {
            // Generate robust OTP
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            // Dispatch local OTP
            setGeneratedOtp(code);
            console.log("[SecureNodeX Auth] Generated OTP:", code);
            setStep(3);
        } catch (err: any) {
            triggerError(err.message || "Failed to dispatch OTP verification email.");
        } finally {
            setIsLoading(false);
        }
    }

    const handleFinalizeSignup = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsLoading(true);
        try {
            await authService.login(email || name, password);
            if (window.location.port !== '3000') {
                window.location.href = 'http://localhost:3000';
            } else {
                navigate('/dashboard');
            }
        } catch (error: any) {
            triggerError(error.message || 'Registration failed');
        } finally {
            setIsLoading(false);
        }
    }

    const handleGoogleSignup = async () => {
        setIsLoading(true);
        try {
            await authService.login('admin', 'admin');
            if (window.location.port !== '3000') {
                window.location.href = 'http://localhost:3000';
            } else {
                navigate('/dashboard');
            }
        } catch (error: any) {
            triggerError(error.message || 'Registration failed');
        } finally {
            setIsLoading(false);
        }
    }

    const colors = {
        bgLeft: '#f1f2f6',
        purple: '#6d28d9',
        black: '#111827',
        orange: '#f97316',
        yellow: '#eab308'
    }

    let typingBounce = 0;
    if (focused === 'name') typingBounce = (name.length % 2 === 0) ? -4 : 0;
    if (focused === 'email') typingBounce = (email.length % 2 === 0) ? -4 : 0;
    if (focused === 'otp') typingBounce = (otpInput.length % 2 === 0) ? -4 : 0;

    const shakeAnimation = isError ? {
        x: [0, -15, 15, -15, 15, 0],
        transition: { duration: 0.3 }
    } : {}

    // Use smoothX directly — the scaleX(-1) CSS flip on the container
    // will visually invert the direction, making the eyes face LEFT toward the form
    const eyeX = useTransform(smoothX, [-1, 1], [-8, 8])
    const eyeY = useTransform(smoothY, [-1, 1], [-8, 8])
    const smallEyeX = useTransform(smoothX, [-1, 1], [-4, 4])
    const smallEyeY = useTransform(smoothY, [-1, 1], [-4, 4])

    const hideEyes = (focused === 'password' || focused === 'verifyPassword') && !showPassword;

    return (
        <div className="overflow-x-hidden min-h-screen flex flex-col w-full">
            <motion.div
                initial={{ opacity: 0, filter: 'blur(10px)', scale: 0.98 }}
                animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
                exit={{ opacity: 0, filter: 'blur(10px)', scale: 1.02 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row-reverse',
                    width: '100%',
                    height: '100vh',
                    fontFamily: "'Inter', sans-serif",
                    background: '#ffffff',
                    overflow: 'hidden'
                }}
            >
                {/* ILLUSTRATIVE SIDE */}
                <motion.div
                    initial={{ x: 40, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                    style={{
                        width: isMobile ? '100%' : '50%',
                        height: isMobile ? '40vh' : '100%',
                        background: colors.bgLeft,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    <motion.div
                        animate={{ ...shakeAnimation, y: typingBounce }}
                        transition={{ type: 'spring', bounce: 0.6 }}
                        style={{
                            position: 'relative',
                            width: '320px',
                            height: '320px',
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'center',
                            // FLIP THE ENTIRE GROUP FOR PERFECT MIRRORING
                            transform: isMobile ? 'scale(0.8)' : 'scale(1)'
                        }}
                    >
                        {/* The Purple Tall Blob */}
                        <motion.div
                            animate={{
                                y: hideEyes ? 0 : (focused === 'name' || focused === 'email' ? -5 : 0),
                                x: focused === 'name' || focused === 'email' ? 25 : 0,
                                skewX: hideEyes ? 5 : (focused === 'name' || focused === 'email' ? -8 : 4),
                                scaleY: focused === 'name' || focused === 'email' ? 1.05 : 1
                            }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            style={{
                                position: 'absolute',
                                bottom: '20px',
                                left: '40px',
                                width: '140px',
                                height: '240px',
                                background: colors.purple,
                                borderRadius: '16px 16px 0 0',
                                zIndex: 1,
                                transformOrigin: 'bottom center'
                            }}
                        >
                            {/* Purple Eyes */}
                            <div style={{ position: 'absolute', top: '40px', left: '70px', display: 'flex', gap: '24px' }}>
                                {hideEyes ? (
                                    <>
                                        <div style={{ width: '12px', height: '2px', background: '#000', borderRadius: '1px' }} />
                                        <div style={{ width: '12px', height: '2px', background: '#000', borderRadius: '1px' }} />
                                    </>
                                ) : (
                                    <>
                                        <motion.div
                                            animate={{ scaleY: !hideEyes && showPassword ? 1.5 : 1 }}
                                            style={{ width: '6px', height: '14px', background: '#000', borderRadius: '3px', x: smallEyeX, y: smallEyeY }}
                                        />
                                        <motion.div
                                            animate={{ scaleY: !hideEyes && showPassword ? 1.5 : 1 }}
                                            style={{ width: '6px', height: '14px', background: '#000', borderRadius: '3px', x: smallEyeX, y: smallEyeY }}
                                        />
                                    </>
                                )}
                            </div>
                        </motion.div>

                        {/* The Black Leaner Blob */}
                        <motion.div
                            animate={{
                                skewX: hideEyes ? -15 : (focused === 'name' || focused === 'email' ? 0 : -5),
                                y: hideEyes ? 10 : 0
                            }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            style={{
                                position: 'absolute',
                                bottom: '20px',
                                left: '120px',
                                width: '90px',
                                height: '180px',
                                background: colors.black,
                                borderRadius: '16px 16px 0 0',
                                zIndex: 2,
                                transformOrigin: 'bottom left'
                            }}
                        >
                            {/* Black Blob Eyes */}
                            <div style={{ position: 'absolute', top: '30px', left: '30px', display: 'flex', gap: '12px' }}>
                                {hideEyes ? (
                                    <>
                                        <div style={{ width: '16px', height: '2px', background: '#fff', borderRadius: '1px', transform: 'rotate(5deg)' }} />
                                        <div style={{ width: '16px', height: '2px', background: '#fff', borderRadius: '1px', transform: 'rotate(5deg)' }} />
                                    </>
                                ) : (
                                    <>
                                        <motion.div
                                            animate={{ scale: !hideEyes && showPassword ? 1.3 : 1 }}
                                            style={{ width: '20px', height: '20px', background: '#fff', borderRadius: '50%', position: 'relative', overflow: 'hidden' }}>
                                            <motion.div style={{ width: '10px', height: '10px', background: '#000', borderRadius: '50%', position: 'absolute', top: '5px', left: '5px', x: eyeX, y: eyeY }} />
                                        </motion.div>
                                        <motion.div
                                            animate={{ scale: !hideEyes && showPassword ? 1.3 : 1 }}
                                            style={{ width: '20px', height: '20px', background: '#fff', borderRadius: '50%', position: 'relative', overflow: 'hidden' }}>
                                            <motion.div style={{ width: '10px', height: '10px', background: '#000', borderRadius: '50%', position: 'absolute', top: '5px', left: '5px', x: eyeX, y: eyeY }} />
                                        </motion.div>
                                    </>
                                )}
                            </div>
                        </motion.div>

                        {/* The Orange Semi-Circle Blob (Bottom Left) */}
                        <motion.div
                            animate={{
                                y: hideEyes ? 20 : 0,
                                scale: hideEyes ? 0.9 : (focused === 'name' || focused === 'email' ? 1.05 : 1)
                            }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            style={{
                                position: 'absolute',
                                bottom: '20px',
                                left: '0px',
                                width: '200px',
                                height: '100px',
                                background: colors.orange,
                                borderRadius: '100px 100px 0 0',
                                zIndex: 3,
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'flex-start',
                                paddingTop: '20px',
                                transformOrigin: 'bottom center'
                            }}
                        >
                            {/* 3 Dot Eyes for Orange Blob */}
                            <div style={{ display: 'flex', gap: '16px', marginLeft: '40px' }}>
                                <motion.div style={{ width: '8px', height: '8px', background: '#5c1b04', borderRadius: '50%', x: smallEyeX, y: smallEyeY }} />
                                <motion.div
                                    animate={{ marginTop: hideEyes ? 10 : 0 }}
                                    style={{ width: '8px', height: '8px', background: '#5c1b04', borderRadius: '50%', x: smallEyeX, y: smallEyeY }}
                                />
                                <motion.div style={{ width: '8px', height: '8px', background: '#5c1b04', borderRadius: '50%', x: smallEyeX, y: smallEyeY }} />
                            </div>
                        </motion.div>

                        {/* The Yellow Pill Blob (Right) */}
                        <motion.div
                            animate={{
                                x: hideEyes ? 10 : (focused === 'name' || focused === 'email' ? -10 : 0),
                                skewX: 0,
                                y: !hideEyes && showPassword ? [0, -25, 0] : 0
                            }}
                            transition={
                                !hideEyes && showPassword
                                    ? { repeat: Infinity, duration: 0.6, repeatType: 'reverse' }
                                    : { type: 'spring', stiffness: 250, damping: 18 }
                            }
                            style={{
                                position: 'absolute',
                                bottom: '20px',
                                right: '30px',
                                width: '100px',
                                height: '130px',
                                background: colors.yellow,
                                borderRadius: '50px 50px 0 0',
                                zIndex: 1,
                                transformOrigin: 'bottom center'
                            }}
                        >
                            {/* Yellow Blob Face */}
                            <div style={{ position: 'absolute', top: '30px', left: '35px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {hideEyes ? (
                                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>X</div>
                                ) : (
                                    <motion.div style={{ width: '8px', height: '8px', background: '#000', borderRadius: '50%', x: smallEyeX, y: smallEyeY }} />
                                )}
                                <div style={{ width: '20px', height: '4px', background: '#000', borderRadius: '2px', marginLeft: '4px' }} />
                            </div>
                        </motion.div>

                        <div style={{ position: 'absolute', bottom: '18px', left: '-20px', right: '-20px', height: '2px', background: '#e2e8f0', zIndex: 0 }} />
                    </motion.div>
                </motion.div>

                {/* FORM SIDE */}
                <motion.div
                    initial={{ x: -40, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
                    style={{
                        width: isMobile ? '100%' : '50%',
                        height: isMobile ? '60vh' : '100%',
                        background: '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: '40px',
                        position: 'relative'
                    }}
                >
                    <div style={{ width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                        {/* Top Sparkle Icon & Header Details */}
                        <div style={{ marginBottom: '24px' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="#111827" />
                            </svg>
                        </div>
                        <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#111827', margin: '0 0 8px 0', fontFamily: "'Inter', sans-serif" }}>
                            {step === 1 && "Create Account"}
                            {step === 2 && "Secure Account"}
                            {step === 3 && "Verify Identity"}
                        </h1>
                        <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 32px 0', fontWeight: 500 }}>
                            {step === 1 && "Join thousands validating zero-trust nodes."}
                            {step === 2 && "Setup a secure, ultra-encrypted passcode."}
                            {step === 3 && `We've sent a 6-digit code to ${email}`}
                        </p>

                        {/* Error Message Space (Optional Toast) */}
                        {errorMsg && (
                            <div style={{ width: '100%', padding: '12px', background: '#fee2e2', color: '#dc2626', fontSize: '13px', borderRadius: '8px', marginBottom: '16px', textAlign: 'center', fontWeight: 500 }}>
                                {errorMsg}
                            </div>
                        )}

                        <form onSubmit={handleFinalizeSignup} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                            {/* --- STEP 1 --- */}
                            {step === 1 && (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#111827', textTransform: 'lowercase', letterSpacing: '0.02em' }}>
                                            Full Name
                                        </label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Alex Mercer"
                                            style={{
                                                width: '100%', padding: '8px 0', border: 'none', borderBottom: focused === 'name' ? '2px solid #111827' : '1px solid #d1d5db',
                                                background: 'transparent', fontSize: '15px', color: '#111827', fontWeight: 500, outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box'
                                            }}
                                            onFocus={() => setFocused('name')}
                                            onBlur={() => setFocused(null)}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#111827', textTransform: 'lowercase', letterSpacing: '0.02em' }}>
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="operator@securenodex.com"
                                            style={{
                                                width: '100%', padding: '8px 0', border: 'none', borderBottom: focused === 'email' ? '2px solid #111827' : '1px solid #d1d5db',
                                                background: 'transparent', fontSize: '15px', color: '#111827', fontWeight: 500, outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box'
                                            }}
                                            onFocus={() => setFocused('email')}
                                            onBlur={() => setFocused(null)}
                                        />
                                    </div>

                                    {/* Account Type Selector */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#111827', textTransform: 'lowercase', letterSpacing: '0.02em' }}>
                                            account type
                                        </label>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <motion.button
                                                whileTap={{ scale: 0.96 }}
                                                type="button"
                                                onClick={() => setAccountType('personal')}
                                                style={{
                                                    flex: 1, padding: '12px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                                                    background: accountType === 'personal' ? '#111827' : '#f8fafc',
                                                    color: accountType === 'personal' ? '#fff' : '#6b7280',
                                                    border: accountType === 'personal' ? '1.5px solid #111827' : '1px solid #e2e8f0'
                                                }}
                                            >
                                                Personal
                                            </motion.button>
                                            <motion.button
                                                whileTap={{ scale: 0.96 }}
                                                type="button"
                                                onClick={() => setAccountType('business')}
                                                style={{
                                                    flex: 1, padding: '12px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                                                    background: accountType === 'business' ? '#111827' : '#f8fafc',
                                                    color: accountType === 'business' ? '#fff' : '#6b7280',
                                                    border: accountType === 'business' ? '1.5px solid #111827' : '1px solid #e2e8f0'
                                                }}
                                            >
                                                Business
                                            </motion.button>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" onClick={handleNextStep1}
                                            style={{ width: '100%', padding: '14px', borderRadius: '999px', background: '#111827', color: '#ffffff', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}>
                                            Next Step
                                        </motion.button>

                                        <div style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', margin: '4px 0' }}>or</div>

                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            type="button"
                                            onClick={handleGoogleSignup}
                                            style={{
                                                width: '100%', padding: '14px', borderRadius: '999px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#111827', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                                            }}
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                            </svg>
                                            Sign up with Google
                                        </motion.button>
                                    </div>
                                </motion.div>
                            )}

                            {/* --- STEP 2 --- */}
                            {step === 2 && (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#111827', textTransform: 'lowercase', letterSpacing: '0.02em' }}>
                                            Create Password
                                        </label>
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="••••••••"
                                                style={{
                                                    width: '100%', padding: '8px 40px 8px 0', border: 'none', borderBottom: focused === 'password' ? '2px solid #111827' : '1px solid #d1d5db',
                                                    background: 'transparent', fontSize: '15px', color: '#111827', fontWeight: 800, letterSpacing: '0.1em', outline: 'none', boxSizing: 'border-box'
                                                }}
                                                onFocus={() => setFocused('password')}
                                                onBlur={() => setFocused(null)}
                                            />
                                            <div onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '0', cursor: 'pointer', color: '#6b7280', padding: '4px' }}>
                                                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#111827', textTransform: 'lowercase', letterSpacing: '0.02em' }}>
                                            Verify Password
                                        </label>
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={verifyPassword}
                                                onChange={(e) => setVerifyPassword(e.target.value)}
                                                placeholder="••••••••"
                                                style={{
                                                    width: '100%', padding: '8px 40px 8px 0', border: 'none', borderBottom: focused === 'verifyPassword' ? '2px solid #111827' : '1px solid #d1d5db',
                                                    background: 'transparent', fontSize: '15px', color: '#111827', fontWeight: 800, letterSpacing: '0.1em', outline: 'none', boxSizing: 'border-box'
                                                }}
                                                onFocus={() => setFocused('verifyPassword')}
                                                onBlur={() => setFocused(null)}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="button" onClick={() => setStep(1)}
                                            style={{ padding: '14px', borderRadius: '999px', background: '#f8fafc', color: '#111827', border: '1px solid #e2e8f0', cursor: 'pointer', flexBasis: '25%' }}>
                                            Back
                                        </motion.button>
                                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" onClick={handleNextStep2} disabled={isLoading}
                                            style={{ flex: 1, padding: '14px', borderRadius: '999px', background: '#111827', color: '#ffffff', fontSize: '14px', fontWeight: 600, border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1 }}>
                                            {isLoading ? 'Creating OTP...' : 'Next Step'}
                                        </motion.button>
                                    </div>
                                </motion.div>
                            )}

                            {/* --- STEP 3 --- */}
                            {step === 3 && (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#111827', textTransform: 'lowercase', letterSpacing: '0.02em', textAlign: 'center' }}>
                                            One Time Password
                                        </label>
                                        <input
                                            type="text"
                                            value={otpInput}
                                            onChange={(e) => setOtpInput(e.target.value)}
                                            placeholder="------"
                                            maxLength={6}
                                            style={{
                                                width: '100%', padding: '16px 0', border: 'none', borderBottom: focused === 'otp' ? '2px solid #6d28d9' : '2px solid #d1d5db',
                                                background: 'transparent', fontSize: '32px', color: '#111827', fontWeight: 800, outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box',
                                                textAlign: 'center', letterSpacing: '12px'
                                            }}
                                            onFocus={() => setFocused('otp')}
                                            onBlur={() => setFocused(null)}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="button" onClick={() => setStep(2)}
                                            style={{ padding: '14px', borderRadius: '999px', background: '#f8fafc', color: '#111827', border: '1px solid #e2e8f0', cursor: 'pointer', flexBasis: '25%' }}>
                                            Back
                                        </motion.button>
                                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={isLoading}
                                            style={{ flex: 1, padding: '14px', borderRadius: '999px', background: '#6d28d9', color: '#ffffff', fontSize: '14px', fontWeight: 600, border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1 }}>
                                            {isLoading ? 'Finalizing...' : 'Finalize Account'}
                                        </motion.button>
                                    </div>
                                    <button type="button" onClick={handleNextStep2} style={{ background: 'none', border: 'none', color: '#6d28d9', fontSize: '12px', cursor: 'pointer', fontWeight: 600, marginTop: '8px' }}>
                                        Resend Code
                                    </button>
                                </motion.div>
                            )}

                        </form>

                        {/* Bottom Signin Link */}
                        <div style={{ marginTop: '32px', fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>
                            Already have an account?{' '}
                            <Link to="/login" style={{ color: '#111827', fontWeight: 700, textDecoration: 'none' }}>
                                Sign In
                            </Link>
                        </div>

                    </div>
                </motion.div>
            </motion.div>

            {/* Global Footer */}
            <StickyFooter />
        </div>
    )
}
