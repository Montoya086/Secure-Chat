import { EndpointBuilder, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { AnyAction } from '@reduxjs/toolkit';

export interface AuthResponse {
	access_token: string;
	refresh_token: string;
	access_token_expiration_time: number;
	refresh_token_expiration_time: number;
	user?: {
		id: string;
		email: string;
	};
}

export interface LoginRequest {
	email: string;
	password: string;
}

export type OAuthProvider = 'google';

export interface OAuthLoginRequest {
	provider: OAuthProvider;
	code: string;
}

export interface RegisterRequest {
	email: string;
	password: string;
}

export interface FileUploadResponse {
	url: string;
	filename: string;
}

export interface FileVerificationResponse {
	is_valid: boolean;
	message: string;
}

export type Builder = EndpointBuilder<
  ReturnType<typeof fetchBaseQuery>,
  string,
  'api'
>;

export type QueryFulfilled = {
  queryFulfilled: Promise<{ data: AuthResponse }>;
  dispatch: (action: AnyAction) => void;
};

export interface MfaConfigureResponse {
  qrcode: string;
}

export interface VerifyMfaRequest {
  otp: string;
}

export interface VerifyMfaResponse {
  valid: boolean;
}
