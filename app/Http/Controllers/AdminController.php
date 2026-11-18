<?php

namespace App\Http\Controllers;

use App\Models\Catalog\Batch;
use App\Models\Catalog\DosageForm;
use App\Models\Catalog\Product;
use App\Models\Core\Shop;
use App\Models\Sales\Sale;
use App\Models\User;
use App\Support\Activity\AdminActivity;
use BackedEnum;
use Exception;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Activitylog\Models\Activity;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Throwable;

class AdminController extends Controller
{
    public function createShop(Request $request): RedirectResponse
    {

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'location' => ['required', 'string', 'max:255'],
            'address' => ['required', 'string', 'max:500'],
            'phone' => ['required', 'string', 'max:50'],
        ]);

        try {
            DB::beginTransaction();

            $shop = Shop::create([
                'name' => $validated['name'],
                'location' => $validated['location'],
                'address' => $validated['address'],
                'phone' => $validated['phone'],
            ]);

            // Admin dashboard activity is organisation-wide, so it is not tied
            // to a single shop row.x

            AdminActivity::log('shop')
                ->performedOn($shop)
                ->causedBy(Auth::user())
                ->event('created')
                ->withProperties([
                    'location' => $shop->location,
                    'phone' => $shop->phone,
                ])
                ->log("Shop {$shop->name} created");

            DB::commit();
            Inertia::flash('toast', ['type' => 'success', 'message' => __('Shop created successfully.')]);

            return back();

        } catch (Exception $e) {

            DB::rollBack();

            report($e);

            return back()->withErrors([
                'error' => 'An internal error occurred while creating the shop.',
            ]);
        }
    }

    // return all shops
    public function shops(Request $request): Response
    {
        $today = Carbon::today();

        // 1. Load every shop with its total staff count. Business-wide stats and
        //    the visible list are both derived from this so search never skews
        //    the headline totals.
        $allShops = Shop::query()
            ->withCount('users as staff_count')
            ->orderBy('created_at', 'desc')
            ->get();

        $shopIds = $allShops->pluck('id');

        // 2. Revenue and transaction count for today, grouped by shop.
        $salesToday = Sale::query()
            ->whereIn('shop_id', $shopIds)
            ->where('status', 'completed')
            ->whereDate('created_at', $today)
            ->selectRaw('shop_id, SUM(total_amount) as total_sales, COUNT(*) as transactions')
            ->groupBy('shop_id')
            ->get()
            ->keyBy('shop_id');

        // 3. Low / out of stock counts. Low stock is relative to each shop's
        //    own threshold.
        $lowStockCounts = Batch::query()
            ->join('shops', 'shops.id', '=', 'batches.shop_id')
            ->whereIn('batches.shop_id', $shopIds)
            ->whereNull('batches.deleted_at')
            ->where('batches.units_remaining', '>', 0)
            ->whereColumn('batches.units_remaining', '<=', 'shops.low_stock_threshold')
            ->selectRaw('batches.shop_id as shop_id, COUNT(*) as total')
            ->groupBy('batches.shop_id')
            ->pluck('total', 'shop_id');

        $outOfStockCounts = Batch::query()
            ->whereIn('shop_id', $shopIds)
            ->where('units_remaining', '<=', 0)
            ->selectRaw('shop_id, COUNT(*) as total')
            ->groupBy('shop_id')
            ->pluck('total', 'shop_id');

        // 4. Expiring soon uses each shop's own alert window, so it is grouped
        //    by window rather than run once per shop.
        $expiringSoonCounts = [];
        $allShops
            ->groupBy(fn (Shop $shop) => $shop->expiry_alert_days ?? 30)
            ->each(function ($group, $days) use (&$expiringSoonCounts, $today) {
                $counts = Batch::query()
                    ->whereIn('shop_id', $group->pluck('id'))
                    ->where('units_remaining', '>', 0)
                    ->whereDate('expiry_date', '>=', $today)
                    ->whereDate('expiry_date', '<=', $today->copy()->addDays((int) $days))
                    ->selectRaw('shop_id, COUNT(*) as total')
                    ->groupBy('shop_id')
                    ->pluck('total', 'shop_id');

                foreach ($counts as $shopId => $total) {
                    $expiringSoonCounts[$shopId] = $total;
                }
            });

        // 5. Apply the live search on the already-loaded collection.
        $shops = $allShops;

        if ($request->filled('search')) {
            $search = mb_strtolower(trim($request->string('search')->toString()));

            $shops = $shops
                ->filter(fn (Shop $shop) => str_contains(mb_strtolower($shop->name), $search)
                    || str_contains(mb_strtolower($shop->location), $search))
                ->values();
        }

        // 6. Map the shop payload plus the per-shop stats used by the cards.
        $shops = $shops->map(function (Shop $shop) use ($salesToday, $lowStockCounts, $outOfStockCounts, $expiringSoonCounts): array {
            $sales = $salesToday->get($shop->id);

            return [
                'uuid' => $shop->uuid,
                'name' => $shop->name,
                'location' => $shop->location,
                'address' => $shop->address,
                'phone' => $shop->phone,
                'currency' => $shop->currency,
                'currency_symbol' => $shop->currency_symbol,
                'is_active' => $shop->is_active,
                'created_at' => $shop->created_at?->toIso8601String(),
                'stats' => [
                    'total_sales_today' => (float) ($sales->total_sales ?? 0),
                    'transactions_today' => (int) ($sales->transactions ?? 0),
                    'staff_count' => (int) $shop->staff_count,
                    'low_stock_count' => (int) ($lowStockCounts[$shop->id] ?? 0),
                    'out_of_stock_count' => (int) ($outOfStockCounts[$shop->id] ?? 0),
                    'expiring_soon_count' => (int) ($expiringSoonCounts[$shop->id] ?? 0),
                ],
            ];
        });

        // 7. Business-wide headline numbers, always across every shop.
        $lowStockAlerts = (int) $lowStockCounts->sum();
        $expiringSoonAlerts = (int) array_sum($expiringSoonCounts);

        $businessStats = [
            'totalShops' => $allShops->count(),
            'activeShops' => $allShops->where('is_active', true)->count(),
            'totalSalesToday' => (float) $salesToday->sum('total_sales'),
            'totalTransactionsToday' => (int) $salesToday->sum('transactions'),
            'totalStaff' => (int) $allShops->sum('staff_count'),
            'lowStockAlerts' => $lowStockAlerts,
            'expiringSoonAlerts' => $expiringSoonAlerts,
            'totalAlerts' => $lowStockAlerts + $expiringSoonAlerts,
            'currencySymbol' => $allShops->first()->currency_symbol ?? 'TSh',
        ];

        // 8. Return the Inertia view with all the payload data
        return Inertia::render('admin/overview/shops', [
            'shops' => $shops,
            'stats' => $businessStats,
            'filters' => $request->only(['search']),
        ]);
    }

    public function staffManagement(Request $request): Response
    {
        $search = trim($request->string('search')->toString());
        $role = $request->string('role')->toString();
        $status = $request->string('status')->toString();
        $shop = $request->string('shop')->toString(); // NEW: shop uuid from the URL

        $staff = User::query()
            ->with(['roles:id,name', 'permissions:id,name', 'shops:id,uuid,name,location'])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query->where('firstname', 'like', "%{$search}%")
                        ->orWhere('lastname', 'like', "%{$search}%")
                        ->orWhere('username', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhereRaw(
                            "CONCAT(firstname, ' ', lastname) LIKE ?",
                            ["%{$search}%"],
                        );
                });
            })
            ->when($role !== '', fn ($query) => $query->role($role))
            ->when($status !== '', fn ($query) => $query->where('status', $status))
             // NEW: only users linked to the selected shop
            ->when($shop !== '', fn ($query) => $query->whereHas(
                'shops',
                fn ($q) => $q->where('shops.uuid', $shop),
            ))
            ->orderBy('firstname')
            ->orderBy('lastname')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (User $user) => [
                'uuid' => $user->uuid,
                'firstname' => $user->firstname,
                'lastname' => $user->lastname,
                'gender' => $user->gender,
                'email' => $user->email,
                'phone' => $user->phone,
                'status' => $user->status,
                'roles' => $user->getRoleNames(),
                'permissions' => $user->getPermissionNames(),
                'shops' => $user->shops->map(fn ($shop) => [
                    'uuid' => $shop->uuid,
                    'name' => $shop->name,
                    'location' => $shop->location,
                ])->values(),
                'created_at' => $user->created_at?->toIso8601String(),
            ]);

        $stats = [
            'total' => User::count(),
            'active' => User::where('status', 'active')->count(),
            'suspended' => User::where('status', 'suspended')->count(),
            'inactive' => User::where('status', 'inactive')->count(),
        ];

        return Inertia::render('admin/management/staff-management', [
            'staff' => $staff,
            'stats' => $stats,
            'available_roles' => Role::pluck('name'),
            'available_permissions' => Permission::pluck('name'),
            'available_shops' => Shop::query()
                ->orderBy('name')
                ->get(['uuid', 'name', 'location']),
            'filters' => [
                'search' => $search,
                'role' => $role,
                'status' => $status,
                'shop' => $shop,
            ],
        ]);
    }

    public function staffDetails(User $user): Response
    {
        $user->loadMissing('shops');

        return Inertia::render('admin/management/staff-details', [
            'member' => [
                'uuid' => $user->uuid,
                'firstname' => $user->firstname,
                'lastname' => $user->lastname,
                'gender' => $user->gender,
                'email' => $user->email,
                'phone' => $user->phone,
                'status' => $user->status,
                'roles' => $user->getRoleNames(),
                'permissions' => $user->getPermissionNames(),
                'shops' => $user->shops->map(fn ($shop) => [
                    'uuid' => $shop->uuid,
                    'name' => $shop->name,
                    'location' => $shop->location,
                ])->values(),
                'created_at' => $user->created_at?->toIso8601String(),
            ],
            'availableRoles' => Role::pluck('name'),
            'availablePermissions' => Permission::pluck('name'),
            'availableShops' => Shop::query()
                ->orderBy('name')
                ->get(['uuid', 'name', 'location']),
        ]);
    }

    public function updateStaff(Request $request, User $user): RedirectResponse
    {

        $validated = $request->validate([
            'firstname' => ['required', 'string', 'max:255'],
            'lastname' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email:rfc,dns', 'max:255', Rule::unique(User::class)->ignore($user->id)],
            'gender' => ['required', Rule::in(['male', 'female'])],
            'phone' => ['required', 'string', 'max:30'],
            'role' => ['required', 'string', Rule::exists('roles', 'name')],
            'permissions' => ['present', 'array'],
            'permissions.*' => ['string', Rule::exists('permissions', 'name')],
            'shops' => ['present', 'array'],
            'shops.*' => ['uuid', Rule::exists('shops', 'uuid')],
        ]);

        $previous = [
            'firstname' => $user->firstname,
            'lastname' => $user->lastname,
            'email' => $user->email,
            'gender' => $user->gender,
            'phone' => $user->phone,
            'role' => $user->getRoleNames()->first() ?? '',
            'permissions' => $user->getPermissionNames()->all(),
            'shops' => $user->shops->pluck('uuid')->all(),
        ];

        DB::beginTransaction();

        try {
            $user->forceFill([
                'firstname' => $validated['firstname'],
                'lastname' => $validated['lastname'],
                'email' => $validated['email'],
                'gender' => $validated['gender'],
                'phone' => $validated['phone'],
            ])->save();

            $user->syncRoles($validated['role']);
            $user->syncPermissions($validated['permissions']);

            // admins already have access to every shop, so keep no individual links
            $shopIds = $validated['role'] === 'admin'
            ? []
            : Shop::whereIn('uuid', $validated['shops'])->pluck('id')->all();

            $user->shops()->sync($shopIds);

            AdminActivity::log('staff')
                ->performedOn($user)
                ->causedBy(Auth::user())
                ->event('updated')
                ->withChanges([
                    'attributes' => [
                        'firstname' => $validated['firstname'],
                        'lastname' => $validated['lastname'],
                        'email' => $validated['email'],
                        'gender' => $validated['gender'],
                        'phone' => $validated['phone'],
                        'role' => $validated['role'],
                        'permissions' => $validated['permissions'],
                        'shops' => $validated['role'] === 'admin' ? [] : $validated['shops'],
                    ],
                    'old' => $previous,
                ])
                ->log("Staff member {$validated['firstname']} {$validated['lastname']} updated");

            DB::commit();
            Inertia::flash('toast', ['type' => 'success', 'message' => __('Staff updated successfully.')]);

            return back();

        } catch (Throwable $e) {
            DB::rollBack();

            return back()->withErrors([
                'error' => 'Could not update the staff member. Please try again.',
            ]);
        }

    }

    public function updateCredentials(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'username' => [
                'required',
                'string',
                'max:255',
                'regex:/^[A-Za-z0-9._-]+$/',
                Rule::unique(User::class)->ignore($user->id),
            ],
            'password' => ['nullable', 'confirmed', Password::defaults()],
        ]);

        $previousUsername = $user->username;
        $passwordChanged = filled($validated['password'] ?? null);

        DB::beginTransaction();

        try {
            $user->username = $validated['username'];

            if ($passwordChanged) {
                $user->password = $validated['password'];
            }

            $user->save();

            AdminActivity::log('staff')
                ->performedOn($user)
                ->causedBy(Auth::user())
                ->event('updated')
                ->withChanges([
                    'attributes' => ['username' => $validated['username']],
                    'old' => ['username' => $previousUsername],
                ])
                ->withProperties(['password_changed' => $passwordChanged])
                ->log("Credentials updated for {$user->firstname} {$user->lastname}");

            DB::commit();
            Inertia::flash('toast', ['type' => 'success', 'message' => __('Staff Credentials updated successfully.')]);

            return back();
        } catch (Throwable $e) {
            DB::rollBack();

            return back()->withErrors([
                'credentials' => 'Could not update the credentials. Please try again.',
            ]);
        }
    }

    public function createStaff(Request $request): RedirectResponse
    {

        $validated = $request->validate([
            'firstname' => ['required', 'string', 'max:255'],
            'lastname' => ['required', 'string', 'max:255'],
            'username' => [
                'required',
                'string',
                'max:255',
                'regex:/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/',
                Rule::unique(User::class),
            ],
            'email' => ['nullable', 'email:rfc,dns', 'max:255', Rule::unique(User::class)],
            'phone' => ['required', 'string', 'max:30'],
            'gender' => ['required', Rule::in(['male', 'female'])],
            'password' => ['required', 'confirmed', Password::defaults()],
            'role' => ['required', 'string', Rule::exists('roles', 'name')],
            'permissions' => ['present', 'array'],
            'permissions.*' => ['string', Rule::exists('permissions', 'name')],
            'shops' => ['present', 'array'],
            'shops.*' => ['uuid', Rule::exists('shops', 'uuid')],
        ]);

        DB::beginTransaction();

        try {
            $user = User::create([
                'firstname' => $validated['firstname'],
                'lastname' => $validated['lastname'],
                'username' => $validated['username'],
                'email' => $validated['email'],
                'phone' => $validated['phone'],
                'gender' => $validated['gender'],
                'password' => $validated['password'],
            ]);

            // Accounts are provisioned by an admin, so no email verification step is needed.
            $user->forceFill(['email_verified_at' => now()])->save();

            $user->assignRole($validated['role']);
            $user->syncPermissions($validated['permissions']);

            // admins already have access to every shop, so keep no individual links
            $shopIds = $validated['role'] === 'admin'
                ? []
                : Shop::whereIn('uuid', $validated['shops'])->pluck('id')->all();

            $user->shops()->sync($shopIds);

            AdminActivity::log('staff')
                ->performedOn($user)
                ->causedBy(Auth::user())
                ->event('created')
                ->withProperties([
                    'username' => $user->username,
                    'role' => $validated['role'],
                    'permissions' => $validated['permissions'],
                    'shops' => $validated['role'] === 'admin' ? [] : $validated['shops'],
                ])
                ->log("Staff member {$validated['firstname']} {$validated['lastname']} created");

            DB::commit();
            Inertia::flash('toast', ['type' => 'success', 'message' => __('Staff created successfully.')]);

            return back();
        } catch (Throwable $e) {
            DB::rollBack();

            return back()->withErrors([
                'staff' => 'Could not create the staff member. Please try again.',
            ]);
        }
    }

    public function activateStaff(User $user): RedirectResponse
    {
        $previousStatus = $user->status;
        $user->update(['status' => 'active']);

        AdminActivity::log('staff')
            ->performedOn($user)
            ->causedBy(Auth::user())
            ->event('updated')
            ->withChanges([
                'attributes' => ['status' => 'active'],
                'old' => ['status' => $previousStatus],
            ])
            ->log("Staff member {$user->firstname} {$user->lastname} activated");

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Staff activated successfully.')]);

        return back();
    }

    public function suspendStaff(User $user): RedirectResponse
    {
        $previousStatus = $user->status;
        $user->update(['status' => 'suspended']);

        AdminActivity::log('staff')
            ->performedOn($user)
            ->causedBy(Auth::user())
            ->event('updated')
            ->withChanges([
                'attributes' => ['status' => 'suspended'],
                'old' => ['status' => $previousStatus],
            ])
            ->log("Staff member {$user->firstname} {$user->lastname} suspended");

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Staff suspended successfully.')]);

        return back();
    }

    /**
     * Show the organisation-wide activity log across every shop and admin action.
     */
    public function activityLogs(Request $request): Response
    {
        $search = trim($request->string('search')->toString());
        $logName = $request->string('log')->toString();
        $event = $request->string('event')->toString();
        $causer = $request->string('causer')->toString();
        $shopUuid = $request->string('shop')->toString();
        $from = $request->string('from')->toString();
        $to = $request->string('to')->toString();

        $shops = Shop::query()
            ->orderBy('name')
            ->get(['id', 'uuid', 'name'])
            ->keyBy('id');

        $selectedShopId = $shopUuid !== ''
            ? $shops->firstWhere('uuid', $shopUuid)?->id
            : null;

        $baseQuery = Activity::query();

        $activities = (clone $baseQuery)
            ->with([
                'causer',
                'subject' => fn (MorphTo $morphTo) => $morphTo->morphWith([
                    Batch::class => ['product:id,name'],
                ]),
            ])
            ->when($search !== '', function (Builder $query) use ($search, $shops) {
                $matchingShopIds = $shops
                    ->filter(fn (Shop $shop) => str_contains(mb_strtolower($shop->name), mb_strtolower($search)))
                    ->pluck('id');

                $query->where(function (Builder $query) use ($search, $matchingShopIds) {
                    $query->where('description', 'like', "%{$search}%")
                        ->orWhere('log_name', 'like', "%{$search}%")
                        ->orWhereHas('causer', function (Builder $query) use ($search) {
                            $query->where('firstname', 'like', "%{$search}%")
                                ->orWhere('lastname', 'like', "%{$search}%")
                                ->orWhere('username', 'like', "%{$search}%");
                        })
                        ->orWhereIn('shop_id', $matchingShopIds);
                });
            })
            ->when($shopUuid !== '', function (Builder $query) use ($shopUuid, $selectedShopId) {
                if ($shopUuid === 'admin') {
                    $query->whereNull('shop_id');
                } elseif ($selectedShopId === null) {
                    $query->whereRaw('1 = 0');
                } else {
                    $query->where('shop_id', $selectedShopId);
                }
            })
            ->when($logName !== '', fn (Builder $query) => $query->where('log_name', $logName))
            ->when($event !== '', fn (Builder $query) => $query->where('event', $event))
            ->when($causer !== '', fn (Builder $query) => $query->whereHas(
                'causer',
                fn (Builder $query) => $query->where('uuid', $causer),
            ))
            ->when($from !== '', fn (Builder $query) => $query->whereDate('created_at', '>=', $from))
            ->when($to !== '', fn (Builder $query) => $query->whereDate('created_at', '<=', $to))
            ->latest('id')
            ->paginate(20)
            ->withQueryString()
            ->through(function (Activity $activity) use ($shops) {
                $activityShop = $activity->shop_id !== null ? $shops->get($activity->shop_id) : null;

                return [
                    'id' => $activity->id,
                    'log_name' => $activity->log_name ?? 'default',
                    'event' => $activity->event ?? 'logged',
                    'description' => $activity->description,
                    'created_at' => $activity->created_at?->toIso8601String(),
                    'created_at_human' => $activity->created_at?->diffForHumans(),
                    'shop' => $activityShop ? [
                        'uuid' => $activityShop->uuid,
                        'name' => $activityShop->name,
                    ] : null,
                    'causer' => $this->causerPayload($activity),
                    'subject' => $this->subjectPayload($activity->subject, $activityShop),
                    'changes' => $this->changesPayload($activity),
                    'properties' => $this->propertiesPayload($activity),
                ];
            });

        return Inertia::render('admin/management/activity-logs', [
            'activities' => $activities,
            'stats' => [
                'total' => (clone $baseQuery)->count(),
                'today' => (clone $baseQuery)->whereDate('created_at', Carbon::today())->count(),
                'week' => (clone $baseQuery)->where('created_at', '>=', Carbon::now()->subDays(7))->count(),
                'shops' => (clone $baseQuery)->whereNotNull('shop_id')->distinct()->count('shop_id'),
            ],
            'options' => [
                'log_names' => (clone $baseQuery)
                    ->whereNotNull('log_name')
                    ->distinct()
                    ->orderBy('log_name')
                    ->pluck('log_name'),
                'events' => (clone $baseQuery)
                    ->whereNotNull('event')
                    ->distinct()
                    ->orderBy('event')
                    ->pluck('event'),
                'causers' => User::query()
                    ->orderBy('firstname')
                    ->orderBy('lastname')
                    ->get(['uuid', 'firstname', 'lastname', 'username'])
                    ->map(fn (User $causer) => [
                        'uuid' => $causer->uuid,
                        'name' => trim(($causer->firstname ?? '').' '.($causer->lastname ?? '')) ?: $causer->username,
                    ])
                    ->all(),
                'shops' => [
                    ['value' => 'admin', 'label' => 'Administration / system'],
                    ...$shops->values()
                        ->map(fn (Shop $shop) => ['value' => $shop->uuid, 'label' => $shop->name])
                        ->all(),
                ],
            ],
            'filters' => [
                'search' => $search,
                'log' => $logName,
                'event' => $event,
                'causer' => $causer,
                'shop' => $shopUuid,
                'from' => $from,
                'to' => $to,
            ],
        ]);
    }

    /**
     * @return array{uuid: string|null, name: string, initials: string}|null
     */
    private function causerPayload(Activity $activity): ?array
    {
        $causer = $activity->causer;

        if (! $causer instanceof User) {
            return null;
        }

        $name = trim(($causer->firstname ?? '').' '.($causer->lastname ?? ''));

        return [
            'uuid' => $causer->uuid,
            'name' => $name !== '' ? $name : ($causer->username ?? 'Unknown user'),
            'initials' => Str::of($name !== '' ? $name : $causer->username ?? '')
                ->squish()
                ->explode(' ')
                ->take(2)
                ->map(fn (string $part) => Str::upper(Str::substr($part, 0, 1)))
                ->implode(''),
        ];
    }

    /**
     * @return array{type: string, label: string, url: string|null}|null
     */
    private function subjectPayload(?Model $subject, ?Shop $shop): ?array
    {
        if (! $subject instanceof Model) {
            return null;
        }

        return match (true) {
            $subject instanceof DosageForm => [
                'type' => 'Dosage form',
                'label' => $subject->name,
                'url' => $shop ? route('shop.dosage-form-info', [
                    'shop' => $shop->uuid,
                    'dosageForm' => $subject->uuid,
                ]) : null,
            ],
            $subject instanceof Product => [
                'type' => 'Product',
                'label' => $subject->name,
                'url' => $shop ? route('shop.product-info', [
                    'shop' => $shop->uuid,
                    'product' => $subject->uuid,
                ]) : null,
            ],
            $subject instanceof Batch => [
                'type' => 'Batch',
                'label' => trim(
                    'Batch '.$subject->batch_number.
                    ($subject->relationLoaded('product') && $subject->product
                        ? ' · '.$subject->product->name
                        : ''),
                ),
                'url' => $shop ? route('shop.batch-info', [
                    'shop' => $shop->uuid,
                    'batch' => $subject->uuid,
                ]) : null,
            ],
            $subject instanceof Sale => [
                'type' => 'Sale',
                'label' => $subject->receipt_number,
                'url' => $shop ? route('shop.sale-info', [
                    'shop' => $shop->uuid,
                    'sale' => $subject->uuid,
                ]) : null,
            ],
            $subject instanceof User => [
                'type' => 'Staff member',
                'label' => trim(($subject->firstname ?? '').' '.($subject->lastname ?? '')) ?: ($subject->username ?? ''),
                'url' => route('admin.staff-details', ['user' => $subject->uuid]),
            ],
            $subject instanceof Shop => [
                'type' => 'Shop',
                'label' => $subject->name,
                'url' => route('admin.shops'),
            ],
            default => [
                'type' => Str::headline(class_basename($subject)),
                'label' => $subject->getAttribute('name') ?? '#'.$subject->getKey(),
                'url' => null,
            ],
        };
    }

    /**
     * @return array<int, array{key: string, label: string, old: string|null, new: string|null}>
     */
    private function changesPayload(Activity $activity): array
    {
        $changes = $activity->attribute_changes?->toArray() ?? [];

        $attributes = (array) ($changes['attributes'] ?? []);
        $old = (array) ($changes['old'] ?? []);

        $keys = array_values(array_unique([...array_keys($attributes), ...array_keys($old)]));

        return collect($keys)
            ->map(fn (string $key) => [
                'key' => $key,
                'label' => Str::headline($key),
                'old' => array_key_exists($key, $old) ? $this->stringifyValue($old[$key]) : null,
                'new' => array_key_exists($key, $attributes) ? $this->stringifyValue($attributes[$key]) : null,
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<int, array{key: string, label: string, value: string|null}>
     */
    private function propertiesPayload(Activity $activity): array
    {
        return collect($activity->properties?->toArray() ?? [])
            ->map(fn (mixed $value, string $key) => [
                'key' => $key,
                'label' => Str::headline($key),
                'value' => $this->stringifyValue($value),
            ])
            ->values()
            ->all();
    }

    private function stringifyValue(mixed $value): ?string
    {
        return match (true) {
            is_null($value) => null,
            is_bool($value) => $value ? 'true' : 'false',
            $value instanceof BackedEnum => (string) $value->value,
            is_array($value) => (string) json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            default => (string) $value,
        };
    }
}
