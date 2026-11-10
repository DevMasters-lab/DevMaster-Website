<?php

use App\Http\Controllers\Api\ApplicationCorrectionController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ExpertController;
use App\Http\Controllers\Api\PublicController;
use App\Http\Controllers\LocaleController;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Http\Middleware\AuthenticateSession;

Route::middleware('web')->prefix('v1')->group(function () {
    Route::get('/application-corrections/{token}', [ApplicationCorrectionController::class, 'show'])->middleware('throttle:recovery');
    Route::post('/application-corrections/{token}', [ApplicationCorrectionController::class, 'update'])->middleware('throttle:recovery');
    Route::get('/locale', [LocaleController::class, 'show']);
    Route::post('/locale', [LocaleController::class, 'update']);
    Route::get('/reference-data', [PublicController::class, 'reference']);
    Route::get('/pages/{slug}', [PublicController::class, 'page']);
    Route::post('/company-requests', [PublicController::class, 'company'])->middleware('throttle:public-submissions');
    Route::post('/expert-applications', [PublicController::class, 'application'])->middleware('throttle:public-submissions');
    Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('/auth/forgot-password', [AuthController::class, 'forgot'])->middleware('throttle:recovery');
    Route::post('/auth/reset-password', [AuthController::class, 'reset'])->middleware('throttle:recovery');
    Route::middleware(['auth:sanctum', AuthenticateSession::class, 'expert'])->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/expert/dashboard', [ExpertController::class, 'dashboard']);
        Route::get('/expert/profile', [ExpertController::class, 'showProfile']);
        Route::patch('/expert/profile', [ExpertController::class, 'updateProfile']);
        Route::put('/expert/skills', [ExpertController::class, 'skills']);
        Route::post('/expert/availability', [ExpertController::class, 'availability']);
        Route::delete('/expert/availability/{availability}', [ExpertController::class, 'deleteAvailability']);
        Route::get('/expert/offers', [ExpertController::class, 'offers']);
        Route::get('/expert/offers/{offer}', [ExpertController::class, 'offer']);
        Route::post('/expert/offer-versions/{version}/responses', [ExpertController::class, 'respond'])->middleware('throttle:commands');
        Route::get('/expert/placements', [ExpertController::class, 'placements']);
        Route::get('/expert/selection-decisions', [ExpertController::class, 'decisions']);
        Route::get('/expert/notifications', [ExpertController::class, 'notifications']);
        Route::patch('/expert/notifications/{notification}/read', [ExpertController::class, 'readNotification']);
        Route::get('/expert/documents', [ExpertController::class, 'documents']);
        Route::post('/expert/documents', [ExpertController::class, 'upload'])->middleware('throttle:commands');
        Route::get('/expert/document-versions/{version}/download', [ExpertController::class, 'download']);
        Route::get('/expert/consents', [ExpertController::class, 'consents']);
        Route::post('/expert/consents', [ExpertController::class, 'consent']);
    });
});
