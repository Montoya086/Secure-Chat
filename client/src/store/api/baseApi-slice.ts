import { createApi, fetchBaseQuery, FetchBaseQueryError, BaseQueryApi, FetchArgs } from '@reduxjs/toolkit/query/react';
import Cookies from 'js-cookie';
import { TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME } from '../../utils/constants';
import { setAppState } from '../slices/appState-slice';
import { authEndpoints } from './ums';

// Define a service using a base URL and expected endpoints
const baseUrl = import.meta.env.VITE_API_BASE_URL;

const baseQuery = fetchBaseQuery({ 
  baseUrl: baseUrl,
  prepareHeaders: (headers) => {
    // Get token from cookies
    const token = Cookies.get(TOKEN_COOKIE_NAME);
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

// Create a custom base query that handles 401 errors
export const baseQueryWithReauth = async (
  args: string | FetchArgs,
  api: BaseQueryApi,
  extraOptions: { [key: string]: unknown }
) => {
  // get the time left of the token
  const token = Cookies.get(TOKEN_COOKIE_NAME);
  let timeLeft = 0;
  if (token) {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expirationTime = payload.exp * 1000;
    timeLeft = expirationTime - Date.now();
  }

  const refreshToken = Cookies.get(REFRESH_TOKEN_COOKIE_NAME);

  if ((timeLeft <= 0) && !!refreshToken) {
    // refresh the token
    const refreshResult = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (refreshResult.ok) {
      const data = await refreshResult.json();
      Cookies.set(TOKEN_COOKIE_NAME, data.access_token, {
        secure: true,
        sameSite: 'strict',
        expires: new Date(Date.now() + Number(data.access_token_expiration_time)),
      });
    } else {
      Cookies.remove(TOKEN_COOKIE_NAME);
      Cookies.remove(REFRESH_TOKEN_COOKIE_NAME);
      api.dispatch(setAppState('NOT_LOGGED_IN'));
    }
  }

  const result = await baseQuery(args, api, extraOptions);

  // If the response is 401, handle unauthorized access
  if ((result.error as FetchBaseQueryError)?.status === 401) {
    // Remove the token
    Cookies.remove(TOKEN_COOKIE_NAME);
    // Update app state to logged out
    api.dispatch(setAppState('NOT_LOGGED_IN'));
  }

  return result;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    ...authEndpoints(builder),
  }),
});

// Export hooks for usage in components
export const {
  useLoginMutation,
  useRegisterMutation,
  useOauthLoginMutation,
} = apiSlice;