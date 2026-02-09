export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface PinVerifyRequest {
  pin: string;
  action: string;
  entity_type?: string;
  entity_id?: number;
}
