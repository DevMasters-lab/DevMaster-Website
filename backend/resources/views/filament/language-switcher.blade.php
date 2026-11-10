@php($switcherId = 'admin-language-'.\Illuminate\Support\Str::random(8))
<div class="admin-language-control" x-data="{locale: @js(app()->getLocale()),error:false}" style="display:flex;align-items:center;gap:.5rem;padding:.4rem">
<label class="sr-only" for="{{ $switcherId }}">{{ __('Language') }}</label>
<select id="{{ $switcherId }}" aria-label="{{ __('Language') }}" x-model="locale" style="border:1px solid #ddd0ef;border-radius:7px;padding:.4rem;color:#6b3fc8;background:#faf7ff;line-height:1.8" @change="error=false;fetch('/locale',{method:'POST',credentials:'same-origin',headers:{'Accept':'application/json','Content-Type':'application/json','X-CSRF-TOKEN':document.querySelector('meta[name=csrf-token]').content},body:JSON.stringify({locale})}).then(async response=>{if(!response.ok)throw new Error();document.documentElement.lang=locale;await Promise.all(window.Livewire.all().map(component=>component.$wire.$refresh()));const heading=document.querySelector('h1');if(heading)document.title=heading.textContent+' · DevMasters';}).catch(()=>error=true)">
<option value="km" lang="km">🇰🇭 ខ្មែរ</option><option value="en" lang="en">🇬🇧 English</option>
</select><span x-show="error" role="alert">{{ __('Unable to save.') }}</span>
</div>
