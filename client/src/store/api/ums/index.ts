import Cookies from 'js-cookie';
import { TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME } from '../../../utils/constants';
import { AuthResponse, LoginRequest, OAuthLoginRequest, RegisterRequest } from '../types';
import { QueryFulfilled, Builder } from '../types';

export const authEndpoints = (builder: Builder) => ({
  // Auth endpoints (unprotected)
  login: builder.mutation<AuthResponse, LoginRequest>({
    query: (credentials: LoginRequest) => ({
      url: 'auth/login',
      method: 'POST',
      body: credentials,
    }),
    async onQueryStarted(_arg: LoginRequest, { queryFulfilled }: QueryFulfilled) {
      try {
        const { data } = await queryFulfilled;
        // Store tokens in cookies
        Cookies.set(TOKEN_COOKIE_NAME, data.access_token, {
          secure: true,
          sameSite: 'strict',
          expires: new Date(Date.now() + Number(data.access_token_expiration_time)),
        });
        Cookies.set(REFRESH_TOKEN_COOKIE_NAME, data.refresh_token, {
          secure: true,
          sameSite: 'strict',
          expires: new Date(Date.now() + Number(data.refresh_token_expiration_time)),
        });
      } catch {
        console.error('Error logging in');
      }
    },
  }),
  oauthLogin: builder.mutation<AuthResponse, OAuthLoginRequest>({
    query: (credentials: OAuthLoginRequest) => ({
      url: 'auth/oauth/login',
      method: 'POST',
      body: credentials,
      async onQueryStarted(_arg: OAuthLoginRequest, { queryFulfilled }: QueryFulfilled) {
        try {
          const { data } = await queryFulfilled;
          Cookies.set(TOKEN_COOKIE_NAME, data.access_token, {
            secure: true,
            sameSite: 'strict',
            expires: new Date(Date.now() + Number(data.access_token_expiration_time)),
          });
          Cookies.set(REFRESH_TOKEN_COOKIE_NAME, data.refresh_token, {
            secure: true,
            sameSite: 'strict',
            expires: new Date(Date.now() + Number(data.refresh_token_expiration_time)),
          });
        } catch {
          console.error('Error logging in');
        }
      },
    }),
  }),
  register: builder.mutation<AuthResponse, RegisterRequest>({
    query: (userData: RegisterRequest) => ({
      url: 'auth/register',
      method: 'POST',
      body: userData,
    }),
    async onQueryStarted(_arg: RegisterRequest, { queryFulfilled }: QueryFulfilled) {
      try {
        const { data } = await queryFulfilled;
        Cookies.set(TOKEN_COOKIE_NAME, data.access_token, {
          secure: true,
          sameSite: 'strict',
          expires: new Date(Date.now() + Number(data.access_token_expiration_time)),
        });
        Cookies.set(REFRESH_TOKEN_COOKIE_NAME, data.refresh_token, {
          secure: true,
          sameSite: 'strict',
          expires: new Date(Date.now() + Number(data.refresh_token_expiration_time)),
        });
      } catch {
        console.error('Error registering user');
      }
    },
  }),
});
