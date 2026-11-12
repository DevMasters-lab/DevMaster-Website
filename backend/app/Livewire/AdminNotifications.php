<?php

namespace App\Livewire;

use App\Models\Notification;
use App\Models\User;
use Filament\Facades\Filament;
use Filament\Support\Components\Attributes\Exposed;
use Filament\Support\Components\Attributes\Unexposed;
use Illuminate\Contracts\View\View;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;
use Livewire\Component;

class AdminNotifications extends Component
{
    #[Exposed]
    public function markAsRead(string $id): void
    {
        $query = $this->notificationsQuery();

        if (! Str::isUuid($id)) {
            return;
        }

        $query->whereKey($id)->whereNull('read_at')->update(['read_at' => now()]);
    }

    #[Exposed]
    public function markAllAsRead(): void
    {
        $this->notificationsQuery()->whereNull('read_at')->update(['read_at' => now()]);
    }

    #[Unexposed]
    public function render(): View
    {
        return view('livewire.admin-notifications', [
            'unreadCount' => $this->notificationsQuery()->whereNull('read_at')->count(),
            'notifications' => $this->notificationsQuery()->latest()->orderByDesc('id')->limit(20)->get(),
        ]);
    }

    protected function notificationsQuery(): Builder
    {
        $user = Filament::auth()->user();

        abort_unless($user instanceof User, 401);
        abort_unless($user->canAccessPanel(Filament::getPanel('admin')), 403);

        return Notification::query()->where('recipient_user_id', $user->getKey());
    }
}
