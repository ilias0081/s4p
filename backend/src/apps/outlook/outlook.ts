import { z } from 'zod';

import MicrosoftGraph from '../../integrations/microsoft_graph/microsoft_graph.js';
import { App, defineAppMethod } from '../../lib/App.js';
import { codedError } from '../../lib/utils.js';

// Fetch the newest inbox email once when this method is executed.
export const newEmailInInboxInputSchema = z.strictObject({});

const inboxResponseSchema = z.object({
  value: z.array(z.object({ id: z.string() }).passthrough()),
});

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
  constructor(integration: MicrosoftGraph) {
    super(integration);
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

  protected async newEmailInInbox(_input: NewEmailInInboxInput) {
    const accessToken = await this.integration.getAccessToken(this.appExecutionContext.userId);
    const url = new URL('https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages');
    url.searchParams.set('$top', '1');
    url.searchParams.set('$orderby', 'receivedDateTime desc');

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw codedError('UI_ERROR', `Unable to read your Outlook inbox (Microsoft Graph returned ${response.status}).`);
    }

    const inbox = inboxResponseSchema.parse(await response.json());
    return inbox.value[0] ?? null;
  }

  protected async sendEmail(_input: SendEmailInput): Promise<never> {
    throw codedError('APP_METHOD_NOT_IMPLEMENTED', 'The send email action is not implemented yet.');
  }
}
