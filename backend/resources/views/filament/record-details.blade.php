<dl style="display:grid;gap:1rem">
@foreach($record->attributesToArray() as $key=>$value)
@if(!in_array($key,['password_hash','remember_token','app_authentication_secret','app_authentication_recovery_codes','refresh_token_hash','object_key','bucket_name']))
<div><dt style="font-weight:600">{{ \App\Support\Localization::label($key) }}</dt><dd style="overflow-wrap:anywhere;white-space:pre-wrap">{{ is_array($value) ? json_encode($value,JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE) : (in_array($key,['status','application_status','network_status','decision','response_type','scan_status','work_mode','channel','document_type']) ? \App\Support\Localization::status($value) : (in_array($key,['scan_message','last_error','error_message']) && is_string($value) ? \App\Support\Localization::text($value) : $value)) }}</dd></div>
@endif
@endforeach
</dl>
