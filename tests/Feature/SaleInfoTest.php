<?php

namespace Tests\Feature;

use App\Models\Catalog\Batch;
use App\Models\Catalog\DosageForm;
use App\Models\Catalog\Product;
use App\Models\Core\Shop;
use App\Models\Sales\Sale;
use App\Models\Sales\SaleItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class SaleInfoTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(Shop $shop): User
    {
        $user = User::factory()->create(['status' => 'active']);
        $user->givePermissionTo(Permission::findOrCreate('reports and insights management'));
        $user->shops()->attach($shop->id);

        return $user;
    }

    private function makeSale(Shop $shop, User $cashier): Sale
    {
        $dosage = DosageForm::create([
            'shop_id' => $shop->id,
            'name' => 'Tablet',
        ]);

        $product = Product::create([
            'shop_id' => $shop->id,
            'dosage_form_id' => $dosage->id,
            'name' => 'Paracetamol 500mg',
        ]);

        $batch = Batch::create([
            'shop_id' => $shop->id,
            'product_id' => $product->id,
            'batch_number' => 'PCM-001',
            'expiry_date' => now()->addYear()->toDateString(),
            'manufactured_date' => now()->subYear()->toDateString(),
            'packages_received' => 1,
            'units_per_package_received' => 10,
            'packages_remaining' => 0,
            'units_remaining' => 7,
            'cost_price' => 100,
            'selling_price' => 200,
        ]);

        $sale = Sale::create([
            'shop_id' => $shop->id,
            'sold_by' => $cashier->id,
            'receipt_number' => 'RCP-20260101-0001',
            'total_amount' => 600,
            'status' => 'completed',
        ]);

        SaleItem::create([
            'sale_id' => $sale->id,
            'batch_id' => $batch->id,
            'product_id' => $product->id,
            'quantity' => 3,
            'unit_price' => 200,
            'cost_price' => 100,
            'subtotal' => 600,
        ]);

        return $sale;
    }

    public function test_sale_info_returns_the_sale_items_and_totals(): void
    {
        $shop = Shop::factory()->create();
        $cashier = $this->makeUser($shop);
        $sale = $this->makeSale($shop, $cashier);

        $this->actingAs($cashier)
            ->get(route('shop.sale-info', ['shop' => $shop->uuid, 'sale' => $sale->uuid]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('shop/sale-info')
                ->where('sale.receipt_number', 'RCP-20260101-0001')
                ->where('sale.total_amount', 600)
                ->where('sale.status', 'completed')
                ->where('sale.units_sold', 3)
                ->where('sale.products_count', 1)
                ->has('items', 1)
                ->where('items.0.product.name', 'Paracetamol 500mg')
                ->where('items.0.product.dosage_form', 'Tablet')
                ->where('items.0.batch_number', 'PCM-001')
                ->where('items.0.quantity', 3)
                ->where('items.0.subtotal', 600)
                ->where('shop.uuid', $shop->uuid)
            );
    }

    public function test_sale_info_is_not_found_for_another_shops_sale(): void
    {
        $shop = Shop::factory()->create();
        $otherShop = Shop::factory()->create();

        $cashier = $this->makeUser($shop);
        $sale = $this->makeSale($otherShop, $cashier);

        $this->actingAs($cashier)
            ->get(route('shop.sale-info', ['shop' => $shop->uuid, 'sale' => $sale->uuid]))
            ->assertNotFound();
    }
}
