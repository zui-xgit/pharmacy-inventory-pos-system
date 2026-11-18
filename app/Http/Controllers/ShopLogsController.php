<?php

namespace App\Http\Controllers;

use App\Models\Core\Shop;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ShopLogsController extends Controller
{
    //

    public function activityLogs(Shop $shop) 
    {
        return Inertia::render('shop/system/logs'); 
    }
}
