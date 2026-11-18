import { usePage } from '@inertiajs/react';
import { Store } from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { active_shop } = usePage<{
        active_shop: { name: string };
    }>().props;

    return (
        // <header className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border/50 px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
        //     <div className="flex w-full items-center justify-between">
        //         <div className="tborder flex items-center gap-2">
        //             <SidebarTrigger className="-ml-1" />
        //             <Breadcrumbs breadcrumbs={breadcrumbs} />
        //         </div>

        //         <div>{active_shop.name}</div>
        //     </div>
        // </header>

        // <header className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border/50 px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 sm:px-6 md:px-4">
        //     {/* CHANGED: min-w-0 so the left group can truncate instead of pushing the shop name off-screen */}
        //     <div className="flex w-full min-w-0 items-center justify-between gap-2">
        //         {/* CHANGED: min-w-0 + flex-1 so breadcrumbs take available space and truncate */}
        //         <div className="flex min-w-0 flex-1 items-center gap-2">
        //             <SidebarTrigger className="-ml-1 shrink-0" />
        //             <div className="min-w-0 flex-1">
        //                 <Breadcrumbs breadcrumbs={breadcrumbs} />
        //             </div>
        //         </div>

        //         {/* CHANGED: shop name — truncate on small screens, full on md+, with store icon */}
        //         <div className="flex max-w-[40%] min-w-0 items-center gap-1.5 text-sm font-medium text-foreground sm:max-w-[45%]">
        //             <Store className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
        //             <span className="truncate">{active_shop.name}</span>
        //         </div>
        //     </div>
        // </header>
        <header className="flex min-h-16 shrink-0 items-center gap-2 border-b border-sidebar-border/50 px-4 py-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:min-h-12 sm:px-6 md:px-4">
            {/* CHANGED: flex-wrap so shop name can drop to its own line on mobile */}
            <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1">
                {/* CHANGED: breadcrumbs row — take full width on mobile so shop name wraps below */}
                <div className="flex min-w-0 flex-1 items-center gap-2">
                    <SidebarTrigger className="-ml-1 shrink-0" />
                    <div className="min-w-0">
                        <Breadcrumbs breadcrumbs={breadcrumbs} />
                    </div>
                </div>

                {/* CHANGED: shop name — right-aligned on all sizes (justify-end); wraps below on mobile */}
                <div className="flex w-full items-center justify-end gap-1.5 text-sm font-medium text-foreground sm:w-auto">
                    <Store className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-right break-words">
                        {active_shop.name}
                    </span>
                </div>
            </div>
        </header>
    );
}
