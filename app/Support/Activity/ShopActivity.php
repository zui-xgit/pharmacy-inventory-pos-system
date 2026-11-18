<?php

namespace App\Support\Activity;

use Illuminate\Support\Facades\Auth;
use Spatie\Activitylog\Contracts\Activity as ActivityContract;
use Spatie\Activitylog\Support\ActivityLogger;

/**
 * Entry point for writing activity logs that belong to a shop.
 *
 * Every activity shown on the shop logs page is scoped by `shop_id`, so
 * always write through this helper instead of calling `activity()` directly.
 *
 * @example ShopActivity::for($shop, 'catalog')
 *      ->performedOn($product)
 *      ->event(ActivityEvent::Updated)
 *      ->withChanges([...])
 *      ->log('Product price updated');
 */
class ShopActivity
{
    /**
     * Start an activity that is scoped to the given shop.
     *
     * @param  string  $logName  One of: catalog, inventory, sales, staff, shop, system.
     */
    public static function for(int $shopId, string $logName = 'system'): ActivityLogger
    {

        return activity($logName)->tap(function (ActivityContract $activity) use ($shopId) {
            $activity->shop_id = $shopId;
        });
    }

    /**
     * Record a checkout/sale attempt that never became a sale.(rejected)
     *
     * @param  array<string, mixed>  $properties
     */
    public static function rejectedSale(int $shopId, string $description, array $properties = []): void
    {
        self::for($shopId, 'sales')
            ->causedBy(Auth::user())
            ->event('sale.rejected')
            ->withProperties($properties)
            ->log($description);
    }
}
