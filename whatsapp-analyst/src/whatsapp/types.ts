export interface WhatsAppTextMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text';
  text: { body: string };
  from_user_id?: string;
}

export interface WhatsAppContact {
  profile?: { name?: string };
  wa_id?: string;
  user_id?: string;
}

export interface WhatsAppWebhookValue {
  messaging_product?: string;
  metadata?: {
    display_phone_number?: string;
    phone_number_id?: string;
  };
  contacts?: WhatsAppContact[];
  messages?: Array<Record<string, unknown>>;
  statuses?: unknown[];
}

export interface NormalizedInboundText {
  messageId: string;
  from: string;
  fromUserId?: string;
  contactUserId?: string;
  contactWaId?: string;
  text: string;
  timestamp: string;
}
