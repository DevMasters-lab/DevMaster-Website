<div
    @class(['admin-language-control', 'admin-language-options' => ($variant ?? null) === 'login'])
    x-data="{
        locale: @js(app()->getLocale()),
        busy: false,
        error: false,
        labels: { en: @js(__('Switch to English', [], 'km')), km: @js(__('Switch to Khmer', [], 'en')) },
        toggleLocale() {
            return this.changeLocale(this.locale === 'km' ? 'en' : 'km');
        },
        async changeLocale(nextLocale) {
            if (this.busy || nextLocale === this.locale) return;
            this.busy = true;
            this.error = false;
            try {
                const response = await fetch('/locale', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]').content,
                    },
                    body: JSON.stringify({ locale: nextLocale }),
                });
                if (!response.ok) throw new Error();
                this.locale = nextLocale;
                document.documentElement.lang = nextLocale;
                window.dispatchEvent(new CustomEvent('admin-locale-changed', { detail: { locale: nextLocale } }));
                await Promise.all((window.Livewire?.all() ?? []).map(component => component.$wire.$refresh()));
                const heading = document.querySelector('h1');
                if (heading) document.title = heading.textContent + ' · DevMasters';
            } catch {
                this.error = true;
            } finally {
                this.busy = false;
            }
        },
    }"
    x-on:admin-locale-changed.window="locale = $event.detail.locale"
>
    @if (($variant ?? null) === 'login')
        <div class="admin-language-buttons" role="group" aria-label="{{ __('Language') }}">
            <button
                type="button"
                class="admin-language-option"
                :class="{ 'is-active': locale === 'km' }"
                :aria-pressed="locale === 'km'"
                :aria-busy="busy"
                :disabled="busy"
                @click="changeLocale('km')"
            >
                <span class="admin-language-option-flag" aria-hidden="true">🇰🇭</span>
                <span lang="km">ខ្មែរ</span>
            </button>
            <button
                type="button"
                class="admin-language-option"
                :class="{ 'is-active': locale === 'en' }"
                :aria-pressed="locale === 'en'"
                :aria-busy="busy"
                :disabled="busy"
                @click="changeLocale('en')"
            >
                <span class="admin-language-option-flag" aria-hidden="true">🇬🇧</span>
                <span lang="en">English</span>
            </button>
        </div>
    @else
        <button
            type="button"
            class="admin-language-toggle"
            :aria-label="labels[locale === 'km' ? 'en' : 'km']"
            :title="labels[locale === 'km' ? 'en' : 'km']"
            :aria-busy="busy"
            :disabled="busy"
            @click="toggleLocale()"
        >
            <span class="admin-language-flag" aria-hidden="true">
                <svg x-show="locale === 'km'" viewBox="0 0 36 36" focusable="false">
                    <path fill="#032ea1" d="M0 0h36v36H0z" />
                    <path fill="#e00025" d="M0 9h36v18H0z" />
                    <g fill="#fff">
                        <path d="M8 24h20v1H8zm2-2h16v2H10zm2-5h3v5h-3zm9 0h3v5h-3zm-5-7h4v7h-4z" />
                        <path d="m11 17 2.5-5 2.5 5zm9 0 2.5-5 2.5 5zm-5-2 3-5 3 5z" />
                        <path d="M10 19h16v1H10z" />
                    </g>
                    <path stroke="#e00025" stroke-width=".6" d="M13.5 17v5m4.5-8v8m4.5-5v5" />
                </svg>
                <svg x-show="locale === 'en'" viewBox="0 0 36 36" focusable="false">
                    <path fill="#012169" d="M0 0h36v36H0z" />
                    <path stroke="#fff" stroke-width="8" d="m0 0 36 36M36 0 0 36" />
                    <path stroke="#c8102e" stroke-width="3" d="m0 0 36 36M36 0 0 36" />
                    <path stroke="#fff" stroke-width="12" d="M18 0v36M0 18h36" />
                    <path stroke="#c8102e" stroke-width="7" d="M18 0v36M0 18h36" />
                </svg>
            </span>
        </button>
    @endif
    <span class="admin-language-error" x-cloak x-show="error" role="alert">{{ __('Unable to save.') }}</span>
</div>
