import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, Boxes, Package } from 'lucide-react';
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
import { formatDate } from '@/lib/utils';
import shop from '@/routes/shop';
import StatCard from '@/components/dashboard/stat-card';
import DashboardInnerLayout from '@/layouts/app/dashboard-inner-layout';
import BackButton from '@/components/back-button';

interface BatchItem {
    uuid: string;
    batch_number: string;
    packages_received: number;
    units_per_package_received: number;
    total_units_received: number;
    packages_remaining: number;
    units_remaining: number;
    is_out_of_stock: boolean;
    cost_price: number | string;
    selling_price: number | string;
    manufactured_date: string | null;
    expiry_date: string | null;
    is_expired: boolean;
    is_expiring_soon: boolean;
    days_until_expiry: number;
}

interface Props {
    product: {
        uuid: string;
        name: string;
        reorder_point: number | null;
        description: string | null;
        is_active: boolean;
        created_at: string | null;
        dosage_form: { uuid: string; name: string };
    };
    batches: BatchItem[];
    stats: {
        batches_count: number;
        total_units_remaining: number;
        in_stock_batches: number;
        expired_batches: number;
    };
}

const ProductInfo = ({ product, batches, stats }: Props) => {
    const { active_shop } = usePage<{
        active_shop: { uuid: string };
    }>().props;

    return (
        <>
            <DashboardInnerLayout>
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                            <BackButton/>
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <Package className="h-5 w-5" />
                                </div>
                                <div>
                                    <Heading
                                        variant="small"
                                        title={product.name}
                                        description="Product blueprint, stock overview, and batch history."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            title="Total batches"
                            value={String(stats.batches_count)}
                        />
                        <StatCard
                            title="Units remaining"
                            value={stats.total_units_remaining.toLocaleString()}
                        />
                        <StatCard
                            title="In-stock batches"
                            value={String(stats.in_stock_batches)}
                        />
                        <StatCard
                            title="Expired batches"
                            value={String(stats.expired_batches)}
                        />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-3">
                        <Card className="lg:col-span-1">
                            <CardHeader>
                                <CardTitle>Product details</CardTitle>
                                <CardDescription>
                                    Core configuration for this item.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">
                                        Dosage form
                                    </p>
                                    <Link
                                        href={shop.dosageFormInfo({
                                            shop: active_shop.uuid,
                                            dosageForm:
                                                product.dosage_form.uuid,
                                        })}
                                        className="font-medium text-primary hover:underline"
                                    >
                                        {product.dosage_form.name}
                                    </Link>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">
                                        Reorder point
                                    </p>
                                    <p className="font-medium">
                                        {product.reorder_point ?? 'Not set'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">
                                        Created
                                    </p>
                                    <p className="font-medium">
                                        {product.created_at ?? '—'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">
                                        Description
                                    </p>
                                    <p className="font-medium whitespace-pre-wrap">
                                        {product.description ||
                                            'No description provided.'}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="lg:col-span-2">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Boxes className="h-4 w-4" />
                                        Inventory batches
                                    </CardTitle>
                                    <CardDescription>
                                        Stock shipments received for this
                                        product.
                                    </CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Batch</TableHead>
                                            <TableHead>Remaining</TableHead>
                                            <TableHead>Pricing</TableHead>
                                            <TableHead>Expiry</TableHead>
                                            <TableHead className="text-right">
                                                View
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {batches.length > 0 ? (
                                            batches.map((batch) => (
                                                <TableRow
                                                    key={batch.uuid}
                                                    className="cursor-pointer"
                                                    onClick={() =>
                                                        router.get(
                                                            shop.batchInfo({
                                                                shop: active_shop.uuid,
                                                                batch: batch.uuid,
                                                            }),
                                                        )
                                                    }
                                                >
                                                    <TableCell>
                                                        <div className="font-mono text-xs text-muted-foreground">
                                                            #
                                                            {batch.batch_number}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {
                                                                batch.total_units_received
                                                            }{' '}
                                                            units received
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-sm font-medium">
                                                            {
                                                                batch.units_remaining
                                                            }{' '}
                                                            units
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {
                                                                batch.packages_remaining
                                                            }{' '}
                                                            pkgs
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        <span className="font-mono text-muted-foreground">
                                                            TSh{' '}
                                                            {Number(
                                                                batch.cost_price,
                                                            ).toLocaleString()}
                                                        </span>
                                                        <span className="mx-1 text-muted-foreground">
                                                            /
                                                        </span>
                                                        <span className="font-mono font-semibold">
                                                            TSh{' '}
                                                            {Number(
                                                                batch.selling_price,
                                                            ).toLocaleString()}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-mono text-sm">
                                                            {batch.expiry_date
                                                                ? formatDate(
                                                                      batch.expiry_date,
                                                                  )
                                                                : '—'}
                                                        </div>
                                                        <div className="mt-1 flex flex-wrap gap-1">
                                                            {batch.is_out_of_stock && (
                                                                <Badge variant="destructive">
                                                                    Out
                                                                </Badge>
                                                            )}
                                                            {batch.is_expired ? (
                                                                <Badge variant="destructive">
                                                                    Expired
                                                                </Badge>
                                                            ) : batch.is_expiring_soon ? (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="border-amber-500 text-amber-600 dark:text-amber-400"
                                                                >
                                                                    Expiring
                                                                    soon
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="secondary">
                                                                    Valid
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                router.get(
                                                                    shop.batchInfo(
                                                                        {
                                                                            shop: active_shop.uuid,
                                                                            batch: batch.uuid,
                                                                        },
                                                                    ),
                                                                );
                                                            }}
                                                        >
                                                            View
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={5}
                                                    className="h-24 text-center text-muted-foreground"
                                                >
                                                    No batches recorded for this
                                                    product yet.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </DashboardInnerLayout>
        </>
    );
};

export default ProductInfo;

ProductInfo.layout = {
    breadcrumbs: [
        { title: 'Products', href: '#' },
        { title: 'Details', href: '#' },
    ],
};
