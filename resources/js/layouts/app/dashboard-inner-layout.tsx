import type { ReactNode } from 'react';
import React from 'react';

interface DashboardInnerLayoutProps {
    children: ReactNode;
}

const DashboardInnerLayout = ({ children }: DashboardInnerLayoutProps) => {
    return (
        <main className="flex-1 overflow-auto">
            <div className="mx-auto flex h-full w-full flex-col p-2 md:p-4">
                {children}
            </div>
        </main>
    );
};

export default DashboardInnerLayout;
