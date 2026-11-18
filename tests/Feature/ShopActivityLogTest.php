<?php

namespace Tests\Feature;

use App\Http\Middleware\EnsureShopMember;
use App\Models\Catalog\DosageForm;
use App\Models\Core\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Activitylog\Models\Activity;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class ShopActivityLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_activities_from_the_current_shop_are_listed(): void
    {
        $shop = Shop::factory()->create();
        $otherShop = Shop::factory()->create();

        $this->activity($shop, ['description' => 'Reorder point updated']);
        $this->activity($otherShop, ['description' => 'Leaked event from another shop']);

        $this->actingUserWithLogsPermission();

        $this->get(route('shop.logs', ['shop' => $shop->uuid]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('shop/system/logs')
                ->has('activities.data', 1)
                ->where('activities.data.0.description', 'Reorder point updated')
                ->where('stats.total', 1)
                ->where('shop.uuid', $shop->uuid)
            );
    }

    public function test_activities_can_be_filtered_by_log_name_and_event(): void
    {
        $shop = Shop::factory()->create();

        $this->activity($shop, [
            'log_name' => 'catalog',
            'event' => 'updated',
            'description' => 'Product price changed',
        ]);
        $this->activity($shop, [
            'log_name' => 'staff',
            'event' => 'created',
            'description' => 'Staff account created',
        ]);

        $this->actingUserWithLogsPermission();

        $this->get(route('shop.logs', [
            'shop' => $shop->uuid,
            'log' => 'catalog',
            'event' => 'updated',
        ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('activities.data', 1)
                ->where('activities.data.0.description', 'Product price changed')
                ->where('filters.log', 'catalog')
                ->where('filters.event', 'updated')
            );
    }

    public function test_attribute_changes_and_properties_are_exposed_for_the_details_view(): void
    {
        $shop = Shop::factory()->create();

        $this->activity($shop, [
            'description' => 'Units written off after expiry check',
            'attribute_changes' => [
                'attributes' => ['units_remaining' => 0],
                'old' => ['units_remaining' => 12],
            ],
            'properties' => ['reason' => 'expired'],
        ]);

        $this->actingUserWithLogsPermission();

        $this->get(route('shop.logs', ['shop' => $shop->uuid]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('activities.data.0.changes.0.label', 'Units Remaining')
                ->where('activities.data.0.changes.0.old', '12')
                ->where('activities.data.0.changes.0.new', '0')
                ->where('activities.data.0.properties.0.label', 'Reason')
                ->where('activities.data.0.properties.0.value', 'expired')
            );
    }

    public function test_a_dosage_form_subject_is_labelled_with_its_name_and_linked(): void
    {
        $shop = Shop::factory()->create();
        $dosageForm = DosageForm::create([
            'shop_id' => $shop->id,
            'name' => 'capsule',
        ]);

        $this->activity($shop, [
            'description' => 'Dosage form capsule created',
            'subject_type' => DosageForm::class,
            'subject_id' => $dosageForm->id,
        ]);

        $this->actingUserWithLogsPermission();

        $this->get(route('shop.logs', ['shop' => $shop->uuid]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('activities.data.0.subject.type', 'Dosage form')
                ->where('activities.data.0.subject.label', 'capsule')
                ->where('activities.data.0.subject.url', route('shop.dosage-form-info', [
                    'shop' => $shop->uuid,
                    'dosageForm' => $dosageForm->uuid,
                ]))
            );
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function activity(Shop $shop, array $attributes): Activity
    {
        return Activity::create([
            'shop_id' => $shop->id,
            'log_name' => 'catalog',
            'event' => 'updated',
            'description' => 'Activity',
            ...$attributes,
        ]);
    }

    private function actingUserWithLogsPermission(): User
    {
        Permission::findOrCreate('view activity logs', 'web');

        $user = User::factory()->create(['status' => 'active']);
        $user->givePermissionTo('view activity logs');

        $this->actingAs($user);
        $this->withoutMiddleware(EnsureShopMember::class);

        return $user;
    }
}
