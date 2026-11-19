<?php

namespace App\Http\Controllers;

use App\Models\Catalog\Batch;
use App\Models\Catalog\DosageForm;
use App\Models\Catalog\Product;
use App\Models\Core\Shop;
use App\Models\Sales\Sale;
use App\Models\User;
use BackedEnum;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Activitylog\Models\Activity;

class ShopLogsController extends Controller
{
    /**
     * Show the activity log for the given shop.
     */
    public function activityLogs(Request $request, Shop $shop): Response
    {
        $search = trim($request->string('search')->toString());
        $logName = $request->string('log')->toString();
        $event = $request->string('event')->toString();
        $causer = $request->string('causer')->toString();
        $from = $request->string('from')->toString();
        $to = $request->string('to')->toString();

        $baseQuery = Activity::query()->where('shop_id', $shop->id);

        $activities = (clone $baseQuery)
            ->with([
                'causer',
                'subject' => fn (MorphTo $morphTo) => $morphTo->morphWith([
                    Batch::class => ['product:id,name'],
                ]),
            ])
            ->when($search !== '', function (Builder $query) use ($search) {
                $query->where(function (Builder $query) use ($search) {
                    $query->where('description', 'like', "%{$search}%")
                        ->orWhere('log_name', 'like', "%{$search}%")
                        ->orWhereHas('causer', function (Builder $query) use ($search) {
                            $query->where('firstname', 'like', "%{$search}%")
                                ->orWhere('lastname', 'like', "%{$search}%")
                                ->orWhere('username', 'like', "%{$search}%");
                        });
                });
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
            ->through(fn (Activity $activity) => [
                'id' => $activity->id,
                'log_name' => $activity->log_name ?? 'default',
                'event' => $activity->event ?? 'logged',
                'description' => $activity->description,
                'created_at' => $activity->created_at?->toIso8601String(),
                'created_at_human' => $activity->created_at?->diffForHumans(),
                'causer' => $this->causerPayload($activity),
                'subject' => $this->subjectPayload($activity->subject, $shop),
                'changes' => $this->changesPayload($activity),
                'properties' => $this->propertiesPayload($activity),
            ]);

        return Inertia::render('shop/system/logs', [
            'activities' => $activities,
            'stats' => [
                'total' => (clone $baseQuery)->count(),
                'today' => (clone $baseQuery)->whereDate('created_at', Carbon::today())->count(),
                'week' => (clone $baseQuery)->where('created_at', '>=', Carbon::now()->subDays(7))->count(),
                'staff' => (clone $baseQuery)
                    ->whereNotNull('causer_id')
                    ->distinct()
                    ->count('causer_id'),
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
                'causers' => $this->shopCausers($shop),
            ],
            'filters' => [
                'search' => $search,
                'log' => $logName,
                'event' => $event,
                'causer' => $causer,
                'from' => $from,
                'to' => $to,
            ],
            'shop' => [
                'uuid' => $shop->uuid,
                'name' => $shop->name,
            ],
        ]);
    }

    /**
     * The user who triggered the activity, if it was a real person.
     *
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
     * A human readable label and link for the model the activity was performed on.
     *
     * @return array{type: string, label: string, url: string|null}|null
     */
    private function subjectPayload(?Model $subject, Shop $shop): ?array
    {
        if (! $subject instanceof Model) {
            return null;
        }

        return match (true) {
            $subject instanceof DosageForm => [
                'type' => 'Dosage form',
                'label' => $subject->name,
                'url' => route('shop.dosage-form-info', [
                    'shop' => $shop->uuid,
                    'dosageForm' => $subject->uuid,
                ]),
            ],
            $subject instanceof Product => [
                'type' => 'Product',
                'label' => $subject->name,
                'url' => route('shop.product-info', [
                    'shop' => $shop->uuid,
                    'product' => $subject->uuid,
                ]),
            ],
            $subject instanceof Batch => [
                'type' => 'Batch',
                'label' => trim(
                    'Batch '.$subject->batch_number.
                    ($subject->relationLoaded('product') && $subject->product
                        ? ' · '.$subject->product->name
                        : ''),
                ),
                'url' => route('shop.batch-info', [
                    'shop' => $shop->uuid,
                    'batch' => $subject->uuid,
                ]),
            ],
            $subject instanceof Sale => [
                'type' => 'Sale',
                'label' => $subject->receipt_number,
                'url' => route('shop.sale-info', [
                    'shop' => $shop->uuid,
                    'sale' => $subject->uuid,
                ]),
            ],
            $subject instanceof User => [
                'type' => 'Staff member',
                'label' => trim(($subject->firstname ?? '').' '.($subject->lastname ?? '')),
                // 'url' => route('shop.staff-edit', ['shop' => $shop->uuid]),

                'url' => route('shop.staff-details', ['shop' => $shop->uuid, 'user' => $subject->uuid]),
            ],
            $subject instanceof Shop => [
                'type' => 'Shop',
                'label' => $subject->name,
                'url' => null,
            ],
            default => [
                'type' => Str::headline(class_basename($subject)),
                'label' => $subject->getAttribute('name') ?? '#'.$subject->getKey(),
                'url' => null,
            ],
        };
    }

    /**
     * Flatten the v5 attribute_changes payload into old/new rows for the UI.
     *
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
     * Custom data attached to the activity, e.g. stock movement reasons.
     *
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

    /**
     * Staff that can appear as the causer of an activity in this shop.
     *
     * @return array<int, array{uuid: string, name: string}>
     */
    private function shopCausers(Shop $shop): array
    {
        return User::query()
            ->whereHas('shops', fn (Builder $query) => $query->where('shops.id', $shop->id))
            ->orderBy('firstname')
            ->orderBy('lastname')
            ->get(['uuid', 'firstname', 'lastname', 'username'])
            ->map(fn (User $user) => [
                'uuid' => $user->uuid,
                'name' => trim(($user->firstname ?? '').' '.($user->lastname ?? '')) ?: $user->username,
            ])
            ->all();
    }
}
