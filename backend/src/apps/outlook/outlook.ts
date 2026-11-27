import { z } from 'zod';

import MicrosoftGraph from '../../integrations/microsoft_graph/microsoft_graph.js';
import { App, defineAppMethod } from '../../lib/App.js';
import { codedError } from '../../lib/utils.js';

// Fetch the newest inbox email once when this method is executed.
export const newEmailInInboxInputSchema = z.strictObject({});

const inboxResponseSchema = z.object({
  value: z.array(z.object({ id: z.string() }).passthrough()),
});

const immutableIdHeaders = { Prefer: 'IdType="ImmutableId"' };

export const sendEmailInputSchema = z.strictObject({
  recipients: z.array(z.email()).min(1).describe('Email addresses to send the message to.'),
  cc: z.array(z.email()).default([]).describe('Email addresses to copy.'),
  bcc: z.array(z.email()).default([]).describe('Email addresses to blind copy.'),
  subject: z.string().min(1).describe('The email subject.'),
  body: z.string().min(1).describe('The email body.').meta({ multiline: true }),
  saveToSentItems: z.boolean().default(true),
});

export type NewEmailInInboxInput = z.output<typeof newEmailInInboxInputSchema>;
export type SendEmailInput = z.output<typeof sendEmailInputSchema>;

export default class Outlook extends App {
  constructor(private readonly graph: MicrosoftGraph) {
    super(graph);
  }

  protected readonly methods = [
    defineAppMethod({
      method: 'new_email_in_inbox',
      ui_name: 'New email in inbox',
      description: 'Start the workflow when a new email arrives in the inbox.',
      readonly: true,
      types: ['trigger'],
      inputSchema: newEmailInInboxInputSchema,
      handler: (input) => this.newEmailInInbox(input),
      subscribe: (userId) => this.subscribeToInbox(userId),
    }),
    defineAppMethod({
      method: 'send_email',
      ui_name: 'Send email',
      description: 'Send an email from the connected Outlook account.',
      readonly: false,
      types: ['action_in_app'],
      inputSchema: sendEmailInputSchema,
      handler: (input) => this.sendEmail(input),
    }),
  ];

  private subscribeToInbox(userId: string) {
    return this.graph.createChangeSubscription(userId, {
      resource: "/me/mailfolders('inbox')/messages",
      changeType: 'created',
      expirationDateTime: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    }, immutableIdHeaders);
  }

  async getInboxNotificationMessage(userId: string, messageId: string) {
    const accessToken = await this.graph.getAccessToken(userId);
    return this.graph.requestJson(`me/messages/${encodeURIComponent(messageId)}`, accessToken, undefined, immutableIdHeaders);
  }

  protected async newEmailInInbox(_input: NewEmailInInboxInput) {
    const accessToken = await this.integration.getAccessToken(this.appExecutionContext.userId);
    const url = new URL('https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages');
    url.searchParams.set('$top', '1');
    url.searchParams.set('$orderby', 'receivedDateTime desc');

    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        throw codedError('EXTERNAL_SERVICE_FAILED', `Microsoft Graph inbox request returned ${response.status}.`);
      }

      const inbox = inboxResponseSchema.parse(await response.json());
      return inbox.value[0] ?? null;
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw codedError('EXTERNAL_SERVICE_TIMEOUT', 'Microsoft Graph inbox request timed out after 15 seconds.');
      }
      if (error instanceof Error && !('code' in error)) throw codedError('EXTERNAL_SERVICE_FAILED', error.message);
      throw error;
    }
  }

  protected async sendEmail(input: SendEmailInput) {
    const accessToken = await this.integration.getAccessToken(this.appExecutionContext.userId);
    const toRecipient = (address: string) => ({ emailAddress: { address } });

    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            subject: input.subject,
            body: { contentType: 'Text', content: input.body },
            toRecipients: input.recipients.map(toRecipient),
            ccRecipients: input.cc.map(toRecipient),
            bccRecipients: input.bcc.map(toRecipient),
          },
          saveToSentItems: input.saveToSentItems,
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        throw codedError('EXTERNAL_SERVICE_FAILED', `Microsoft Graph sendMail request returned ${response.status}.`);
      }

      // Graph returns 202 with no body; acceptance does not confirm delivery.
      return { accepted: true };
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw codedError('EXTERNAL_SERVICE_TIMEOUT', 'Microsoft Graph sendMail request timed out after 15 seconds.');
      }
      if (error instanceof Error && !('code' in error)) throw codedError('EXTERNAL_SERVICE_FAILED', error.message);
      throw error;
    }
  }
}
