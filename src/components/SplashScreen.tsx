import { useState, useEffect } from 'react';
import splashImg from '../assets/Splash_image.png';

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
    const [fadeOut, setFadeOut] = useState(false);
    const [dots, setDots] = useState('');

    useEffect(() => {
        const interval = setInterval(() => {
            setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
        }, 400);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setFadeOut(true);
            setTimeout(onFinish, 300);
        }, 1500);
        return () => clearTimeout(timer);
    }, [onFinish]);

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'rgba(250, 249, 255, 0.6)',
                backdropFilter: 'blur(20px) saturate(160%)',
                WebkitBackdropFilter: 'blur(20px) saturate(160%)',
                transition: 'opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
                opacity: fadeOut ? 0 : 1,
                pointerEvents: fadeOut ? 'none' : 'auto',
            }}
        >
            {/* Glow pulse behind spinner */}
            <div
                style={{
                    position: 'absolute',
                    width: '200px',
                    height: '200px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 70%)',
                    filter: 'blur(30px)',
                    animation: 'pulseGlow 2.5s ease-in-out infinite',
                }}
            />

            {/* Spinner container */}
            <div
                style={{
                    position: 'relative',
                    width: '100px',
                    height: '100px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {/* Outer ring — gradient stroke effect */}
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '50%',
                        border: '2px solid rgba(139, 92, 246, 0.08)',
                        borderTopColor: 'rgba(139, 92, 246, 0.6)',
                        borderRightColor: 'rgba(99, 102, 241, 0.3)',
                        animation: 'splashSpin 1.8s linear infinite',
                        filter: 'drop-shadow(0 0 3px rgba(139, 92, 246, 0.2))',
                    }}
                />

                {/* Inner ring */}
                <div
                    style={{
                        position: 'absolute',
                        inset: '8px',
                        borderRadius: '50%',
                        border: '1.5px solid rgba(99, 102, 241, 0.06)',
                        borderBottomColor: 'rgba(99, 102, 241, 0.4)',
                        borderLeftColor: 'rgba(139, 92, 246, 0.15)',
                        animation: 'splashSpinReverse 1.4s linear infinite',
                    }}
                />

                {/* Image */}
                <img
                    src={splashImg}
                    alt="SecureNodeX"
                    style={{
                        width: '70px',
                        height: '70px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        boxShadow: '0 0 20px rgba(139, 92, 246, 0.1), 0 2px 8px rgba(0, 0, 0, 0.04)',
                        zIndex: 2,
                    }}
                />
            </div>

            {/* Loading text */}
            <div
                style={{
                    marginTop: '24px',
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#6b7280',
                    letterSpacing: '0.25em',
                    textTransform: 'uppercase',
                    width: '110px',
                    textAlign: 'center',
                }}
            >
                Loading{dots}
            </div>

            <style>{`
        @keyframes splashSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes splashSpinReverse {
          to { transform: rotate(-360deg); }
        }
        @keyframes pulseGlow {
          0%, 100% { transform: scale(0.85); opacity: 0.4; }
          50% { transform: scale(1.15); opacity: 0.7; }
        }
      `}</style>
        </div>
    );
};

export default SplashScreen;
