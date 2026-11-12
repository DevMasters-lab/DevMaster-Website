<?php

use App\Http\Controllers\LocaleController;
use App\Http\Controllers\LocalSetupController;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Route;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

Route::get('/', fn (): Response => response()->noContent());

Route::get('/admin/logo.{format}', function (string $format): BinaryFileResponse {
    $path = public_path('logo.'.$format);
    abort_unless(is_file($path), 404);

    return response()->file($path);
})->whereIn('format', ['png', 'jpg'])->withoutMiddleware('web');

Route::match(['get', 'post'], '/admin/setup', LocalSetupController::class)->middleware(['signed', 'throttle:recovery'])->name('local.setup');

Route::post('/locale', [LocaleController::class, 'update'])->name('locale.update');
