import { logger } from '../logger.js';

export interface WhatsAppClientConfig {
  accessToken: string;
  phoneNumberId: string;
  graphVersion: string;
}

export class WhatsAppClient {
  constructor(private readonly config: WhatsAppClientConfig) {}

  private messagesUrl(): string {
    return `https://graph.facebook.com/${this.config.graphVersion}/${this.config.phoneNumberId}/messages`;
  }

  private mediaUrl(): string {
    return `https://graph.facebook.com/${this.config.graphVersion}/${this.config.phoneNumberId}/media`;
  }

  private async postJson(body: Record<string, unknown>): Promise<unknown> {
    const response = await fetch(this.messagesUrl(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`WhatsApp API ${response.status}: ${text.slice(0, 500)}`);
    }
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }

  async markReadAndTyping(messageId: string): Promise<void> {
    await this.postJson({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
      typing_indicator: { type: 'text' },
    });
  }

  async sendText(to: string, body: string): Promise<void> {
    await this.postJson({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: false, body },
    });
  }

  async uploadImage(png: Buffer, filename = 'chart.png'): Promise<string> {
    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('type', 'image/png');
    form.append(
      'file',
      new Blob([new Uint8Array(png)], { type: 'image/png' }),
      filename
    );

    const response = await fetch(this.mediaUrl(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
      },
      body: form,
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Media upload ${response.status}: ${text.slice(0, 500)}`);
    }

    const json = JSON.parse(text) as { id?: string };
    if (!json.id) {
      throw new Error('Media upload response missing id');
    }
    logger.info('Uploaded WhatsApp media', { mediaId: json.id });
    return json.id;
  }

  async sendImage(
    to: string,
    mediaId: string,
    caption?: string
  ): Promise<void> {
    await this.postJson({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'image',
      image: {
        id: mediaId,
        ...(caption ? { caption: caption.slice(0, 1024) } : {}),
      },
    });
  }
}
