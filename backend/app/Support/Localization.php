<?php

namespace App\Support;

use Illuminate\Support\Str;

class Localization
{
    public const SUPPORTED = ['km', 'en'];

    public static function valid(mixed $locale): bool
    {
        return is_string($locale) && in_array($locale, self::SUPPORTED, true);
    }

    public static function label(string $value): string
    {
        return __(preg_match('/[a-z]/', $value) ? (string) Str::headline($value) : ucfirst(strtolower(str_replace('_', ' ', $value))));
    }

    public static function status(?string $value): string
    {
        return $value === null ? '—' : __(ucfirst(strtolower(str_replace('_', ' ', $value))));
    }

    public static function text(string $value): string
    {
        return str_starts_with($value, 'Required offer field: ')
            ? __('Required offer field: ').self::label(substr($value, strlen('Required offer field: ')))
            : __($value);
    }

    public static function content(object $record, string $field, ?string $locale = null): mixed
    {
        $locale ??= app()->getLocale();
        $translations = $record->translations ?? [];

        return $translations[$locale][$field] ?? $translations['en'][$field] ?? $record->$field;
    }

    public static function inLocale(string $locale, callable $callback): mixed
    {
        $previous = app()->getLocale();
        try {
            app()->setLocale(self::valid($locale) ? $locale : 'km');

            return $callback();
        } finally {
            app()->setLocale($previous);
        }
    }
}
