<?php

namespace Tests;

use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Hash;
use Laravel\Fortify\Features;
use Spatie\Permission\Models\Role;

abstract class TestCase extends BaseTestCase
{
    protected function skipUnlessFortifyHas(string $feature, ?string $message = null): void
    {
        if (! Features::enabled($feature)) {
            $this->markTestSkipped($message ?? "Fortify feature [{$feature}] is not enabled.");
        }
    }

    /**
     * Create an active user with a known password and, optionally, roles.
     *
     * @param  array<string, mixed>  $attributes
     * @param  array<int, string>  $roles
     */
    protected function createUser(array $attributes = [], array $roles = []): User
    {
        $user = User::factory()->create(array_merge([
            'status' => 'active',
            'password' => Hash::make('password'),
        ], $attributes));

        foreach ($roles as $role) {
            $user->assignRole(Role::findOrCreate($role));
        }

        return $user;
    }
}
