import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Eye, EyeOff, Check, ShieldCheck } from 'lucide-react'
import { authService } from '../lib/auth'
import { useDeviceType } from '../hooks/useDeviceType'

export default function Login() {
    const { isMobile } = useDeviceType()
    const navigate = useNavigate()

    // Core states
    const [focused, setFocused] = useState<'email' | 'password' | null>(null)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isError, setIsError] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [rememberMe, setRememberMe] = useState(false)

    // Framer Motion Values for ultra-smooth spring-based tracking
    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)

    // REDUCED DAMPING FOR FASTER, MORE REACTIVE SNAPPING
    const smoothX = useSpring(mouseX, { stiffness: 400, damping: 25 })
    const smoothY = useSpring(mouseY, { stiffness: 400, damping: 25 })

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            // Find center of the left panel (animation side)
            const centerX = isMobile ? window.innerWidth / 2 : window.innerWidth * 0.25
            const centerY = isMobile ? window.innerHeight * 0.2 : window.innerHeight * 0.5

            const dx = e.clientX - centerX
            const dy = e.clientY - centerY

            // atan2 eye tracking math
            const angle = Math.atan2(dy, dx)

            // Distance limit scaling (0 to 1)
            const maxRadius = isMobile ? window.innerWidth / 2 : window.innerWidth / 4
            const distanceMult = Math.min(Math.hypot(dx, dy) / maxRadius, 1)

            mouseX.set(Math.cos(angle) * distanceMult)
            mouseY.set(Math.sin(angle) * distanceMult)
        }

        // Only track mouse globally if not locked onto an input
        if (focused === null) {
            window.addEventListener('mousemove', handleMouseMove)
        }

        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [focused, mouseX, mouseY, isMobile])

    // Dynamic typing bounce
    const typingBounce = focused === 'email' ? ((email.length % 2 === 0) ? -4 : 0) : 0

    // Update tracking logically based on Focus states using the new unit vector [-1, 1] range
    useEffect(() => {
        if (focused === 'email') {
            // Look over at the form input (Right and slightly down)
            const offset = Math.min((email.length / 50), 0.5)
            mouseX.set(0.6 + offset)
            mouseY.set(0.3)
        } else if (focused === 'password' && !showPassword) {
            // Look violently up and away (Left and Up)
            mouseX.set(-0.8)
            mouseY.set(-0.8)
        } else if (focused === 'password' && showPassword) {
            // Surprised expression! Look directly at the form slightly down.
            mouseX.set(0.7)
            mouseY.set(0.4)
        }
    }, [focused, email, showPassword, mouseX, mouseY])

    const triggerError = (msg: string) => {
        setIsError(true)
        setErrorMessage(msg)
        setTimeout(() => { setIsError(false); setErrorMessage(''); }, 2000)
        mouseX.set(0)
        mouseY.set(0)
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        const targetUsername = email.trim() || 'admin';
        const targetPassword = password.trim() || 'admin';

        setIsLoading(true);
        try {
            await authService.login(targetUsername, targetPassword);
            // Seamlessly open the SecureNodeX Control & Audit Dashboard
            if (window.location.port !== '3000') {
                window.location.href = 'http://localhost:3000';
            } else {
                navigate('/dashboard');
            }
        } catch (err: any) {
            triggerError(err.message || "Failed to log in.");
        } finally {
            setIsLoading(false);
        }
    }

    const handleOneClickAdminLogin = async () => {
        setIsLoading(true);
        try {
            await authService.login('admin', 'admin');
            if (window.location.port !== '3000') {
                window.location.href = 'http://localhost:3000';
            } else {
                navigate('/dashboard');
            }
        } catch (error: any) {
            triggerError(error.message || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    }

    // Colors matching the playful reference
    const colors = {
        bgLeft: '#f1f2f6',
        purple: '#6d28d9',
        black: '#111827',
        orange: '#f97316',
        yellow: '#eab308'
    }

    // Helper to generate dynamic eye pupiles that follow `smoothX` and `smoothY` but clamp inside their whites
    // INCREASED MULTIPLIER for more extreme pupil travel
    const eyeX = useTransform(smoothX, [-1, 1], [-8, 8])
    const eyeY = useTransform(smoothY, [-1, 1], [-8, 8])

    // For smaller eyes, less travel
    const smallEyeX = useTransform(smoothX, [-1, 1], [-4, 4])
    const smallEyeY = useTransform(smoothY, [-1, 1], [-4, 4])

    const shakeAnimation = isError ? {
        x: [0, -15, 15, -15, 15, 0],
        transition: { duration: 0.3 }
    } : {}

    return (
        <div className="overflow-x-hidden min-h-screen flex flex-col w-full">
            {/* 100vh Login Section */}
            <motion.div
                initial={{ opacity: 0, filter: 'blur(10px)', scale: 0.98 }}
                animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
                exit={{ opacity: 0, filter: 'blur(10px)', scale: 1.02 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    width: '100%',
                    minHeight: '100vh',
                    fontFamily: "'Inter', sans-serif",
                    background: '#ffffff',
                    overflow: isMobile ? 'auto' : 'hidden' // fixed: allow scroll on mobile
                }}
            >

                {/* LEFT PLAYFUL ILLUSTRATIVE SIDE */}
                <motion.div
                    initial={{ x: -40, opacity: 0 }}
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
                    {/* Composite Blob Group Container */}
                    <motion.div
                        animate={{ ...shakeAnimation, y: typingBounce }}
                        transition={{ type: 'spring', bounce: 0.6 }} // bouncy group
                        style={{
                            position: 'relative',
                            width: '320px',
                            height: '320px',
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'center',
                            transform: isMobile ? 'scale(0.8)' : 'scale(1)'
                        }}
                    >
                        {/* The Purple Tall Blob */}
                        <motion.div
                            animate={{
                                y: focused === 'password' && !showPassword ? 0 : (focused === 'email' ? -5 : 0),
                                x: focused === 'email' ? 25 : 0, // Peeks curiously toward the right form
                                skewX: focused === 'password' && !showPassword ? 5 : (focused === 'email' ? -8 : 4),
                                scaleY: focused === 'email' ? 1.05 : 1
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
                                {focused === 'password' && !showPassword ? (
                                    <>
                                        <div style={{ width: '12px', height: '2px', background: '#000', borderRadius: '1px' }} />
                                        <div style={{ width: '12px', height: '2px', background: '#000', borderRadius: '1px' }} />
                                    </>
                                ) : (
                                    <>
                                        {/* Left Pupal */}
                                        <motion.div
                                            animate={{ scaleY: focused === 'password' && showPassword ? 1.5 : 1 }}
                                            style={{ width: '6px', height: '14px', background: '#000', borderRadius: '3px', x: smallEyeX, y: smallEyeY }}
                                        />
                                        {/* Right Pupal */}
                                        <motion.div
                                            animate={{ scaleY: focused === 'password' && showPassword ? 1.5 : 1 }}
                                            style={{ width: '6px', height: '14px', background: '#000', borderRadius: '3px', x: smallEyeX, y: smallEyeY }}
                                        />
                                    </>
                                )}
                            </div>
                        </motion.div>

                        {/* The Black Leaner Blob */}
                        <motion.div
                            animate={{
                                skewX: focused === 'password' && !showPassword ? -15 : (focused === 'email' ? 0 : -5),
                                y: focused === 'password' && !showPassword ? 10 : 0
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
                                {focused === 'password' && !showPassword ? (
                                    <>
                                        <div style={{ width: '16px', height: '2px', background: '#fff', borderRadius: '1px', transform: 'rotate(5deg)' }} />
                                        <div style={{ width: '16px', height: '2px', background: '#fff', borderRadius: '1px', transform: 'rotate(5deg)' }} />
                                    </>
                                ) : (
                                    <>
                                        {/* Left Eye */}
                                        <motion.div
                                            animate={{
                                                scale: focused === 'password' && showPassword ? 1.3 : 1 // Bug out eyes when looking at password
                                            }}
                                            style={{ width: '20px', height: '20px', background: '#fff', borderRadius: '50%', position: 'relative', overflow: 'hidden' }}>
                                            <motion.div style={{ width: '10px', height: '10px', background: '#000', borderRadius: '50%', position: 'absolute', top: '5px', left: '5px', x: eyeX, y: eyeY }} />
                                        </motion.div>
                                        {/* Right Eye */}
                                        <motion.div
                                            animate={{
                                                scale: focused === 'password' && showPassword ? 1.3 : 1
                                            }}
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
                                y: focused === 'password' && !showPassword ? 20 : 0,
                                scale: focused === 'password' && !showPassword ? 0.9 : (focused === 'email' ? 1.05 : 1)
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
                                    animate={{ marginTop: focused === 'password' && !showPassword ? 10 : 0 }}
                                    style={{ width: '8px', height: '8px', background: '#5c1b04', borderRadius: '50%', x: smallEyeX, y: smallEyeY }}
                                />
                                <motion.div style={{ width: '8px', height: '8px', background: '#5c1b04', borderRadius: '50%', x: smallEyeX, y: smallEyeY }} />
                            </div>
                        </motion.div>

                        {/* The Yellow Pill Blob (Right) */}
                        <motion.div
                            animate={{
                                x: focused === 'password' && !showPassword ? 10 : (focused === 'email' ? -10 : 0),
                                skewX: 0,
                                y: focused === 'password' && showPassword ? [0, -25, 0] : 0 // Surprised bounce
                            }}
                            transition={
                                focused === 'password' && showPassword
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
                                {focused === 'password' && !showPassword ? (
                                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>X</div>
                                ) : (
                                    <motion.div style={{ width: '8px', height: '8px', background: '#000', borderRadius: '50%', x: smallEyeX, y: smallEyeY }} />
                                )}
                                {/* Mouth Line */}
                                <div style={{ width: '20px', height: '4px', background: '#000', borderRadius: '2px', marginLeft: '4px' }} />
                            </div>
                        </motion.div>

                        {/* Ground Line anchored below all blocks */}
                        <div style={{
                            position: 'absolute',
                            bottom: '18px',
                            left: '-20px',
                            right: '-20px',
                            height: '2px',
                            background: '#e2e8f0', // faint ground indicator
                            zIndex: 0
                        }} />

                    </motion.div>
                </motion.div>

                {/* RIGHT MINIMALIST FORM SIDE */}
                <motion.div
                    initial={{ x: 40, opacity: 0 }}
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

                        {/* Top Sparkle Icon */}
                        <div style={{ marginBottom: '32px' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="#111827" />
                            </svg>
                        </div>

                        {/* Header */}
                        <h1 style={{
                            fontSize: '32px',
                            fontWeight: 800,
                            color: '#111827',
                            margin: '0 0 8px 0',
                            fontFamily: "'Inter', sans-serif"
                        }}>
                            Welcome back!
                        </h1>

                        <p style={{
                            fontSize: '13px',
                            color: '#6b7280',
                            margin: '0 0 40px 0',
                            fontWeight: 500
                        }}>
                            Please enter your details
                        </p>

                        {/* Error Message Space (Optional Toast) */}
                        {errorMessage && (
                            <div style={{ width: '100%', padding: '12px', background: '#fee2e2', color: '#dc2626', fontSize: '13px', borderRadius: '8px', marginBottom: '24px', textAlign: 'center', fontWeight: 500 }}>
                                {errorMessage}
                            </div>
                        )}

                        <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                            {/* Email Input */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: '#111827', textTransform: 'lowercase', letterSpacing: '0.02em' }}>
                                    Email
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="operator@securenodex.com"
                                        style={{
                                            width: '100%',
                                            padding: '8px 0',
                                            border: 'none',
                                            borderBottom: focused === 'email' ? '2px solid #111827' : '1px solid #d1d5db',
                                            background: 'transparent',
                                            fontSize: '15px',
                                            color: '#111827',
                                            fontWeight: 500,
                                            fontFamily: "'Inter', sans-serif",
                                            transition: 'all 0.2s',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                        onFocus={() => setFocused('email')}
                                        onBlur={() => setFocused(null)}
                                    />
                                </div>
                            </div>

                            {/* Password Input */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: '#111827', textTransform: 'lowercase', letterSpacing: '0.02em' }}>
                                    Password
                                </label>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        style={{
                                            width: '100%',
                                            padding: '8px 40px 8px 0',
                                            border: 'none',
                                            borderBottom: focused === 'password' ? '2px solid #111827' : '1px solid #d1d5db',
                                            background: 'transparent',
                                            fontSize: '15px',
                                            color: '#111827',
                                            fontWeight: 800,
                                            letterSpacing: '0.1em',
                                            fontFamily: "'Inter', sans-serif",
                                            transition: 'all 0.2s',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                        onFocus={() => setFocused('password')}
                                        onBlur={() => setFocused(null)}
                                    />
                                    {/* Toggle Icon */}
                                    <div
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{
                                            position: 'absolute',
                                            right: '0',
                                            cursor: 'pointer',
                                            color: '#6b7280',
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '4px'
                                        }}
                                    >
                                        {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                                    </div>
                                </div>
                            </div>

                            {/* Actions Row (Remember & Forgot) */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '-8px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <div style={{
                                        width: '16px',
                                        height: '16px',
                                        borderRadius: '4px',
                                        border: rememberMe ? 'none' : '1px solid #d1d5db',
                                        background: rememberMe ? '#111827' : '#ffffff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.2s'
                                    }}>
                                        {rememberMe && <Check size={12} color="#ffffff" strokeWidth={3} />}
                                    </div>
                                    <input
                                        type="checkbox"
                                        style={{ display: 'none' }}
                                        checked={rememberMe}
                                        onChange={() => setRememberMe(!rememberMe)}
                                    />
                                    <span style={{ fontSize: '11px', color: '#4b5563', fontWeight: 500 }}>Remember for 30 days</span>
                                </label>
                                <a href="#" style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500, textDecoration: 'none' }}>
                                    Forgot password?
                                </a>
                            </div>

                            {/* Buttons container */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                                {/* Primary Log In */}
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    disabled={isLoading}
                                    style={{
                                        width: '100%',
                                        padding: '14px',
                                        borderRadius: '999px',
                                        background: '#111827',
                                        border: 'none',
                                        color: '#ffffff',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        cursor: isLoading ? 'not-allowed' : 'pointer',
                                        boxShadow: '0 4px 12px rgba(17, 24, 39, 0.15)',
                                        transition: 'background 0.2s',
                                        opacity: isLoading ? 0.7 : 1
                                    }}
                                >
                                    {isLoading ? 'Authenticating...' : 'Log In'}
                                </motion.button>

                                {/* One-Click Cluster Dashboard Access */}
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="button"
                                    onClick={handleOneClickAdminLogin}
                                    style={{
                                        width: '100%',
                                        padding: '14px',
                                        borderRadius: '999px',
                                        background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                        border: 'none',
                                        color: '#ffffff',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <ShieldCheck size={18} />
                                    Launch SecureNodeX Cluster Dashboard
                                </motion.button>
                            </div>
                        </form>

                        {/* Bottom Signup Link */}
                        <div style={{ marginTop: '32px', fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>
                            Don't have an account?{' '}
                            <Link to="/signup" style={{ color: '#111827', fontWeight: 700, textDecoration: 'none' }}>
                                Sign Up
                            </Link>
                        </div>

                    </div>
                </motion.div>
            </motion.div>
        </div>
    )
}
