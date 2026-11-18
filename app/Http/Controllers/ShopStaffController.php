<?php

namespace App\Http\Controllers;

use App\Models\Core\Shop;
use App\Models\User;
use App\Support\Activity\ShopActivity;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Throwable;

class ShopStaffController extends Controller
{
    /**
     * Roles a shop can assign to its own staff.
     *
     * @var list<string>
     */
    private const SHOP_ROLES = ['manager', 'cashier'];

    /**
     * Show the staff assigned to the given shop.
     */
    public function staffEdit(Request $request, Shop $shop): Response
    {

        $search = trim($request->string('search')->toString());
        $role = $request->string('role')->toString();
        $status = $request->string('status')->toString();

        $staff = $this->shopStaffQuery($shop)
            ->with(['roles:id,name', 'permissions:id,name', 'shops:id,uuid,name'])
            ->when($search !== '', function (Builder $query) use ($search) {
                $query->where(function (Builder $query) use ($search) {
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
            ->when($role !== '', fn (Builder $query) => $query->role($role))
            ->when($status !== '', fn (Builder $query) => $query->where('status', $status))
            ->orderBy('firstname')
            ->orderBy('lastname')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (User $user) => [
                'uuid' => $user->uuid,
                'name' => trim($user->firstname.' '.$user->lastname),
                'firstname' => $user->firstname,
                'lastname' => $user->lastname,
                'gender' => $user->gender,
                'email' => $user->email,
                'phone' => $user->phone,
                'status' => $user->status,
                'roles' => $user->getRoleNames(),
                'permissions' => $user->getPermissionNames(),
                'shops' => $user->shops->map(fn (Shop $assignedShop) => [
                    'uuid' => $assignedShop->uuid,
                    'name' => $assignedShop->name,
                ])->values(),
                'created_at' => $user->created_at?->toIso8601String(),
            ]);

        $stats = [
            'total' => $this->shopStaffQuery($shop)->count(),
            'active' => $this->shopStaffQuery($shop)->where('status', 'active')->count(),
            'inactive' => $this->shopStaffQuery($shop)->where('status', 'inactive')->count(),
            'suspended' => $this->shopStaffQuery($shop)->where('status', 'suspended')->count(),
        ];

        return Inertia::render('shop/system/shop-staff', [
            'staff' => $staff,
            'stats' => $stats,
            'available_roles' => $this->assignableRoles(),
            'available_permissions' => Permission::orderBy('name')->pluck('name'),
            'available_shops' => [
                ['uuid' => $shop->uuid, 'name' => $shop->name],
            ],
            'shop' => [
                'uuid' => $shop->uuid,
                'name' => $shop->name,
            ],
            'filters' => [
                'search' => $search,
                'role' => $role,
                'status' => $status,
            ],
        ]);
    }

    /**
     * Show the details of a staff member that belongs to this shop.
     */
    public function staffDetails(Shop $shop, User $user): Response
    {
        abort_unless(
            $this->shopStaffQuery($shop)->whereKey($user->getKey())->exists(),
            403,
        );

        $user->loadMissing('shops');

        return Inertia::render('shop/system/shop-staff-details', [
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
                'shops' => $user->shops->map(fn (Shop $assignedShop) => [
                    'uuid' => $assignedShop->uuid,
                    'name' => $assignedShop->name,
                    'location' => $assignedShop->location,
                ])->values(),
                'created_at' => $user->created_at?->toIso8601String(),
            ],
            'shop' => [
                'uuid' => $shop->uuid,
                'name' => $shop->name,
                'location' => $shop->location,
            ],
            'availableRoles' => $this->assignableRoles(),
            'availablePermissions' => Permission::orderBy('name')->pluck('name'),
        ]);
    }

    /**
     * Create a staff account and assign it to this shop.
     */
    public function createStaff(Request $request, Shop $shop): RedirectResponse
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
            'role' => ['required', 'string', Rule::exists('roles', 'name'), Rule::in(self::SHOP_ROLES)],
            'permissions' => ['present', 'array'],
            'permissions.*' => ['string', Rule::exists('permissions', 'name')],
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

            // Accounts are provisioned by shop management, so no email verification step is needed.
            $user->forceFill(['email_verified_at' => now()])->save();

            $user->assignRole($validated['role']);
            $user->syncPermissions($validated['permissions']);

            // Staff created from a shop are always linked to that shop only.
            $user->shops()->sync([$shop->id]);

            ShopActivity::for($shop->id, 'staff')
                ->performedOn($user)
                ->causedBy(Auth::user())
                ->event('created')
                ->withProperties([
                    'username' => $user->username,
                    'role' => $validated['role'],
                    'permissions' => $validated['permissions'],
                    'shop' => $shop->name,
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

    /**
     * Update a staff member that belongs to this shop.
     */
    public function updateStaff(Request $request, Shop $shop, User $user): RedirectResponse
    {

        $validated = $request->validate([
            'firstname' => ['required', 'string', 'max:255'],
            'lastname' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email:rfc,dns', 'max:255', Rule::unique(User::class)->ignore($user->id)],
            'gender' => ['required', Rule::in(['male', 'female'])],
            'phone' => ['required', 'string', 'max:30'],
            'role' => ['required', 'string', Rule::exists('roles', 'name'), Rule::in(self::SHOP_ROLES)],
            'permissions' => ['present', 'array'],
            'permissions.*' => ['string', Rule::exists('permissions', 'name')],
        ]);

        $previous = [
            'firstname' => $user->firstname,
            'lastname' => $user->lastname,
            'email' => $user->email,
            'gender' => $user->gender,
            'phone' => $user->phone,
            'role' => $user->getRoleNames()->first() ?? '',
            'permissions' => $user->getPermissionNames()->all(),
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

            ShopActivity::for($shop->id, 'staff')
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
                    ],
                    'old' => $previous,
                ])
                ->log("Staff member {$validated['firstname']} {$validated['lastname']} updated");

            // Shop assignments are managed per shop, so other shops stay untouched.
            DB::commit();
            Inertia::flash('toast', ['type' => 'success', 'message' => __('Staff updated successfully.')]);

            return back();
        } catch (Throwable $e) {
            DB::rollBack();

            return back()->withErrors([
                'staff' => 'Could not update the staff member. Please try again.',
            ]);
        }
    }

    /**
     * Update the login credentials of a staff member in this shop.
     */
    public function updateCredentials(Request $request, Shop $shop, User $user): RedirectResponse
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

            ShopActivity::for($shop->id, 'staff')
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
            Inertia::flash('toast', ['type' => 'success', 'message' => __('Staff credentials updated successfully.')]);

            return back();
        } catch (Throwable $e) {
            DB::rollBack();

            return back()->withErrors([
                'credentials' => 'Could not update the credentials. Please try again.',
            ]);
        }
    }

    /**
     * Activate a staff member of this shop.
     */
    public function activateStaff(Shop $shop, User $user): RedirectResponse
    {
        $previousStatus = $user->status;
        $user->update(['status' => 'active']);

        ShopActivity::for($shop->id, 'staff')
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

    public function suspendStaff(Shop $shop, User $user): RedirectResponse
    {
        $previousStatus = $user->status;
        $user->update(['status' => 'suspended']);

        ShopActivity::for($shop->id, 'staff')
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
     * Base query for users attached to the shop, excluding administrators.
     *
     * @return Builder<User>
     */
    private function shopStaffQuery(Shop $shop): Builder
    {
        return User::query()
            ->whereHas('shops', fn (Builder $query) => $query->where('shops.id', $shop->id))
            ->whereDoesntHave('roles', fn (Builder $query) => $query->where('name', 'admin'));
    }

    /**
     * Roles a shop page is allowed to assign.
     *
     * @return array<int, string>
     */
    private function assignableRoles(): array
    {
        return Role::query()
            ->whereIn('name', self::SHOP_ROLES)
            ->orderBy('name')
            ->pluck('name')
            ->all();
    }
}
