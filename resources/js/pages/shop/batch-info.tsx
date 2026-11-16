import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, CalendarClock, Package } from 'lucide-react';
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
import { formatDate } from '@/lib/utils';
import shop from '@/routes/shop';
import DashboardInnerLayout from '@/layouts/app/dashboard-inner-layout';
import StatCard from '@/components/dashboard/stat-card';

interface Props {
    batch: {
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
        created_at: string | null;
        product: {
            uuid: string;
            name: string;
            dosage_form: { uuid: string; name: string };
        };
    };
}

const BatchInfo = ({ batch }: Props) => {
    const { active_shop } = usePage<{
        active_shop: { uuid: string };
    }>().props;

    return (
        <>
            <DashboardInnerLayout>
                <Head title={`Batch · ${batch.batch_number}`} />
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                            <Button
                                variant="ghost"
                                className="cursor-pointer"
                                onClick={() => window.history.back()}
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back
                            </Button>
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <CalendarClock className="h-5 w-5" />
                                </div>
                                <div>
                                    <Heading
                                        variant="small"
                                        title={`Batch #${batch.batch_number}`}
                                        description="Received inventory details, pricing, and expiry status."
                                    />
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                        {batch.is_out_of_stock ? (
                                            <Badge variant="destructive">
                                                Out of stock
                                            </Badge>
                                        ) : (
                                            <Badge
                                                variant="outline"
                                                className="text-emerald-600 dark:text-emerald-400"
                                            >
                                                In stock
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
                                                Expiring soon
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary">
                                                Valid
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            title="Units remaining"
                            value={batch.units_remaining.toLocaleString()}
                            subtitle={
                                batch.packages_remaining + ' packages left'
                            }
                        />

                        <StatCard
                            title="Total received"
                            value={batch.total_units_received.toLocaleString()}
                            subtitle={`${batch.packages_received} pkgs · ${batch.units_per_package_received} units/pkg`}
                        />

                        <StatCard
                            title="Cost / Selling"
                            value={`TSh ${Number(batch.cost_price).toLocaleString()} / TSh ${Number(batch.selling_price).toLocaleString()}`}
                        />

                        <StatCard
                            title="Days until expiry"
                            value={String(batch.days_until_expiry)}
                            valueClassName={
                                batch.is_expired
                                    ? 'text-destructive'
                                    : batch.is_expiring_soon
                                      ? 'text-amber-600 dark:text-amber-400'
                                      : ''
                            }
                        />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Product</CardTitle>
                                <CardDescription>
                                    Item associated with this batch.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">
                                        Name
                                    </p>
                                    <Link
                                        href={shop.productInfo({
                                            shop: active_shop.uuid,
                                            product: batch.product.uuid,
                                        })}
                                        className="font-medium text-primary hover:underline"
                                    >
                                        {batch.product.name}
                                    </Link>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">
                                        Dosage form
                                    </p>
                                    <Link
                                        href={shop.dosageFormInfo({
                                            shop: active_shop.uuid,
                                            dosageForm:
                                                batch.product.dosage_form.uuid,
                                        })}
                                        className="font-medium text-primary hover:underline"
                                    >
                                        {batch.product.dosage_form.name}
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Batch timeline</CardTitle>
                                <CardDescription>
                                    Manufacturing and expiry information.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">
                                        Manufactured
                                    </p>
                                    <p className="font-medium">
                                        {batch.manufactured_date
                                            ? formatDate(
                                                  batch.manufactured_date,
                                              )
                                            : '—'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">
                                        Expires
                                    </p>
                                    <p className="font-medium">
                                        {batch.expiry_date
                                            ? formatDate(batch.expiry_date)
                                            : '—'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">
                                        Recorded
                                    </p>
                                    <p className="font-medium">
                                        {batch.created_at ?? '—'}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </DashboardInnerLayout>
        </>
    );
};

export default BatchInfo;

BatchInfo.layout = {
    breadcrumbs: [
        { title: 'Batches', href: '#' },
        { title: 'Details', href: '#' },
    ],
};
