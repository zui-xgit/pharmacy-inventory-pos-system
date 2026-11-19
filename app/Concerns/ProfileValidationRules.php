<?php

namespace App\Concerns;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Unique;

trait ProfileValidationRules
{
    /**
     * Get the validation rules used to validate user profiles.
     *
     * @return array<string, array<int, Unique|ValidationRule|array<mixed>|string>>
     */
    protected function profileRules(?int $userId = null): array
    {
        return [
            'firstname' => $this->nameRules(),
            'lastname' => $this->nameRules(),
            'gender' => ['required', Rule::in(['male', 'female'])],
            'phone' => ['required', 'string', 'max:20'],
            'email' => $this->emailRules($userId),
        ];
    }


    /**
     * Get the validation rules used to validate usernames.
     *
     * @return array<int, ValidationRule|string>
     */
    protected function usernameRules(?int $userId = null): array
    {
        return [
            'required',
            'string',
            'max:255',
            'regex:/^[A-Za-z0-9._-]+$/',
            $userId === null
                ? Rule::unique(User::class)
                : Rule::unique(User::class)->ignore($userId),
        ];
    }

    /**
     * Get the validation rules used to validate user names.
     *
     * @return array<int, Unique|ValidationRule|array<mixed>|string>
     */
    protected function nameRules(): array
    {
        return ['required', 'string', 'max:255'];
    }

    /**
     * Get the validation rules used to validate user emails.
     *
     * @return array<int, Unique|ValidationRule|array<mixed>|string>
     */
    protected function emailRules(?int $userId = null): array
    {
        return [
            'nullable',
            'string',
            'email:rfc,dns',
            'max:255',
            $userId === null
                ? Rule::unique(User::class)
                : Rule::unique(User::class)->ignore($userId),
        ];
    }
}
