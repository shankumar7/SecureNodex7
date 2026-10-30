import type { ReactNode } from 'react';

interface MobileLayoutProps {
    children: ReactNode;
}

const MobileLayout = ({ children }: MobileLayoutProps) => {
    return (
        <div className="min-h-screen bg-white">
            {children}
        </div>
    );
};

export default MobileLayout;
