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

// ========== NUEVOS TIPOS PARA CHAT ==========

export interface User {
	id: string;
	email: string;
	name: string;
	created_at: string;
}

export interface Message {
	id: string;
	sender_id: string;
	recipient_id: string;
	content: string;
	timestamp: string;
	security_info?: {
		is_signed: boolean;
		signature_valid: boolean;
		encrypted: boolean;
	};
	error?: string;
}

export interface ConversationResponse {
	conversation_between: {
		user1: string;
		user2: string;
	};
	message_count: number;
	messages: Message[];
}

export interface SendMessageRequest {
	recipientId: string;
	message: string;
}

export interface SendMessageResponse {
	status: string;
	message_id: string;
	security_features: {
		encrypted: boolean;
		signed: boolean;
		algorithm: string;
	};
}

export interface CurrentUserResponse {
	id: string;
	email: string;
	name?: string;
	given_name?: string;
	family_name?: string;
	created_at?: string;
	profile_picture?: string;
}