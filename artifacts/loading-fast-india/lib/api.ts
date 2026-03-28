/**
 * Shared API base URL for all backend calls.
 * Uses EXPO_PUBLIC_DOMAIN in Replit environment,
 * falls back to localhost for local dev.
 */
export const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api-server/api`
  : "http://localhost:8080/api";

export interface WhatsAppTemplate {
  key: string;
  label: string;
  hints: string[];
}

export interface WhatsAppSendRequest {
  phone: string;
  template: string;
  variables?: string[];
}

export interface WhatsAppSendResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}
