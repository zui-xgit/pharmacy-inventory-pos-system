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
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PosCheckoutTest extends TestCase
{
    use RefreshDatabase;

    private function makeCashier(Shop $shop): User
    {
        $cashier = User::factory()->create(['status' => 'active']);
        $cashier->assignRole(Role::findOrCreate('cashier'));
        $cashier->shops()->attach($shop->id);

        return $cashier;
    }

    private function makeBatch(Shop $shop, int $units = 10): Batch
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

        return Batch::create([
            'shop_id' => $shop->id,
            'product_id' => $product->id,
            'batch_number' => 'PCM-001',
            'expiry_date' => now()->addYear()->toDateString(),
            'manufactured_date' => now()->subYear()->toDateString(),
            'packages_received' => 1,
            'units_per_package_received' => 10,
            'packages_remaining' => intdiv($units, 10),
            'units_remaining' => $units,
            'cost_price' => 100,
            'selling_price' => 200,
        ]);
    }

    public function test_checkout_uses_the_cashier_final_price(): void
    {
        $shop = Shop::factory()->create();
        $cashier = $this->makeCashier($shop);
        $batch = $this->makeBatch($shop);

        $this->actingAs($cashier)
            ->from(route('shop.pos', ['shop' => $shop->uuid]))
            ->post(route('shop.pos-checkout', ['shop' => $shop->uuid]), [
                'items' => [
                    ['batch_id' => $batch->id, 'quantity' => 2],
                ],
                'final_total' => 500,
            ])
            ->assertRedirect(route('shop.pos', ['shop' => $shop->uuid]))
            ->assertSessionHasNoErrors();

        $sale = Sale::firstOrFail();
        $item = SaleItem::firstOrFail();

        $this->assertSame('500.00', $sale->total_amount);
        $this->assertSame('250.00', $item->unit_price);
        $this->assertSame('500.00', $item->subtotal);
        $this->assertSame(8, $batch->fresh()->units_remaining);
        $this->assertDatabaseHas('stock_movements', [
            'batch_id' => $batch->id,
            'performed_by' => $cashier->id,
            'quantity' => 2,
        ]);
    }

    public function test_checkout_requires_a_valid_final_price(): void
    {
        $shop = Shop::factory()->create();
        $cashier = $this->makeCashier($shop);
        $batch = $this->makeBatch($shop);

        $this->actingAs($cashier)
            ->from(route('shop.pos', ['shop' => $shop->uuid]))
            ->post(route('shop.pos-checkout', ['shop' => $shop->uuid]), [
                'items' => [
                    ['batch_id' => $batch->id, 'quantity' => 1],
                ],
            ])
            ->assertSessionHasErrors('final_total');

        $this->actingAs($cashier)
            ->from(route('shop.pos', ['shop' => $shop->uuid]))
            ->post(route('shop.pos-checkout', ['shop' => $shop->uuid]), [
                'items' => [
                    ['batch_id' => $batch->id, 'quantity' => 1],
                ],
                'final_total' => -1,
            ])
            ->assertSessionHasErrors('final_total');

        $this->assertDatabaseCount('sales', 0);
    }
}
