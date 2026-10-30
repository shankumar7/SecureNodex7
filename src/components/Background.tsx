const Background = ({ showGrid = true }: { showGrid?: boolean }) => {
    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                overflow: 'hidden',
                background: 'linear-gradient(160deg, #faf9ff 0%, #f0eeff 25%, #ffffff 50%, #eef4ff 75%, #fdf2f8 100%)',
                zIndex: 0,
            }}
        >
            {/* Large ambient blobs - fade them out slightly too for cleaner look */}
            <div
                className="animate-aurora-1"
                style={{
                    position: 'absolute',
                    top: '-20%',
                    left: '-15%',
                    width: '55%',
                    height: '65%',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, rgba(139, 92, 246, 0.04) 40%, transparent 70%)',
                    filter: 'blur(60px)',
                    opacity: showGrid ? 1 : 0.4,
                    transition: 'opacity 0.8s ease',
                }}
            />
            <div
                className="animate-aurora-2"
                style={{
                    position: 'absolute',
                    top: '20%',
                    right: '-20%',
                    width: '50%',
                    height: '60%',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, rgba(59, 130, 246, 0.04) 40%, transparent 70%)',
                    filter: 'blur(60px)',
                    opacity: showGrid ? 1 : 0.4,
                    transition: 'opacity 0.8s ease',
                }}
            />
            <div
                className="animate-aurora-3"
                style={{
                    position: 'absolute',
                    bottom: '-25%',
                    left: '30%',
                    width: '45%',
                    height: '55%',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(236, 72, 153, 0.07) 0%, rgba(244, 114, 182, 0.03) 40%, transparent 70%)',
                    filter: 'blur(60px)',
                    opacity: showGrid ? 1 : 0.4,
                    transition: 'opacity 0.8s ease',
                }}
            />

            {/* Accent orb — top-right warm */}
            <div
                className="animate-aurora-1"
                style={{
                    position: 'absolute',
                    top: '5%',
                    right: '10%',
                    width: '20%',
                    height: '25%',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(251, 191, 36, 0.06) 0%, transparent 70%)',
                    filter: 'blur(50px)',
                    opacity: showGrid ? 1 : 0.4,
                    transition: 'opacity 0.8s ease',
                }}
            />

            {/* Refined grid — very subtle with radial mask */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `
            linear-gradient(rgba(139, 92, 246, 0.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.12) 1px, transparent 1px)
          `,
                    backgroundSize: '80px 80px',
                    maskImage: `
              radial-gradient(ellipse 40% 35% at 50% 45%, transparent 0%, rgba(0,0,0,0.3) 60%, black 100%),
              radial-gradient(circle 120px at 15% 25%, transparent 0%, black 100%),
              radial-gradient(circle 100px at 80% 70%, transparent 0%, black 100%),
              radial-gradient(circle 80px at 70% 20%, transparent 0%, black 100%),
              radial-gradient(circle 90px at 25% 75%, transparent 0%, black 100%)
            `,
                    maskComposite: 'intersect',
                    WebkitMaskImage: `
              radial-gradient(ellipse 40% 35% at 50% 45%, transparent 0%, rgba(0,0,0,0.3) 60%, black 100%),
              radial-gradient(circle 120px at 15% 25%, transparent 0%, black 100%),
              radial-gradient(circle 100px at 80% 70%, transparent 0%, black 100%),
              radial-gradient(circle 80px at 70% 20%, transparent 0%, black 100%),
              radial-gradient(circle 90px at 25% 75%, transparent 0%, black 100%)
            `,
                    WebkitMaskComposite: 'source-in' as any,
                    opacity: showGrid ? 0.12 : 0, // Fade out grid completely
                    transition: 'opacity 0.8s ease',
                    animation: 'gridDrift 20s linear infinite',
                }}
            />

            {/* Floating particles — refined */}
            {[
                { top: '12%', left: '15%', size: 3, color: 'rgba(139, 92, 246, 0.25)', anim: 1 },
                { top: '25%', left: '80%', size: 2, color: 'rgba(99, 102, 241, 0.2)', anim: 2 },
                { top: '55%', left: '70%', size: 4, color: 'rgba(236, 72, 153, 0.15)', anim: 3 },
                { top: '70%', left: '20%', size: 2, color: 'rgba(59, 130, 246, 0.2)', anim: 1 },
                { top: '40%', left: '90%', size: 3, color: 'rgba(139, 92, 246, 0.18)', anim: 2 },
            ].map((p, i) => (
                <div
                    key={i}
                    className={`animate-float-${p.anim}`}
                    style={{
                        position: 'absolute',
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                        borderRadius: '50%',
                        backgroundColor: p.color,
                        boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
                        top: p.top,
                        left: p.left,
                    }}
                />
            ))}

            {/* Subtle noise overlay for texture */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0.015,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                    backgroundSize: '128px 128px',
                }}
            />
        </div>
    );
};

export default Background;
