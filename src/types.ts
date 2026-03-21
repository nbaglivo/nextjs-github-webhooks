import type {
  EmitterWebhookEvent,
  EmitterWebhookEventName,
} from "@octokit/webhooks";

export type { EmitterWebhookEvent, EmitterWebhookEventName } from "@octokit/webhooks";

export type Options = {
  secret: string;
  handlers: Partial<Record<EmitterWebhookEventName, WebhookHandler>>;
};

export type WebhookContext<
  E extends EmitterWebhookEventName = EmitterWebhookEventName
> = {
  id: string;
  payload: EmitterWebhookEvent<E>["payload"];
};

/** Handler function – use WebhookContext<E> to type the parameter for specific events */
export type WebhookHandler = (context: { id: string; payload: any }) => Promise<void>;

/** Push event payload – alias of Octokit's typed payload */
export type PushPayload = EmitterWebhookEvent<"push">["payload"];
