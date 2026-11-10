<?php

use App\Http\Controllers\LocaleController;
use App\Http\Controllers\LocalSetupController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::match(['get', 'post'], '/admin/setup', LocalSetupController::class)->middleware(['signed', 'throttle:recovery'])->name('local.setup');

Route::post('/locale', [LocaleController::class, 'update'])->name('locale.update');
