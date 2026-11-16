import english from '../../messages/en.json';
import khmer from '../../messages/km.json';

type ValidationErrors = Record<string, string[]>;
type ApiResponse = {
  message?: string;
  code?: string;
  errors?: ValidationErrors;
  data?: {preferred_locale?: string};
};

const messageKeys = new Map(Object.entries(english.ui).map(([key, value]) => [value, key]));

function cookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const prefix = `${name}=`;
  return document.cookie.split(';').map(value => value.trim()).find(value => value.startsWith(prefix))?.slice(prefix.length);
}

export class ApiError extends Error {
  constructor(message: string, public status: number, public errors: ValidationErrors = {}, public code = '') {
    super(message);
    this.name = 'ApiError';
    Object.defineProperty(this, 'message', {
      get: () => {
        const catalogue = cookie('devmasters_locale') === 'km' ? khmer : english;
        const key = messageKeys.get(message);
        return (catalogue.api as Record<string, string>)[code]
          || (key ? (catalogue.ui as Record<string, string>)[key] : message);
      },
    });
  }
}

let csrfPromise: Promise<void> | null = null;

async function csrf(): Promise<void> {
  csrfPromise ??= (async () => {
    let response: Response;
    try {
      response = await fetch('/sanctum/csrf-cookie', {
        credentials: 'include',
        headers: {Accept: 'application/json'},
        cache: 'no-store',
      });
    } catch {
      throw new ApiError('Cannot connect to DevMasters. Please try again shortly.', 0);
    }
    if (!response.ok) throw new ApiError('Unable to establish a secure session.', response.status);
  })().finally(() => {csrfPromise = null;});
  return csrfPromise;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  const locale = cookie('devmasters_locale');
  if (locale === 'km' || locale === 'en') headers.set('X-Locale', locale);

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    await csrf();
    const token = cookie('XSRF-TOKEN');
    if (token) headers.set('X-XSRF-TOKEN', decodeURIComponent(token));
    if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {...options, headers, credentials: 'include', cache: 'no-store'});
  } catch {
    throw new ApiError('Cannot connect to DevMasters. Please try again shortly.', 0);
  }

  const body = response.status === 204 ? null : await response.json().catch(() => null) as ApiResponse | null;
  if (!response.ok) {
    throw new ApiError(body?.message || 'The request could not be completed.', response.status, body?.errors || {}, body?.code || '');
  }
  if ((path === '/auth/login' || path === '/auth/me') && body?.data?.preferred_locale) {
    window.dispatchEvent(new CustomEvent('devmasters:preferred-locale', {detail: body.data.preferred_locale}));
  }
  return body as T;
}
