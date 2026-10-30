import type { ReactNode } from 'react';

interface DesktopLayoutProps {
    children: ReactNode;
}

const DesktopLayout = ({ children }: DesktopLayoutProps) => {
    return (
        <div className="min-h-screen bg-white">
            {children}
        </div>
    );
};

export default DesktopLayout;
