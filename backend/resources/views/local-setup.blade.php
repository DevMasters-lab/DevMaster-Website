<!doctype html>
<html lang="{{ app()->getLocale() }}" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><title>{{ __('Local administrator setup') }} · DevMasters</title>
<link rel="stylesheet" href="/fonts/devmasters.css"><style>body{font-size:15px;background:#f5f2fb;color:#292034;margin:0;padding:48px 20px}main{max-width:440px;margin:auto;background:white;border:1px solid #e4dced;padding:32px;border-radius:12px}h1{font-size:28px;margin-top:0}p{color:#786c83;line-height:1.7}label{display:block;margin:18px 0 7px;font-size:13px}input{box-sizing:border-box;width:100%;padding:12px;border:1px solid #d8cde4;border-radius:5px}button{margin-top:25px;background:#6741d9;color:white;border:0;border-radius:6px;width:100%;padding:14px;font:inherit;cursor:pointer}.error{color:#a02a49}</style></head>
<body><main><h1>{{ __('Create your local administrator') }}</h1><p>{{ __('This one-time signed link sets up the first administrator on this computer. After signing in, you can enable authenticator MFA under Security.') }}</p>
@if($errors->any())<div class="error" role="alert">{{ $errors->first() }}</div>@endif
<form method="post" action="{{ request()->fullUrl() }}">@csrf
<label for="display_name">{{ __('Your name') }}</label><input id="display_name" name="display_name" autocomplete="name" required maxlength="200" value="{{ old('display_name') }}">
<label for="email">{{ __('Email address') }}</label><input id="email" name="email" type="email" autocomplete="email" required value="{{ old('email') }}">
<label for="password">{{ __('Password (at least 12 characters)') }}</label><input id="password" name="password" type="password" autocomplete="new-password" minlength="12" required>
<label for="password_confirmation">{{ __('Confirm password') }}</label><input id="password_confirmation" name="password_confirmation" type="password" autocomplete="new-password" minlength="12" required>
<button>{{ __('Create administrator') }}</button></form></main></body></html>
