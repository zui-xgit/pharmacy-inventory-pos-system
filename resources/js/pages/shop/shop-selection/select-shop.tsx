import { Head, Link, router, usePage } from "@inertiajs/react";
import {
    ArrowRight,
    LocateIcon,
    LogOut,
    MapPin,
    Phone,
    Store,
} from "lucide-react";

import Heading from "@/components/heading";
import SearchInput from "@/components/search-input";
import { logout } from "@/routes";
import type { Auth } from "@/types";
import staff from "@/routes/staff";
import RefreshButton from "@/components/refresh-button";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty";
import ThisShop from "@/routes/shop";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useCartStore } from "@/hooks/stores/user-cart-store";

interface Shop {
    uuid: string;
    name: string;
    location: string;
    address: string | null;
    phone: string | null;
}

interface SelectShopProps {
    shops: Shop[];
    filters: {
        search?: string | null;
    };
}

const ShopCard = ({ shop }: { shop: Shop }) => {
    const clearCart = useCartStore((state) => state.clearCart);
    return (
        <Card
            onClick={() => {
                clearCart();
                router.get(ThisShop.overview({ shop: shop.uuid }));
            }}
            className="group cursor-pointer gap-3 py-3 shadow-xs transition-all hover:border-primary/40 hover:shadow-md"
        >
            <CardHeader className="flex-row items-start">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Store className="h-4 w-4" />
                </span>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col gap-2">
                <div className="space-y-1">
                    <h3 className="text-md truncate font-semibold text-foreground">
                        {shop.name}
                    </h3>

                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {shop.location}
                    </p>
                </div>

                <Separator />

                {(shop.address || shop.phone) && (
                    <div className="space-y-2 text-xs text-muted-foreground">
                        {shop.address && (
                            <div className="flex items-start gap-2">
                                <LocateIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                <dd>{shop.address}</dd>
                            </div>
                        )}
                        {shop.phone && (
                            <div className="flex items-center gap-2">
                                <Phone className="h-3.5 w-3.5 shrink-0" />
                                <dd>{shop.phone}</dd>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>

            <CardFooter>
                <div className="flex w-full items-center justify-between text-sm font-medium">
                    <span className="text-primary">Open shop</span>
                    <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1" />
                </div>
            </CardFooter>
        </Card>
    );
};

export default function SelectShop({ shops, filters }: SelectShopProps) {
    const { auth } = usePage<{ auth: Auth }>().props;

    const hasSearch = Boolean(filters.search?.trim());
    const showSearch = shops.length > 0 || hasSearch;

    return (
        <>
            <Head title="Select Shop" />

            <main className="flex h-screen w-screen">
                <div className="mx-auto flex h-full w-full max-w-7xl flex-col px-4 py-6 md:px-8 md:py-10">
                    {/* Header */}
                    <div className="flex flex-col gap-1 border-b border-border/40 pb-6">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <Store className="h-5 w-5" />
                                </div>

                                <Heading
                                    title={`Welcome, ${auth?.user?.first_name || auth?.user?.firstname || ""} ${auth?.user?.last_name || auth?.user?.lastname || ""}`.trim()}
                                    description="Select the pharmacy branch you want to work in."
                                />
                            </div>

                            <Link
                                href={logout()}
                                as="button"
                                className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                            >
                                <LogOut className="h-4 w-4" />
                                <span className="hidden sm:inline">
                                    Log out
                                </span>
                            </Link>
                        </div>
                    </div>

                    {/* Linked Shops Header & Search */}
                    {showSearch && (
                        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2">
                                <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                                    Linked Shops
                                </h2>

                                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                                    {shops.length}
                                </span>
                            </div>

                            <div className="flex w-full items-center gap-4 sm:max-w-sm">
                                <SearchInput
                                    href={staff.shopsSelect()}
                                    filters={filters}
                                    placeholder="Search by name or location...  (Live search)"
                                />
                                <RefreshButton href={staff.shopsSelect()} />
                            </div>
                        </div>
                    )}

                    {/* Content */}
                    <div className="mt-6 flex-1 overflow-y-auto pb-4">
                        {shops.length > 0 ? (
                            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {shops.map((shop) => (
                                    <ShopCard key={shop.uuid} shop={shop} />
                                ))}
                            </div>
                        ) : hasSearch ? (
                            <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/20 p-12 text-center">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                    <Store className="h-8 w-8" />
                                </div>

                                <h3 className="mt-5 text-base font-semibold text-foreground">
                                    No shops found
                                </h3>

                                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                                    No shops match "{filters.search}". Try a
                                    different shop name or location.
                                </p>
                            </div>
                        ) : (
                            <Empty className="h-full min-h-[300px] border border-dashed border-border/60 bg-muted/20">
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <Store className="h-8 w-8" />
                                    </EmptyMedia>

                                    <EmptyTitle>
                                        No shop assigned yet
                                    </EmptyTitle>

                                    <EmptyDescription className="max-w-sm">
                                        Ask an administrator to link your
                                        account to a pharmacy branch to get
                                        started.
                                    </EmptyDescription>
                                </EmptyHeader>
                            </Empty>
                        )}
                    </div>
                </div>
            </main>
        </>
    );
}

SelectShop.layout = {
    breadcrumbs: [{ title: "Select Shop", href: "#" }],
};
