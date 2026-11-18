<?php

namespace App\Support\Activity;

use Spatie\Activitylog\Support\ActivityLogger;
use Spatie\Activitylog\Contracts\Activity as ActivityContract;

class AdminActivity
{
    /**
     * Start an activity log that is organisation-wide.
     * Admin activity shop_id stays null and is visible in the global feed.
     *
     * @param  string  $logName  One of: staff, shop, system, etc.
     */
   

    public static function log(string $logName = 'system'): ActivityLogger
    {

        return activity($logName)->tap(function (ActivityContract $activity) {  
            $activity->shop_id = null; // Explicitly null for global admin logs
        });     

    }
}
