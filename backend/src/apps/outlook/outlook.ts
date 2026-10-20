import { z } from 'zod';

import MicrosoftGraph from '../../integrations/microsoft_graph/microsoft_graph.js';
import { App, defineAppMethod } from '../../lib/App.js';
import { codedError } from '../../lib/utils.js';

// Inbox is fixed for this trigger; subscription/polling configuration comes later.
export const newEmailInInboxInputSchema = z.strictObject({});

export const sendEmailInputSchema = z.strictObject({
  recipients: z.array(z.email()).min(1).describe('Email addresses to send the message to.'),
  cc: z.array(z.email()).default([]).describe('Email addresses to copy.'),
  bcc: z.array(z.email()).default([]).describe('Email addresses to blind copy.'),
  subject: z.string().min(1).describe('The email subject.'),
  body: z.strictObject({
    content: z.string().min(1).describe('The message text or HTML.'),
    contentType: z.enum(['text', 'html']).default('text'),
  }),
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
      types: ['trigger'],
      inputSchema: newEmailInInboxInputSchema,
      handler: (input) => this.newEmailInInbox(input),
    }),
    defineAppMethod({
      method: 'send_email',
      ui_name: 'Send email',
      description: 'Send an email from the connected Outlook account.',
      types: ['action_in_app'],
      inputSchema: sendEmailInputSchema,
      handler: (input) => this.sendEmail(input),
    }),
  ];

  // Trigger delivery (polling or webhooks) and its output shape are not defined yet.
  protected async newEmailInInbox(_input: NewEmailInInboxInput): Promise<never> {
    throw codedError('APP_METHOD_NOT_IMPLEMENTED', 'The new email in inbox trigger is not implemented yet.');
  }

  protected async sendEmail(_input: SendEmailInput): Promise<never> {
    throw codedError('APP_METHOD_NOT_IMPLEMENTED', 'The send email action is not implemented yet.');
  }
}
