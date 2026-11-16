import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    Boxes,
    CalendarClock,
    Printer,
    Receipt,
    Store,
} from 'lucide-react';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import DashboardInnerLayout from '@/layouts/app/dashboard-inner-layout';
import { formatDateTime } from '@/lib/utils';
import shop from '@/routes/shop';
import BackButton from '@/components/back-button';

interface SaleItem {
    uuid: string;
    product: {
        uuid: string | null;
        name: string;
        dosage_form: string | null;
    };
    batch_number: string | null;
    quantity: number;
    unit_price: number;
    subtotal: number;
}

interface Props {
    sale: {
        uuid: string;
        receipt_number: string;
        total_amount: number;
        status: string;
        created_at: string | null;
        sold_by: string | null;
        units_sold: number;
        products_count: number;
    };
    items: SaleItem[];
    shop: {
        uuid: string;
        name: string;
        location: string;
        address: string;
        phone: string;
        currency_symbol: string;
    };
}

const statusBadge = (status: string) => {
    switch (status) {
        case 'completed':
            return (
                <Badge
                    variant="outline"
                    className="border-emerald-500 text-emerald-600 dark:text-emerald-400"
                >
                    Completed
                </Badge>
            );
        case 'refunded':
            return (
                <Badge
                    variant="outline"
                    className="border-amber-500 text-amber-600 dark:text-amber-400"
                >
                    Refunded
                </Badge>
            );
        case 'cancelled':
            return <Badge variant="destructive">Cancelled</Badge>;
        default:
            return <Badge variant="secondary">{status}</Badge>;
    }
};

const SaleInfo = ({ sale, items, shop: saleShop }: Props) => {
    const { active_shop } = usePage<{
        active_shop: { uuid: string };
    }>().props;

    const formatMoney = (amount: number) =>
        `${saleShop.currency_symbol} ${amount.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        })}`;

    const handlePrintReceipt = () => {
        // TODO: implement actual receipt printing later.
        console.log('Print receipt requested', { sale, items, shop: saleShop });
    };

    return (
        <DashboardInnerLayout>
            <Head title={`Sale · ${sale.receipt_number}`} />
            <div className="space-y-4">
                <div className="flex flex-col gap-2">
                    <div>
                        <BackButton />
                    </div>

                    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Receipt className="h-5 w-5" />
                            </div>
                            <Heading
                                variant="small"
                                title={sale.receipt_number}
                                description="Sale receipt details, items sold, and totals."
                            />
                        </div>

                        <Button
                            className="w-full cursor-pointer sm:w-auto"
                            onClick={handlePrintReceipt}
                        >
                            <Printer className="mr-2 h-4 w-4" />
                            Print receipt
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Boxes className="h-4 w-4" />
                                Items sold
                            </CardTitle>
                            <CardDescription>
                                Products and batches included in this
                                transaction.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product</TableHead>
                                            <TableHead>Batch</TableHead>

                                            <TableHead className="text-right">
                                                Qty
                                            </TableHead>
                                            <TableHead className="text-right">
                                                Unit price
                                            </TableHead>

                                            <TableHead className="text-right">
                                                Subtotal
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.length > 0 ? (
                                            <>
                                                {items.map((item) => (
                                                    <TableRow key={item.uuid}>
                                                        <TableCell>
                                                            {item.product
                                                                .uuid ? (
                                                                <Link
                                                                    href={shop.productInfo(
                                                                        {
                                                                            shop: active_shop.uuid,
                                                                            product:
                                                                                item
                                                                                    .product
                                                                                    .uuid,
                                                                        },
                                                                    )}
                                                                    className="font-medium text-primary hover:underline"
                                                                >
                                                                    {
                                                                        item
                                                                            .product
                                                                            .name
                                                                    }
                                                                </Link>
                                                            ) : (
                                                                <span className="font-medium">
                                                                    {
                                                                        item
                                                                            .product
                                                                            .name
                                                                    }
                                                                </span>
                                                            )}
                                                            {item.product
                                                                .dosage_form && (
                                                                <div className="text-xs text-muted-foreground">
                                                                    {
                                                                        item
                                                                            .product
                                                                            .dosage_form
                                                                    }
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                                            {item.batch_number
                                                                ? `#${item.batch_number}`
                                                                : '—'}
                                                        </TableCell>

                                                        <TableCell className="text-right">
                                                            {item.quantity}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono">
                                                            {formatMoney(
                                                                item.unit_price,
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono font-semibold">
                                                            {formatMoney(
                                                                item.subtotal,
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                <TableRow>
                                                    <TableCell
                                                        colSpan={2}
                                                        className="text-center font-medium"
                                                    >
                                                        Total
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-base font-bold">
                                                        {sale.units_sold}
                                                    </TableCell>
                                                    <TableCell
                                                        colSpan={2}
                                                        className="text-right font-mono text-base font-bold"
                                                    >
                                                        {formatMoney(
                                                            sale.total_amount,
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            </>
                                        ) : (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={5}
                                                    className="h-24 text-center text-muted-foreground"
                                                >
                                                    No items recorded for this
                                                    sale.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Receipt className="h-4 w-4" />
                                    Sale details
                                </CardTitle>
                                <CardDescription>
                                    Transaction totals, reference, and timeline.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">
                                        Total amount
                                    </p>
                                    <p className="font-mono text-lg font-bold">
                                        {formatMoney(sale.total_amount)}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-muted-foreground">
                                            Units sold
                                        </p>
                                        <p className="font-medium">
                                            {sale.units_sold.toLocaleString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">
                                            Products
                                        </p>
                                        <p className="font-medium">
                                            {sale.products_count}
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">
                                        Receipt number
                                    </p>
                                    <p className="font-mono font-medium">
                                        {sale.receipt_number}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">
                                        Status
                                    </p>
                                    <div className="mt-1">
                                        {statusBadge(sale.status)}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">
                                        Sold by
                                    </p>
                                    <p className="font-medium">
                                        {sale.sold_by ?? 'Unknown'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">
                                        Date
                                    </p>
                                    <p className="flex items-center gap-2 font-medium">
                                        <CalendarClock className="h-4 w-4 text-muted-foreground" />
                                        {sale.created_at
                                            ? formatDateTime(sale.created_at)
                                            : '—'}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Store className="h-4 w-4" />
                                    Pharmacy
                                </CardTitle>
                                <CardDescription>
                                    Branch where this sale was processed.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">
                                        Name
                                    </p>
                                    <p className="font-medium">
                                        {saleShop.name}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">
                                        Location
                                    </p>
                                    <p className="font-medium">
                                        {saleShop.location}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">
                                        Address
                                    </p>
                                    <p className="font-medium">
                                        {saleShop.address}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">
                                        Phone
                                    </p>
                                    <p className="font-medium">
                                        {saleShop.phone}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardInnerLayout>
    );
};

export default SaleInfo;

SaleInfo.layout = {
    breadcrumbs: [
        { title: 'Sales Reports', href: '#' },
        { title: 'Sale Details', href: '#' },
    ],
};
