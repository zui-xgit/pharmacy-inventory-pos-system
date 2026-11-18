<?php

namespace App\Support;

use App\Models\Core\Shop;
use App\Models\Sales\Sale;

class ReceiptBuilder
{
    public static function fromSale(Shop  $shop, Sale $sale): array
    {
        $sale->loadMissing([
            'soldBy:id,uuid,firstname,lastname',
            'items' => fn ($q) => $q->orderBy('id'),
            'items.product:id,uuid,name,dosage_form_id',
            'items.product.dosageForm:id,name',
            'items.batch:id,uuid,batch_number',
        ]);

        $items = $sale->items->map(function ($item) {
            $form = $item->product?->dosageForm?->name;

            return [
                'product_name' => $item->product
                    ? ($form ? "{$item->product->name} ({$form})" : $item->product->name)
                    : 'Deleted product',
                'quantity'     => (int) $item->quantity,
                'unit_price'   => round((float) $item->unit_price, 2),
                'subtotal'     => round((float) $item->subtotal, 2),
            ];
        })->values()->all();

        $subtotal = round(array_sum(array_column($items, 'subtotal')), 2);
        $total    = round((float) $sale->total_amount, 2);

        return [
            'uuid'           => $sale->uuid,
            'receipt_number' => $sale->receipt_number,
            'date'           => $sale->created_at
                ? $sale->created_at->timezone($shop->timezone)->format('d M Y, h:i A')
                : '—',
            'sold_by'        => trim(
                ($sale->soldBy->firstname ?? '') . ' ' . ($sale->soldBy->lastname ?? '')
            ) ?: '—',

            'subtotal'     => $subtotal,
            'discount'     => round($subtotal - $total, 2),
            'total_amount' => $total,

            'shop' => [
                'name'    => $shop->name,
                'address' => $shop->address ?: $shop->location ?: '—',
                'phone'   => $shop->phone ?? '—',
            ],

            'items' => $items,
        ];
    }
}