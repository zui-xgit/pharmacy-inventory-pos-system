import { Head, Link, usePage } from '@inertiajs/react';
import { Pill } from 'lucide-react';
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
import shop from '@/routes/shop';
import DashboardInnerLayout from '@/layouts/app/dashboard-inner-layout';
import StatCard from '@/components/dashboard/stat-card';
import BackButton from '@/components/back-button';

interface Props {
    dosageForm: {
        uuid: string;
        name: string;
        products_count: number;
        created_at: string | null;
    };
    products: Array<{
        uuid: string;
        name: string;
        is_active: boolean;
    }>;
}

const DosageFormInfo = ({ dosageForm, products }: Props) => {
    const { active_shop } = usePage<{
        active_shop: { uuid: string };
    }>().props;

    return (
        <>
            <Head title={`Dosage Form · ${dosageForm.name}`} />
            <DashboardInnerLayout>
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                            <BackButton />
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <Pill className="h-5 w-5" />
                                </div>
                                <Heading
                                    variant="small"
                                    title={dosageForm.name}
                                    description="Dosage form details and linked products."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <StatCard
                            title="Linked products"
                            value={String(dosageForm.products_count)}
                        />
                        <StatCard
                            title="Created"
                            value={dosageForm.created_at ?? '—'}
                        />
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Products using this form</CardTitle>
                            <CardDescription>
                                Recent products configured with “
                                {dosageForm.name}”.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">
                                            Action
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {products.length > 0 ? (
                                        products.map((product) => (
                                            <TableRow key={product.uuid}>
                                                <TableCell className="font-medium">
                                                    {product.name}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={
                                                            product.is_active
                                                                ? 'secondary'
                                                                : 'outline'
                                                        }
                                                    >
                                                        {product.is_active
                                                            ? 'Active'
                                                            : 'Inactive'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        asChild
                                                    >
                                                        <Link
                                                            href={shop.productInfo(
                                                                {
                                                                    shop: active_shop.uuid,
                                                                    product:
                                                                        product.uuid,
                                                                },
                                                            )}
                                                        >
                                                            View product
                                                        </Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell
                                                colSpan={3}
                                                className="h-24 text-center text-muted-foreground"
                                            >
                                                No products are linked to this
                                                dosage form yet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </DashboardInnerLayout>
        </>
    );
};

export default DosageFormInfo;

DosageFormInfo.layout = {
    breadcrumbs: [
        { title: 'Dosage Forms', href: '#' },
        { title: 'Details', href: '#' },
    ],
};
