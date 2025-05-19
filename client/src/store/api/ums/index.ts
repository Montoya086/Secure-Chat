import Cookies from 'js-cookie';
import { TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME } from '../../../utils/constants';
import { AuthResponse, LoginRequest, MfaConfigureResponse, OAuthLoginRequest, RegisterRequest, VerifyMfaRequest, VerifyMfaResponse } from '../types';
import { QueryFulfilled, Builder } from '../types';
import { validateMfaStatus } from '../../../utils/validateMfaStatus';
import { setMfaEnabled } from '../../slices/appState-slice';

export const authEndpoints = (builder: Builder) => ({
  // Auth endpoints (unprotected)
  login: builder.mutation<AuthResponse, LoginRequest>({
    query: (credentials: LoginRequest) => ({
      url: 'auth/login',
      method: 'POST',
      body: credentials,
    }),
    async onQueryStarted(_arg: LoginRequest, { queryFulfilled, dispatch }: QueryFulfilled) {
      try {
        const { data } = await queryFulfilled;
        // Store tokens in cookies
        Cookies.set(TOKEN_COOKIE_NAME, data.access_token, {
          secure: true,
          sameSite: 'strict',
          expires: new Date(Date.now() + Number(data.access_token_expiration_time)),
        });
        const mfaEnabled = validateMfaStatus(data.access_token);
        dispatch(setMfaEnabled(mfaEnabled));
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
    }),
    async onQueryStarted(_arg: OAuthLoginRequest, { queryFulfilled, dispatch }: QueryFulfilled) {
      try {
        const { data } = await queryFulfilled;
        Cookies.set(TOKEN_COOKIE_NAME, data.access_token, {
          secure: true,
          sameSite: 'strict',
          expires: new Date(Date.now() + Number(data.access_token_expiration_time)),
        });
        const mfaEnabled = validateMfaStatus(data.access_token);
        dispatch(setMfaEnabled(mfaEnabled));
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
  configureMfa: builder.mutation<MfaConfigureResponse, void>({
    query: () => ({
      url: 'auth/mfa/configure',
      method: 'POST',
    }),
    transformResponse: (response: MfaConfigureResponse) => {
      return response;
    },
  }),
  verifyMfa: builder.mutation<VerifyMfaResponse, VerifyMfaRequest>({
    query: (data: VerifyMfaRequest) => ({
      url: 'auth/mfa/verify',
      method: 'POST',
      body: data,
    }),
    transformResponse: (response: VerifyMfaResponse) => {
      return response;
    },
  }),
});
