const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export class ApiError extends Error {
  statusCode: number;
  details?: any;

  constructor(statusCode: number, message: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach Bearer token from localStorage for reliable cross-origin auth (Netlify -> Render)
  const token = localStorage.getItem('access_token');
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Sends HTTP-only cookies
  });

  let data: any = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  }

  if (!response.ok) {
    if (response.status === 401) {
      // Clear expired token on unauthorized
      localStorage.removeItem('access_token');
    }
    const errorMessage = data?.message || `Request failed with status ${response.status}`;
    throw new ApiError(response.status, errorMessage, data?.details);
  }

  // Save accessToken if returned from login/register/refresh
  if (data?.data?.accessToken) {
    localStorage.setItem('access_token', data.data.accessToken);
  }

  return data;
}
