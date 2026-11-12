<div class="admin-notifications" wire:poll.60s.visible>
    <x-filament::dropdown placement="bottom-end" width="fi-width-sm admin-notifications-dropdown" :menu="false" :teleport="true" :shift="true">
        <x-slot name="trigger">
            <x-filament::icon-button
                :icon="\Filament\Support\Icons\Heroicon::OutlinedBell"
                :label="$unreadCount ? __('Notifications (:count unread)', ['count' => $unreadCount]) : __('Notifications')"
                color="gray"
                icon-size="lg"
                class="admin-notifications-trigger"
                x-on:click="$wire.$refresh()"
            >
                @if ($unreadCount)
                    <x-slot name="badge"><span class="admin-notifications-badge" aria-hidden="true">{{ $unreadCount > 99 ? '99+' : $unreadCount }}</span></x-slot>
                @endif
            </x-filament::icon-button>
        </x-slot>

        <section class="admin-notifications-panel" aria-label="{{ __('Notifications') }}">
            <div class="admin-notifications-heading">
                <strong>{{ __('Notifications') }}</strong>
                @if ($unreadCount)
                    <button type="button" class="admin-notifications-read" wire:click="markAllAsRead" wire:loading.attr="disabled">
                        {{ __('Mark all as read') }}
                    </button>
                @endif
            </div>
            <div class="admin-notifications-list">
                @forelse ($notifications as $notification)
                    <article class="admin-notifications-item {{ $notification->read_at ? '' : 'is-unread' }}" wire:key="admin-notification-{{ $notification->id }}">
                        <div class="admin-notifications-title">{{ \App\Support\Localization::content($notification, 'title') }}</div>
                        <p>{{ \App\Support\Localization::content($notification, 'body') }}</p>
                        <div class="admin-notifications-meta">
                            <time datetime="{{ $notification->created_at->toIso8601String() }}">{{ $notification->created_at->diffForHumans() }}</time>
                            @if (! $notification->read_at)
                                <button type="button" class="admin-notifications-read" wire:click="markAsRead('{{ $notification->id }}')" wire:loading.attr="disabled">
                                    {{ __('Mark as read') }}
                                </button>
                            @endif
                        </div>
                    </article>
                @empty
                    <div class="admin-notifications-empty">
                        <x-filament::icon :icon="\Filament\Support\Icons\Heroicon::OutlinedBell" />
                        <strong>{{ __('No notifications yet') }}</strong>
                        <p>{{ __('New notifications for your account will appear here.') }}</p>
                    </div>
                @endforelse
            </div>
        </section>
    </x-filament::dropdown>
</div>
