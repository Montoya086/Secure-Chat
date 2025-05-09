import { EndpointBuilder, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
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

export interface OAuthLoginRequest {
	provider: 'google';
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
};

