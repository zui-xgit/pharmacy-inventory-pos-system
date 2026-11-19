import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export default function PosLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <SidebarProvider open={false}>
                <AppSidebar />
                <SidebarInset className="">{children}</SidebarInset>
            </SidebarProvider>
        </>
    );
}
