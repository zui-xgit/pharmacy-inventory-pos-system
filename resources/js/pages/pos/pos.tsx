import { Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Backpack,
    CalendarDays,
    Layers,
    Minus,
    Package,
    Plus,
    ReceiptText,
    ScanBarcode,
    SearchX,
    ShoppingCart,
    Sparkles,
    Tag,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmAlertDialog } from '@/components/dialogs/confirm-alert-dialog';
import SearchInput from '@/components/search-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { useCartStore } from '@/hooks/stores/user-cart-store';
import type {
    BatchItem,
    CartItem,
    PosProduct,
} from '@/hooks/stores/user-cart-store';
import DashboardInnerLayout from '@/layouts/app/dashboard-inner-layout';
import { formatCurrency, formatDate, isExpired } from '@/lib/utils';
import shop from '@/routes/shop';
import Heading from '@/components/heading';

export interface PaginatedResponse<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
}

interface PosPageProps {
    // Backend sends an empty collection ([]) until a search is made
    products: PaginatedResponse<PosProduct> | PosProduct[];
    filters: {
        search?: string;
    };
    [key: string]: unknown;
}

export default function PosPage({ products, filters }: PosPageProps) {
    const { url } = usePage<PosPageProps>();

    const searchTerm = filters.search ?? '';
    const currentPath = url.split('?')[0];

    const productList = Array.isArray(products) ? products : products.data;
    const paginationLinks = Array.isArray(products) ? [] : products.links;

    const totalItems = useCartStore((state) => state.getTotalItems());

    return (
        <div className="flex h-screen flex-col gap-4 p-2 md:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <Button
                        variant={'secondary'}
                        className="cursor-pointer"
                        onClick={() => window.history.back()}
                    >
                        <ArrowLeft />
                    </Button>

                    <Heading
                        variant="small"
                        title="POS"
                        description=" Search a product, pick a FEFO batch, then build the
                            order."
                    />
                </div>

                <div className="flex items-center gap-2 sm:w-96">
                    <SearchInput
                        href={currentPath}
                        filters={filters}
                        placeholder="Search product or dosage form..."
                    />
                    <Badge
                        variant="secondary"
                        className="hidden h-9 shrink-0 gap-1.5 px-2.5 sm:inline-flex"
                    >
                        <ShoppingCart className="size-3.5" />
                        {totalItems}
                    </Badge>
                </div>
            </div>

            <div className="grid flex-1 grid-cols-12 gap-3">
                <Card className="col-span-12 lg:col-span-8">
                    <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-sm">
                                    <Package className="size-4 text-primary" />
                                    Products
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    In-stock batches in FEFO order
                                </CardDescription>
                            </div>
                            <Badge variant="outline" className="shrink-0">
                                {productList.length}{' '}
                                {productList.length === 1
                                    ? 'result'
                                    : 'results'}
                            </Badge>
                        </div>
                    </CardHeader>

                    <CardContent>
                        {!searchTerm && <SearchPrompt />}

                        {searchTerm && productList.length === 0 && (
                            <EmptyResults searchTerm={searchTerm} />
                        )}

                        {productList.length > 0 && (
                            <div className="grid gap-3 md:grid-cols-2">
                                {productList.map((product) => (
                                    <ProductCard
                                        key={product.uuid}
                                        product={product}
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>

                    {paginationLinks.length > 3 && (
                        <CardFooter className="flex-wrap justify-center gap-1">
                            {paginationLinks.map((link, index) =>
                                link.url ? (
                                    <Button
                                        key={index}
                                        asChild
                                        size="sm"
                                        variant={
                                            link.active
                                                ? 'default'
                                                : 'secondary'
                                        }
                                    >
                                        <Link
                                            href={link.url}
                                            preserveScroll
                                            dangerouslySetInnerHTML={{
                                                __html: link.label,
                                            }}
                                        />
                                    </Button>
                                ) : (
                                    <span
                                        key={index}
                                        dangerouslySetInnerHTML={{
                                            __html: link.label,
                                        }}
                                        className="px-3 py-1.5 text-xs text-muted-foreground opacity-50"
                                    />
                                ),
                            )}
                        </CardFooter>
                    )}
                </Card>

                <OrderPanel />
            </div>
        </div>
    );
}

function SearchPrompt() {
    return (
        <Empty className="min-h-72 border border-dashed">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <ScanBarcode />
                </EmptyMedia>
                <EmptyTitle>Start a new sale</EmptyTitle>
                <EmptyDescription>
                    Search for a product above to see its available batches and
                    add it to the order.
                </EmptyDescription>
            </EmptyHeader>
        </Empty>
    );
}

function EmptyResults({ searchTerm }: { searchTerm: string }) {
    return (
        <Empty className="border border-dashed">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <SearchX />
                </EmptyMedia>
                <EmptyTitle>No products found</EmptyTitle>
                <EmptyDescription>
                    No active products or in-stock FEFO batches match &ldquo;
                    {searchTerm}&rdquo;.
                </EmptyDescription>
            </EmptyHeader>
        </Empty>
    );
}

function ProductCard({ product }: { product: PosProduct }) {
    const addItem = useCartStore((state) => state.addItem);
    const lowestPrice =
        product.batches[0]?.selling_price ?? product.selling_price;

    return (
        <Card className="gap-3 py-4 shadow-none transition-colors hover:border-primary/40">
            <CardHeader className="px-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <CardTitle className="truncate text-sm">
                            {product.name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                            {product.dosage_form?.name ?? 'No dosage form'}
                        </CardDescription>
                    </div>
                    <Badge
                        variant={
                            product.total_stock <= 10
                                ? 'destructive'
                                : 'outline'
                        }
                        className="shrink-0"
                    >
                        {product.total_stock} in stock
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-2 px-4">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1 font-medium">
                        <Tag className="size-3.5 text-primary" />
                        From {formatCurrency(Number(lowestPrice))}
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <Layers className="size-3.5" />
                        {product.batches.length}{' '}
                        {product.batches.length === 1 ? 'batch' : 'batches'}
                    </span>
                </div>

                {product.batches.map((batch) => (
                    <BatchButton
                        key={batch.id}
                        batch={batch}
                        onSelect={() => addItem(product, batch)}
                    />
                ))}
            </CardContent>
        </Card>
    );
}

function BatchButton({
    batch,
    onSelect,
}: {
    batch: BatchItem;
    onSelect: () => void;
}) {
    const expired = isExpired(batch.expiry_date);

    return (
        <Button
            type="button"
            variant="outline"
            onClick={onSelect}
            className="group h-auto w-full cursor-pointer justify-between gap-2 px-2.5 py-1.5 text-left font-normal"
        >
            <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="truncate text-xs font-semibold">
                        #{batch.batch_number}
                    </span>
                    {expired && (
                        <Badge
                            variant="destructive"
                            className="px-1 py-0 text-[10px]"
                        >
                            Expired
                        </Badge>
                    )}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3" />
                        {formatDate(batch.expiry_date)}
                    </span>
                    <span>{batch.units_remaining} units left</span>
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs font-semibold">
                    {formatCurrency(Number(batch.selling_price))}
                </span>
                <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Plus className="size-3.5" />
                </span>
            </div>
        </Button>
    );
}

function OrderPanel() {
    // active_shop comes from your shared Inertia props (posIndex doesn't send it)
    const { active_shop } = usePage<{ active_shop?: { uuid: string } }>().props;
    const shopUuid = active_shop?.uuid;

    const cart = useCartStore((state) => state.cart);
    const clearCart = useCartStore((state) => state.clearCart);

    const [manualTotal, setManualTotal] = useState<{
        signature: string;
        value: string;
    } | null>(null);
    const [loading, setLoading] = useState(false);

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const recommendedTotal = cart.reduce(
        (sum, item) => sum + item.selling_price * item.quantity,
        0,
    );

    // Tie a manual override to the exact order it was entered for. If the
    // cashier changes the order, the suggested total is used again.
    const cartSignature = cart
        .map((item) => `${item.batch_id}:${item.quantity}`)
        .join('|');
    const isManualTotal = manualTotal?.signature === cartSignature;
    const finalTotalInput = isManualTotal
        ? manualTotal.value
        : recommendedTotal > 0
          ? String(recommendedTotal)
          : '';

    const parsedFinalTotal = Number(finalTotalInput);
    const hasValidFinalTotal =
        finalTotalInput.trim() !== '' &&
        Number.isFinite(parsedFinalTotal) &&
        parsedFinalTotal >= 0;
    const adjustment = hasValidFinalTotal
        ? parsedFinalTotal - recommendedTotal
        : 0;

    const performCheckout = () => {
        if (!cart.length || !hasValidFinalTotal || !shopUuid) {
            return;
        }

        router.post(
            shop.posCheckout({ shop: shopUuid }).url,
            {
                items: cart.map((item) => ({
                    batch_id: item.batch_id,
                    quantity: item.quantity,
                })),
                final_total: parsedFinalTotal,
            },
            {
                preserveScroll: true,
                onStart: () => setLoading(true),
                onSuccess: ({ flash }) => {
                    clearCart();

                    //TODO: FLASH RECEIPTS
                    if (flash.receipt) {
                        console.log(flash.receipt);
                    }
                },
                onError: (errors) => {
                    const message = Object.values(errors)[0];

                    toast.error(message ?? 'Could not complete the sale.', {
                        richColors: true,
                        position: 'top-center',
                    });
                },
                onFinish: () => setLoading(false),
            },
        );
    };

    return (
        <Card className="col-span-12 lg:col-span-4">
            <CardHeader>
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <ReceiptText className="size-4 text-primary" />
                            Current order
                        </CardTitle>
                        <CardDescription className="text-xs">
                            {totalItems} {totalItems === 1 ? 'item' : 'items'}
                        </CardDescription>
                    </div>

                    {cart.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearCart}
                            disabled={loading}
                            className="shrink-0 cursor-pointer text-muted-foreground hover:text-destructive"
                        >
                            <Trash2 className="size-3.5" />
                            Clear
                        </Button>
                    )}
                </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-2">
                {cart.length === 0 ? (
                    <Empty className="min-h-60 border border-dashed">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <ShoppingCart />
                            </EmptyMedia>
                            <EmptyTitle>Your cart is empty</EmptyTitle>
                            <EmptyDescription>
                                Select a batch from the product list to start
                                building this sale.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                ) : (
                    cart.map((item) => (
                        <CartLine key={item.batch_id} item={item} />
                    ))
                )}
            </CardContent>

            {cart.length > 0 && (
                <CardFooter className="flex-col items-stretch gap-3">
                    <Separator />

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Total cost</span>
                        <span className="font-medium text-foreground">
                            {formatCurrency(recommendedTotal)}
                        </span>
                    </div>

                    <div className="flex flex-col gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                        <Label
                            htmlFor="final-total"
                            className="text-xs font-semibold"
                        >
                            Final Cost
                        </Label>

                        <Input
                            id="final-total"
                            type="number"
                            min={0}
                            step="0.01"
                            inputMode="decimal"
                            value={finalTotalInput}
                            onChange={(event) =>
                                setManualTotal({
                                    signature: cartSignature,
                                    value: event.target.value,
                                })
                            }
                        />

                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Sparkles className="size-3 text-primary" />
                            {isManualTotal && adjustment !== 0
                                ? `${adjustment > 0 ? 'Above' : 'Below'} the recommended total by ${formatCurrency(Math.abs(adjustment))}`
                                : 'You can override the final price before checkout.'}
                        </p>
                    </div>

                    <ConfirmAlertDialog
                        trigger={
                            <Button
                                size="lg"
                                className="w-full"
                                disabled={
                                    loading || !hasValidFinalTotal || !shopUuid
                                }
                            >
                                {loading ? (
                                    <Spinner />
                                ) : (
                                    <>
                                        Checkout
                                        <ArrowRight className="size-4" />
                                    </>
                                )}
                            </Button>
                        }
                        title="Confirm checkout"
                        description={
                            <span>
                                Complete this sale for{' '}
                                <span className="font-medium text-foreground">
                                    {totalItems}{' '}
                                    {totalItems === 1 ? 'item' : 'items'}
                                </span>{' '}
                                with a final price of{' '}
                                <span className="font-medium text-foreground">
                                    {hasValidFinalTotal
                                        ? formatCurrency(parsedFinalTotal)
                                        : '—'}
                                </span>
                                ?
                            </span>
                        }
                        actionText="Yes, complete sale"
                        cancelText="Cancel"
                        onConfirm={performCheckout}
                    />
                </CardFooter>
            )}
        </Card>
    );
}

function CartLine({ item }: { item: CartItem }) {
    const [draft, setDraft] = useState<{
        quantity: number;
        value: string;
    } | null>(null);
    const setQuantity = useCartStore((state) => state.setQuantity);
    const updateQuantity = useCartStore((state) => state.updateQuantity);
    const removeItem = useCartStore((state) => state.removeItem);

    const quantityInput =
        draft?.quantity === item.quantity
            ? draft.value
            : item.quantity.toString();

    const isAtMax = item.quantity >= item.max_units;

    return (
        <Card className="gap-2 py-3 shadow-none">
            <CardHeader className="px-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <CardTitle className="truncate text-sm font-medium">
                            {item.product_name}
                        </CardTitle>
                        <CardDescription className="text-[11px]">
                            Batch #{item.batch_number} &middot;{' '}
                            {formatCurrency(item.selling_price)} each
                        </CardDescription>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Remove item"
                        onClick={() => removeItem(item.batch_id)}
                        className="shrink-0 cursor-pointer text-muted-foreground hover:text-destructive"
                    >
                        <Trash2 className="size-3.5" />
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="flex items-center justify-between gap-2 px-3">
                <div className="flex items-center rounded-md border p-0.5">
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Decrease quantity"
                        onClick={() => updateQuantity(item.batch_id, -1)}
                    >
                        <Minus className="size-3" />
                    </Button>

                    <Input
                        type="number"
                        min={1}
                        max={item.max_units}
                        value={quantityInput}
                        onChange={(event) => {
                            const rawValue = event.target.value;
                            setDraft({
                                quantity: item.quantity,
                                value: rawValue,
                            });

                            const parsed = parseInt(rawValue, 10);

                            if (!Number.isNaN(parsed)) {
                                setQuantity(item.batch_id, parsed);
                            }
                        }}
                        onBlur={() => setDraft(null)}
                        className="h-6 w-10 [appearance:textfield] border-0 bg-transparent p-0 text-center text-xs shadow-none focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />

                    <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Increase quantity"
                        disabled={isAtMax}
                        onClick={() => updateQuantity(item.batch_id, 1)}
                        title={isAtMax ? 'Maximum stock reached' : undefined}
                    >
                        <Plus className="size-3" />
                    </Button>
                </div>

                <span className="text-sm font-semibold">
                    {formatCurrency(item.selling_price * item.quantity)}
                </span>
            </CardContent>
        </Card>
    );
}
