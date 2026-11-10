<?php

namespace App\Livewire;

use App\Support\Localization;
use Livewire\ComponentHook;

class LocaleHook extends ComponentHook
{
    private function resolve(): void
    {
        $locale = request()->attributes->get('resolved_locale');
        if (Localization::valid($locale)) {
            app()->setLocale($locale);
        }
    }

    public function hydrate(array $memo): void
    {
        $this->resolve();
    }

    public function call(mixed ...$arguments): void
    {
        $this->resolve();
    }

    public function update(mixed ...$arguments): void
    {
        $this->resolve();
    }

    public function render(mixed ...$arguments): void
    {
        $this->resolve();
    }
}
