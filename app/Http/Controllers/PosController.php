<?php

namespace App\Http\Controllers;

use App\Enum\StockMovementReason;
use App\Enum\StockMovementType;
use App\Models\Catalog\Batch;
use App\Models\Catalog\Product;
use App\Models\Core\Shop;
use App\Models\Inventory\StockMovement;
use App\Models\Sales\Sale;
use App\Models\Sales\SaleItem;
use App\Services\PosService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class PosController extends Controller
{
    public function posIndex(Request $request, Shop $shop): Response
    {
        $search_input = $request->input('search');
        $search = strtolower($search_input);

        $products = collect();

        if (! empty($search)) {
            $products = Product::where('shop_id', $shop->id)
                ->where(function ($q) use ($search) {
                    $q->where('name', 'LIKE', "%{$search}%")
                        ->orWhereHas('dosageForm', function ($dosageQuery) use ($search) {
                            $dosageQuery->where('name', 'LIKE', "%{$search}%");
                        });
                })
                ->whereHas('batches', function ($query) {
                    $query->where('units_remaining', '>', 0)
                        ->where('expiry_date', '>', now());
                })
                ->with([
                    'dosageForm' => function ($query) {
                        $query->select('id', 'uuid', 'name');
                    },
                    'batches' => function ($query) {
                        $query->where('units_remaining', '>', 0)
                            ->where('expiry_date', '>', now())
                            ->orderBy('expiry_date', 'asc'); // FEFO Order
                    },
                ])
                ->paginate(15)
                ->withQueryString() // Preserves the search parameter in pagination links
                ->through(function (Product $product): array {
                    $firstBatch = $product->batches->first();

                    return [
                        'uuid' => $product->uuid,
                        'name' => $product->name,
                        'dosage_form' => [
                            'uuid' => $product->dosageForm->uuid,
                            'name' => $product->dosageForm->name,
                        ],
                        'total_stock' => $product->batches->sum('units_remaining'),
                        'selling_price' => $firstBatch->selling_price,
                        'batches' => $product->batches->map(function (Batch $batch): array {
                            return [
                                'id' => $batch->id,
                                'batch_number' => $batch->batch_number,
                                'units_remaining' => $batch->units_remaining,
                                'packages_remaining' => $batch->packages_remaining,
                                'expiry_date' => $batch->expiry_date,
                                'selling_price' => $batch->selling_price,
                            ];
                        })->values(),
                    ];
                });
        }

        return Inertia::render('pos/pos', [
            'products' => $products,
            'filters' => $request->only(['search']),
        ]);
    }

    public function checkOut(Request $request, PosService $posService, Shop $shop): RedirectResponse
    {
        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.batch_id' => [
                'required',
                Rule::exists('batches', 'id')->where('shop_id', $shop->id),
            ],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'final_total' => ['required', 'numeric', 'min:0', 'max:99999999.99'],
        ]);

        /** @var array<int, array{batch_id: int, quantity: int}> $items */
        $items = [];

        foreach ((array) $validated['items'] as $item) {
            $items[] = [
                'batch_id' => (int) $item['batch_id'],
                'quantity' => (int) $item['quantity'],
            ];
        }

        try {
            DB::beginTransaction();

            // ── Step 1: Lock & verify batch stock ─────────────────────────────
            $batchIds = collect($items)->pluck('batch_id');

            $batches = Batch::whereIn('id', $batchIds)
                ->where('shop_id', $shop->id)
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            foreach ($items as $item) {
                $batch = $batches->get($item['batch_id']);

                if (! $batch || $batch->units_remaining < $item['quantity']) {
                    DB::rollBack();

                    return back()->withErrors([
                        'stock' => "Insufficient stock for batch {$batch?->batch_number}. "
                            ."Available: {$batch?->units_remaining}, Requested: {$item['quantity']}.",
                    ]);
                }
            }

            // ── Step 2: Generate receipt number ───────────────────────────────
            $receiptNumber = $posService->generateReceiptNumber($shop);

            // ── Step 3: Create the sale record ───────────────────────────────
            $totalAmount = $validated['final_total'];

            $sale = Sale::create([
                'shop_id' => $shop->id,
                'sold_by' => Auth::id(), // who made the sale
                'receipt_number' => $receiptNumber,
                'total_amount' => $totalAmount,
                'status' => 'completed',
            ]);

            // ── Step 4: Process each item directly against batch inventory ────
            foreach ($items as $item) {
                $batch = $batches->get($item['batch_id']);

                if (! $batch) {
                    continue;
                }

                $quantityBefore = $batch->units_remaining;
                $quantityAfter = $quantityBefore - $item['quantity'];

                // Calculate updated package count based on remaining units
                $packagesRemaining = $batch->units_per_package_received > 0
                    ? (int) floor($quantityAfter / $batch->units_per_package_received)
                    : $batch->packages_remaining;

                // 4a. Create sale item
                SaleItem::create([
                    'sale_id' => $sale->id,
                    'batch_id' => $batch->id,
                    'product_id' => $batch->product->id,
                    'quantity' => $item['quantity'],
                    'unit_price' => $batch->selling_price,
                    'cost_price' => $batch->cost_price,
                    'subtotal' => $batch->selling_price * $item['quantity'],
                ]);

                // 4b. Update live inventory directly on the batch table
                $batch->update([
                    'units_remaining' => $quantityAfter,
                    'packages_remaining' => $packagesRemaining,
                ]);

                // 4c. Log movement in stock_movements ledger for auditing
                StockMovement::create([
                    'batch_id' => $batch->id,
                    'performed_by' => Auth::id(),
                    'type' => StockMovementType::OUT,
                    'reason' => StockMovementReason::SALE,
                    'quantity' => $item['quantity'],
                    'previous_stock' => $quantityBefore,
                    'new_stock' => $quantityAfter,
                ]);
            }

            DB::commit();

            Inertia::flash('toast', ['type' => 'success', 'message' => __('Sale made successfully.')]);

            // T0D0:  receipt flash message
            Inertia::flash('receipt', [
                'id' => $sale->id,
                'receipt_number' => $sale->receipt_number,
                'total_amount' => (float) $sale->total_amount,
                'status' => $sale->status,
                'sold_by' => Auth::user()?->firstname.' '.Auth::user()->lastname,
                'created_at' => $sale->created_at->toISOString(),

                'shop' => [
                    'name' => $shop->name,
                    'location' => $shop->location,
                    'phone' => $shop->phone,
                ],

                'items' => collect($items)->map(function ($item) use ($batches) {
                    $batch = $batches->get($item['batch_id']);

                    return [
                        'batch_number' => $batch->batch_number,
                        'product_name' => $batch->product?->name,
                        'quantity' => $item['quantity'],
                        'unit_price' => (float) $batch->selling_price,
                        'subtotal' => (float) ($batch->selling_price * $item['quantity']),
                    ];
                })->values()->all(),
            ]);

            return back();

        } catch (Throwable $e) {
            DB::rollBack();

            return back()->withErrors([
                'message' => 'Failed to complete the sale. Please try again.',
            ]);
        }
    }
}
