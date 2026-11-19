import { useRef, ReactNode } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
    SheetTrigger,
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetTitle,
    SheetHeader,
} from '../ui/sheet';
import { Button } from '../ui/button';
import { Printer } from 'lucide-react';

/** A single line on the receipt — frozen at the time of sale. */
interface ReceiptItem {
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
}

/** The shop block printed in the receipt header. */
interface ReceiptShop {
    name: string;
    address: string;
    phone: string;
}

/** The full receipt payload flashed to the client after a sale. */
export interface ReceiptData {
    uuid: string;
    receipt_number: string;
    /** Already formatted server-side in the shop's timezone — print as-is. */
    date: string;
    sold_by: string;

    subtotal: number;
    discount: number;
    total_amount: number;

    shop: ReceiptShop;
    items: ReceiptItem[];
}

interface ReceiptSheetProps {
    data: ReceiptData;
    trigger?: ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function ReceiptSheet({
    data,
    trigger,
    open,
    onOpenChange,
}: ReceiptSheetProps) {
    const receiptRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: receiptRef,
        documentTitle: data.receipt_number,
        // No fixed paper size — the printer driver decides (58mm, 80mm or A4)
        pageStyle: '@page { margin: 0; }',
    });

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}

            <SheetContent className="flex h-full w-full flex-col p-0 sm:max-w-md">
                <SheetHeader className="shrink-0 border-b p-6 pb-4">
                    <SheetTitle>Receipt Preview</SheetTitle>
                    <SheetDescription>
                        Check the receipt, then print it.
                    </SheetDescription>
                </SheetHeader>

                {/* Preview frame — the border lives OUTSIDE the ref so it never prints */}
                <div className="flex-1 overflow-y-auto bg-muted/30 p-4">
                    <div className="rounded-md border bg-white shadow-sm">
                        <div ref={receiptRef}>
                            <Receipt data={data} />
                        </div>
                    </div>
                </div>

                <SheetFooter className="shrink-0 border-t p-4">
                    <Button
                        onClick={() => handlePrint()}
                        className="w-full gap-2"
                    >
                        <Printer className="h-4 w-4" />
                        Print Receipt
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

const Receipt = ({ data }: { data: ReceiptData }) => {
    const TZS = (value: number) =>
        `TZS ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return (
        <div className="mx-auto w-full max-w-[80mm] bg-white p-4 font-mono text-[12px] leading-snug text-black">
            {/* Shop header */}
            <div className="text-center">
                <p className="text-sm font-bold uppercase">{data.shop.name}</p>
                {data.shop.address && <p>{data.shop.address}</p>}
                {data.shop.phone && <p>Tel: {data.shop.phone}</p>}
            </div>

            <hr className="my-2 border-t border-dashed border-black" />

            {/* Sale info */}
            <div className="space-y-0.5">
                <div className="flex justify-between gap-2">
                    <span>Receipt</span>
                    <span>{data.receipt_number}</span>
                </div>
                <div className="flex justify-between gap-2">
                    <span>Date</span>
                    <span>{data.date}</span>
                </div>
                <div className="flex justify-between gap-2">
                    <span>Served by</span>
                    <span>{data.sold_by}</span>
                </div>
            </div>

            <hr className="my-2 border-t border-dashed border-black" />

            {/* Items */}
            <div className="space-y-1.5">
                {data.items.map((item, index) => (
                    <div key={index}>
                        <p className="font-semibold break-words">
                            {item.product_name}
                        </p>
                        <div className="flex justify-between gap-2">
                            <span>
                                {item.quantity} x {TZS(item.unit_price)}
                            </span>
                            <span>{TZS(item.subtotal)}</span>
                        </div>
                    </div>
                ))}
            </div>

            <hr className="my-2 border-t border-dashed border-black" />

            {/* Totals */}
            <div className="space-y-0.5">
                {data.discount !== 0 && (
                    <>
                        <div className="flex justify-between gap-2">
                            <span>Subtotal</span>
                            <span>{TZS(data.subtotal)}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                            <span>
                                {data.discount >= 0 ? 'Discount' : 'Surcharge'}
                            </span>
                            <span>
                                {data.discount >= 0 ? '- ' : '+ '}
                                {TZS(Math.abs(data.discount))}
                            </span>
                        </div>
                    </>
                )}
                <div className="flex justify-between gap-2 text-sm font-bold">
                    <span>TOTAL</span>
                    <span>{TZS(data.total_amount)}</span>
                </div>
            </div>

            <hr className="my-2 border-t border-dashed border-black" />

            <p className="text-center">Thank you. Get well soon!</p>
        </div>
    );
};
