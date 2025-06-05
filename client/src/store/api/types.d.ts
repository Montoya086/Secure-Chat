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
	givenName: string;
	familyName: string;
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

// ========== TIPOS PARA CHAT DIRECTO ==========

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
		system?: string;
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
		flow?: string;
	};
}

export interface UserPublicKeyResponse {
	user_id: string;
	email: string;
	name: string;
	public_key: string;
	signing_public_key?: string;
}

// ========== TIPOS PARA GRUPOS ==========

export interface Group {
	id: string;
	name: string;
	admin_id: string;
	is_admin: boolean;
	member_count: number;
	members: GroupMember[];
	last_message?: string;
	last_message_time?: string;
	created_at: string;
}

export interface GroupMember {
	id: string;
	name: string;
	email: string;
}

export interface CreateGroupRequest {
	name: string;
	member_ids?: string[];
}

export interface CreateGroupResponse {
	status: string;
	group_id: string;
	group_name?: string;
	admin_id: string;
	members_added?: GroupMember[];
	total_members?: number;
	security_info: {
		encryption: string;
		key_management: string;
	};
}

export interface AddGroupMemberRequest {
	user_id: string;
}

export interface AddGroupMemberResponse {
	status: string;
	group_id: string;
	new_member_id: string;
	new_member_name?: string;
	new_member_email?: string;
}

export interface GroupMessage {
	id: string;
	sender_id: string;
	sender_name: string;
	group_id: string;
	content: string;
	timestamp: string;
	security_info?: {
		is_signed: boolean;
		signature_valid: boolean;
		encrypted: boolean;
		system: string;
	};
	error?: string;
}

export interface GroupConversationResponse {
	group_id: string;
	group_name: string;
	message_count: number;
	current_key_version: number;
	messages: GroupMessage[];
}

export interface SendGroupMessageRequest {
	message: string;
}

export interface SendGroupMessageResponse {
	status: string;
	message_id: string;
	group_id: string;
	group_name: string;
	security_features: {
		encrypted: boolean;
		signed: boolean;
		algorithm: string;
		flow: string;
		key_version: number;
	};
}

export interface GetGroupsResponse {
	groups: Group[];
	total_groups: number;
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