import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {api, ApiError} from '../src/lib/api';

beforeEach(() => {
  document.cookie = 'devmasters_locale=en;path=/';
  document.cookie = 'XSRF-TOKEN=;max-age=0;path=/';
});
afterEach(() => {vi.unstubAllGlobals(); vi.restoreAllMocks();});

describe('Laravel API client', () => {
  it.each(['GET', 'HEAD', 'OPTIONS'])('keeps %s requests authenticated and uncached without requesting CSRF', async method => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({data: {title: 'Page'}}));
    vi.stubGlobal('fetch', fetchMock);

    expect(await api('/pages/home', {method})).toEqual({data: {title: 'Page'}});
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v1/pages/home');
    expect(options).toMatchObject({credentials: 'include', cache: 'no-store'});
    expect(options.headers.get('X-Locale')).toBe('en');
    expect(options.headers.get('Accept')).toBe('application/json');
  });

  it('sends decoded CSRF and idempotency headers while leaving multipart boundaries to the browser', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, {status: 204}))
      .mockResolvedValueOnce(Response.json({data: {reference_no: 'DM-RQ-TEST'}}, {status: 201}));
    vi.stubGlobal('fetch', fetchMock);
    document.cookie = 'XSRF-TOKEN=encoded%3Dtoken;path=/';
    const body = new FormData();
    body.append('attachments[]', new File(['pdf'], 'brief.pdf', {type: 'application/pdf'}));

    await api('/company-requests', {method: 'POST', headers: {'Idempotency-Key': 'request-key'}, body});

    expect(fetchMock.mock.calls[0][0]).toBe('/sanctum/csrf-cookie');
    const options = fetchMock.mock.calls[1][1];
    expect(options.body).toBe(body);
    expect(options.headers.get('X-XSRF-TOKEN')).toBe('encoded=token');
    expect(options.headers.get('Idempotency-Key')).toBe('request-key');
    expect(options.headers.has('Content-Type')).toBe(false);
  });

  it('shares one pending CSRF request between concurrent JSON writes', async () => {
    let release!: (response: Response) => void;
    const pending = new Promise<Response>(resolve => {release = resolve;});
    const fetchMock = vi.fn((url: string, _options?: RequestInit) => url === '/sanctum/csrf-cookie' ? pending : Promise.resolve(Response.json({data: {saved: true}})));
    vi.stubGlobal('fetch', fetchMock);
    const writes = [api('/locale', {method: 'POST', body: '{}'}), api('/locale', {method: 'POST', body: '{}'})];
    expect(fetchMock).toHaveBeenCalledOnce();

    release(new Response(null, {status: 204}));
    await Promise.all(writes);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.filter(([url]) => url === '/sanctum/csrf-cookie')).toHaveLength(1);
    const options = fetchMock.mock.calls[1][1]!;
    expect(new Headers(options.headers).get('Content-Type')).toBe('application/json');
  });

  it('normalizes a failed CSRF connection and allows the next write to retry', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError('Network failed'));
    vi.stubGlobal('fetch', fetchMock);
    await expect(api('/locale', {method: 'POST', body: '{}'})).rejects.toMatchObject({name: 'ApiError', status: 0});
    fetchMock.mockResolvedValueOnce(new Response(null, {status: 204})).mockResolvedValueOnce(new Response(null, {status: 204}));

    expect(await api('/locale', {method: 'POST', body: '{}'})).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('preserves API status, machine codes and validation fields', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({message: 'The given data was invalid.', code: 'VALIDATION_FAILED', errors: {submitted_email: ['Enter a valid email address.']}}, {status: 422})));

    await expect(api('/pages/home')).rejects.toMatchObject({status: 422, code: 'VALIDATION_FAILED', errors: {submitted_email: ['Enter a valid email address.']}});
  });

  it('localizes an existing error when the selected language changes', () => {
    const error = new ApiError('Unauthenticated.', 401, {}, 'UNAUTHENTICATED');
    expect(error.message).toBe('Unauthenticated.');

    document.cookie = 'devmasters_locale=km;path=/';

    expect(error.message).toBe('សូមចូលគណនីជាមុន។');
  });

  it('normalizes request connection failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network failed')));

    await expect(api('/pages/home')).rejects.toMatchObject({name: 'ApiError', status: 0});
  });

  it('publishes the authenticated user preference for the locale provider', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({data: {preferred_locale: 'km'}})));
    const dispatch = vi.spyOn(window, 'dispatchEvent');

    await api('/auth/me');

    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({type: 'devmasters:preferred-locale', detail: 'km'}));
  });
});
