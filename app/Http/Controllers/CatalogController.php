<?php

namespace App\Http\Controllers;

use App\Models\Catalog\Batch;
use App\Models\Catalog\DosageForm;
use App\Models\Catalog\Product;
use App\Models\Core\Shop;
use App\Support\Activity\ShopActivity;
use Exception;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CatalogController extends Controller
{
    //

    // CATALOG
    public function productsCatalog(Request $request, Shop $shop): Response
    {

        $search_input = $request->input('search');
        $search = strtolower($search_input);

        $products = Product::where('shop_id', $shop->id)
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'LIKE', "%{$search}%");
                });
            })
            ->with([
                'dosageForm:id,uuid,name',
            ])
            ->latest()
            ->paginate(15)
            ->withQueryString()
            ->through(function (Product $product): array {
                return [
                    'uuid' => $product->uuid,
                    'name' => $product->name,
                    'dosage_form' => [
                        'uuid' => $product->dosageForm->uuid,
                        'name' => $product->dosageForm->name,
                    ],

                ];
            });

        $dosage_forms = $shop->dosageForms()->get(['uuid', 'name']);

        return Inertia::render('shop/catalog/products', [
            'products' => $products,
            'filters' => $request->only(['search']),
            'dosage_forms' => $dosage_forms,
        ]);

    }

    public function batchesCatalog(Request $request, Shop $shop): Response
    {
        $search_input = $request->input('search');
        $search = strtolower($search_input);

        $batches = Batch::where('shop_id', $shop->id)
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('batch_number', 'LIKE', "%{$search}%")
                        ->orWhereHas('product', function ($productQuery) use ($search) {
                            $productQuery->where('name', 'LIKE', "%{$search}%");
                        });
                });
            })
            ->with([
                'product:id,uuid,name,dosage_form_id', 'product.dosageForm:id,name',
            ])
            ->latest()
            ->paginate(10)
            ->withQueryString()
            ->through(function (Batch $batch) use ($shop): array {
                $totalUnitsReceived = $batch->packages_received * $batch->units_per_package_received;

                return [
                    'uuid' => $batch->uuid,
                    'batch_number' => $batch->batch_number,

                    'product' => [
                        'uuid' => $batch->product->uuid,
                        'name' => $batch->product->name,
                        'dosage_form' => $batch->product->dosageForm->name,
                    ],

                    // Receiving Quantities
                    'packages_received' => $batch->packages_received,
                    'units_per_package_received' => $batch->units_per_package_received,
                    'total_units_received' => $totalUnitsReceived,

                    // Current Stock Quantities
                    'packages_remaining' => $batch->packages_remaining,
                    'units_remaining' => $batch->units_remaining,
                    'is_out_of_stock' => $batch->isOutOfStock(),

                    // Pricing
                    'cost_price' => $batch->cost_price,
                    'selling_price' => $batch->selling_price,

                    // Dates
                    'manufactured_date' => $batch->manufactured_date->format('Y-m-d'),
                    'expiry_date' => $batch->expiry_date,
                    'is_expired' => $batch->isExpired(),

                    'is_expiring_soon' => $batch->isExpiringSoon($shop->expiry_alert_days),
                    'days_until_expiry' => $batch->daysUntilExpiry(),
                ];
            });

        return Inertia::render('shop/catalog/batches', [
            'batches' => $batches,
            'filters' => $request->only(['search']),
        ]);
    }

    public function dosageFormsCatalog(Request $request, Shop $shop): Response
    {
        $search_input = $request->input('search');
        $search = strtolower($search_input);

        $dosageForms = DosageForm::where('shop_id', $shop->id)
            ->when($search, function ($query, $search) {
                $query->where('name', 'LIKE', "%{$search}%");
            })
            ->withCount(['products']) // Useful to show how many products use this form
            ->latest()
            ->paginate(10)
            ->withQueryString()
            ->through(function (DosageForm $dosage_form): array {
                return [
                    'uuid' => $dosage_form->uuid,
                    'name' => $dosage_form->name,
                    'products_count' => $dosage_form->products_count,
                ];
            });

        return Inertia::render('shop/catalog/dosage-forms', [
            'dosageForms' => $dosageForms,
            'filters' => $request->only(['search']),
        ]);
    }

    public function productInfo(Shop $shop, Product $product): Response
    {
        abort_unless($product->shop_id === $shop->id, 404);

        $product->load([
            'dosageForm:id,uuid,name',
            'batches' => fn ($query) => $query->latest(),
        ]);

        $batches = $product->batches->map(function (Batch $batch) use ($shop): array {
            $totalUnitsReceived = $batch->packages_received * $batch->units_per_package_received;

            return [
                'uuid' => $batch->uuid,
                'batch_number' => $batch->batch_number,
                'packages_received' => $batch->packages_received,
                'units_per_package_received' => $batch->units_per_package_received,
                'total_units_received' => $totalUnitsReceived,
                'packages_remaining' => $batch->packages_remaining,
                'units_remaining' => $batch->units_remaining,
                'is_out_of_stock' => $batch->isOutOfStock(),
                'cost_price' => $batch->cost_price,
                'selling_price' => $batch->selling_price,
                'manufactured_date' => $batch->manufactured_date->format('Y-m-d'),
                'expiry_date' => $batch->expiry_date->format('Y-m-d'),
                'is_expired' => $batch->isExpired(),
                'is_expiring_soon' => $batch->isExpiringSoon($shop->expiry_alert_days ?? 30),
                'days_until_expiry' => $batch->daysUntilExpiry(),
            ];
        })->values();

        return Inertia::render('shop/product-info', [
            'product' => [
                'uuid' => $product->uuid,
                'name' => $product->name,
                'reorder_point' => $product->reorder_point,
                'description' => $product->description,
                'is_active' => $product->is_active,
                'created_at' => $product->created_at?->format('Y-m-d'),
                'dosage_form' => [
                    'uuid' => $product->dosageForm->uuid,
                    'name' => $product->dosageForm->name,
                ],
            ],
            'batches' => $batches,
            'stats' => [
                'batches_count' => $batches->count(),
                'total_units_remaining' => (int) $batches->sum('units_remaining'),
                'in_stock_batches' => (int) $batches->where('is_out_of_stock', false)->count(),
                'expired_batches' => (int) $batches->where('is_expired', true)->count(),
            ],
        ]);
    }

    public function batchInfo(Shop $shop, Batch $batch): Response
    {
        abort_unless($batch->shop_id === $shop->id, 404);

        $batch->load(['product:id,uuid,name,dosage_form_id,shop_id', 'product.dosageForm:id,uuid,name']);

        $totalUnitsReceived = $batch->packages_received * $batch->units_per_package_received;

        return Inertia::render('shop/batch-info', [
            'batch' => [
                'uuid' => $batch->uuid,
                'batch_number' => $batch->batch_number,
                'packages_received' => $batch->packages_received,
                'units_per_package_received' => $batch->units_per_package_received,
                'total_units_received' => $totalUnitsReceived,
                'packages_remaining' => $batch->packages_remaining,
                'units_remaining' => $batch->units_remaining,
                'is_out_of_stock' => $batch->isOutOfStock(),
                'cost_price' => $batch->cost_price,
                'selling_price' => $batch->selling_price,
                'manufactured_date' => $batch->manufactured_date->format('Y-m-d'),
                'expiry_date' => $batch->expiry_date->format('Y-m-d'),
                'is_expired' => $batch->isExpired(),
                'is_expiring_soon' => $batch->isExpiringSoon($shop->expiry_alert_days ?? 30),
                'days_until_expiry' => $batch->daysUntilExpiry(),
                'created_at' => $batch->created_at?->format('Y-m-d'),
                'product' => [
                    'uuid' => $batch->product->uuid,
                    'name' => $batch->product->name,
                    'dosage_form' => [
                        'uuid' => $batch->product->dosageForm->uuid,
                        'name' => $batch->product->dosageForm->name,
                    ],
                ],
            ],
        ]);
    }

    public function dosageFormInfo(Shop $shop, DosageForm $dosageForm): Response
    {
        abort_unless($dosageForm->shop_id === $shop->id, 404);

        $dosageForm->loadCount('products');
        $dosageForm->load(['products' => fn ($query) => $query->latest()->limit(50)]);

        return Inertia::render('shop/dosage-form-info', [
            'dosageForm' => [
                'uuid' => $dosageForm->uuid,
                'name' => $dosageForm->name,
                'products_count' => $dosageForm->products_count,
                'created_at' => $dosageForm->created_at?->format('Y-m-d'),
            ],
            'products' => $dosageForm->products->map(fn (Product $product): array => [
                'uuid' => $product->uuid,
                'name' => $product->name,
                'is_active' => $product->is_active,
            ])->values(),
        ]);
    }

    public function createDosageForm(Request $request, Shop $shop): RedirectResponse
    {

        $request->merge([
            'name' => strtolower($request->input('name')),
        ]);

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                // Checks the 'dosage_forms' table, ensuring 'name' is unique where 'shop_id' matches the current shop
                Rule::unique('dosage_forms')->where(function ($query) use ($shop) {
                    return $query->where('shop_id', $shop->id);
                }),
            ],
        ]);

        try {
            DB::beginTransaction();
            $dosageForm = $shop->dosageForms()->create([
                'name' => $validated['name'],
            ]);

            ShopActivity::for($shop->id, 'catalog')
                ->performedOn($dosageForm)
                ->causedBy(Auth::user())
                ->event('created')
                ->log("Dosage form {$dosageForm->name} created");

            DB::commit();

            return back();
        } catch (Exception $e) {
            DB::rollback();

            return back()->withErrors(['error' => 'Failed to create dosage form: ']);
        }
    }

    public function createProduct(Request $request, Shop $shop): RedirectResponse
    {

        $request->merge([
            'name' => strtolower($request->input('name')),
            // 'sku' => strtolower($request->input('sku')),
        ]);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'dosage_form_uuid' => [
                'required',
                'exists:dosage_forms,uuid', // Ensure the form exists in the dosage_forms table
            ],
            // 'sku' => [
            //     'required',
            //     'string',
            //     'max:255',
            //     Rule::unique('products')->where(function ($query) use ($shop) {
            //         return $query->where('shop_id', $shop->id);
            //     }),
            // ],
        ]);

        try {
            DB::beginTransaction();

            // Fetch the unit by UUID
            $dosage_form = $shop->dosageForms()->where('uuid', $validated['dosage_form_uuid'])->firstOrFail();

            $product = $shop->products()->create([
                'name' => $validated['name'],
                'dosage_form_id' => $dosage_form->id,
                // 'sku' => $validated['sku'],
            ]);

            ShopActivity::for($shop->id, 'catalog')
                ->performedOn($product)
                ->causedBy(Auth::user())
                ->event('created')
                ->log("Product {$product->name} added to the catalog");

            DB::commit();

            return back();
        } catch (UniqueConstraintViolationException $e) {
            DB::rollBack();

            return back()->withErrors(['error' => 'A product with this identical name and dosage form, already exists.']);
        } catch (Exception $e) {
            DB::rollback();

            return back()->withErrors(['error' => 'Failed to create product: ']);
        }

    }

    public function createBatch(Request $request, Shop $shop): RedirectResponse
    {
        $request->merge([
            'batch_number' => strtolower($request->input('batch_number')),
        ]);

        $validated = $request->validate([
            'confirmed' => ['boolean'],
            'product' => ['required', 'array'],
            'product.uuid' => ['required', 'uuid', Rule::exists('products', 'uuid')->where('shop_id', $shop->id)],
            // 'batch_number'               => ['required', 'string', 'max:100'],
            'batch_number' => ['required', 'string', 'max:100',
                Rule::unique('batches', 'batch_number')
                    ->where('shop_id', $shop->id)
                    ->where('product_id', Product::where('uuid', $request->input('product.uuid'))->value('id')),
            ],
            'cost_price' => ['required', 'numeric', 'min:0'],
            'selling_price' => ['required', 'numeric', 'min:0', 'gte:cost_price'],
            'manufactured_date' => ['required', 'date', 'before_or_equal:today'],
            'expiry_date' => ['required', 'date', 'after:today'],
            'units_per_package_received' => ['required', 'integer', 'min:1'],
            'packages_received' => ['required', 'integer', 'min:1'],
        ]);

        // Calculate total calculated stock quantities
        $totalQuantityReceived = $validated['units_per_package_received'] * $validated['packages_received'];

        //  1: Validation passed, but user hasn't seen the confirmation dialog yet - so show the dialog first to confirm
        if ($validated['confirmed'] === false) {
            Inertia::flash('prompt_confirmation', [
                'message' => "You are about to receive {$totalQuantityReceived} total units into inventory.",
            ]);

            return back();
        }

        try {
            DB::beginTransaction();

            $product = Product::where('uuid', $validated['product']['uuid'])
                ->where('shop_id', $shop->id)
                ->firstOrFail();

            // 2. Create batch
            $batch = Batch::create([
                'shop_id' => $shop->id,
                'product_id' => $product->id,
                'batch_number' => $validated['batch_number'],
                'expiry_date' => $validated['expiry_date'],
                'manufactured_date' => $validated['manufactured_date'],
                'units_per_package_received' => $validated['units_per_package_received'],
                'packages_received' => $validated['packages_received'],
                'cost_price' => $validated['cost_price'],
                'selling_price' => $validated['selling_price'],

                'packages_remaining' => $validated['packages_received'],
                'units_remaining' => $totalQuantityReceived,
            ]);

            ShopActivity::for($shop->id, 'inventory')
                ->performedOn($batch)
                ->causedBy(Auth::user())
                ->event('stock.received')
                ->withProperties([
                    'batch_number' => $batch->batch_number,
                    'product' => $product->name,
                    'packages_received' => $batch->packages_received,
                    'units_per_package_received' => $batch->units_per_package_received,
                    'total_units_received' => $totalQuantityReceived,
                    'cost_price' => $batch->cost_price,
                    'selling_price' => $batch->selling_price,
                    'expiry_date' => $validated['expiry_date'],
                ])
                ->log("Received {$totalQuantityReceived} units of {$product->name} (batch {$batch->batch_number})");

            DB::commit();

            return back();
        } catch (UniqueConstraintViolationException $e) {
            DB::rollBack();

            return back()->withErrors(['error' => "A batch with this batch-number: {$validated['batch_number']}  already exists. No duplicates allowed."]);
        } catch (Exception $e) {
            DB::rollBack();

            return back()->withErrors(['error' => 'Failed to create the batch record. Please try again. ']);
        }
    }
}
