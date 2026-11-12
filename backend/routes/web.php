<?php

use App\Http\Controllers\LocaleController;
use App\Http\Controllers\LocalSetupController;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Route;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

Route::get('/', fn (): Response => response()->noContent());

Route::get('/admin/logo.jpg', function (): BinaryFileResponse {
    $path = public_path('logo.jpg');
    abort_unless(is_file($path), 404);

    return response()->file($path);
})->withoutMiddleware('web');

Route::match(['get', 'post'], '/admin/setup', LocalSetupController::class)->middleware(['signed', 'throttle:recovery'])->name('local.setup');

Route::post('/locale', [LocaleController::class, 'update'])->name('locale.update');
