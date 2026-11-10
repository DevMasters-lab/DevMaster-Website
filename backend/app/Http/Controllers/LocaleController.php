<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LocaleController extends Controller
{
    public function show(Request $request): array
    {
        return ['data' => ['locale' => app()->getLocale(), 'authenticated' => (bool) $request->user('web')]];
    }

    public function update(Request $request): mixed
    {
        $data = $request->validate(['locale' => ['required', Rule::in(['km', 'en'])]]);
        $user = $request->user('web');
        if ($user) {
            $user->update(['preferred_locale' => $data['locale']]);
        }
        app()->setLocale($data['locale']);
        $request->session()->put('locale', $data['locale']);
        $response = $request->expectsJson() ? response()->json(['data' => ['locale' => $data['locale']]]) : redirect()->back();

        return $response->cookie('devmasters_locale', $data['locale'], 525600, '/', null, $request->isSecure(), false, false, 'lax');
    }
}
