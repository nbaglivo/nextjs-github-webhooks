<img src="./logo.svg" alt="nextjs-github-webhooks logo" width="80" height="80" />  

# nextjs-github-webhooks  

A lightweight integration for handling GitHub webhooks in your Next.js App Router application.

## Installation

```bash
pnpm add nextjs-github-webhooks
# or
npm install nextjs-github-webhooks
# or
yarn add nextjs-github-webhooks
```

## Setup

### 1. Create a webhook route

Create a route handler (e.g. `app/api/webhooks/github/route.ts`) and use `createGitHubWebhookHandler`:

```ts
import { createGitHubWebhookHandler } from "nextjs-github-webhooks";
import type { WebhookContext, PushPayload } from "nextjs-github-webhooks";

const handler = createGitHubWebhookHandler({
  secret: process.env.GITHUB_WEBHOOK_SECRET!,
  handlers: {
    push: async (ctx: WebhookContext<"push">) => {
      const { id, payload } = ctx;
      const pushPayload = payload as PushPayload;
      console.log(`Push to ${pushPayload.repository.full_name}: ${pushPayload.ref}`);
      // Handle your logic here
    },
  },
});

export const POST = handler;
```

### 2. Environment variable

Add your GitHub webhook secret to `.env.local`:

```env
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here
```

## Payload validation

This library verifies the **HMAC signature** (`X-Hub-Signature-256`) against the raw request body so only requests that match your GitHub webhook secret are accepted. It does **not** run runtime schema validation on the parsed JSON (for example with Zod or similar).

**Why:** A schema layer would add dependencies and ongoing maintenance beyond what `@octokit/webhooks` already provides as TypeScript types. For signed webhooks, the practical trust boundary is authenticity: the payload is what GitHub sent for that delivery.

**If you want to be extra defensive**—for example strict checks before branching on nested fields, compliance requirements, or guarding against unexpected shapes—validate `ctx.payload` inside your own handlers using whatever fits your project (Zod, manual guards, etc.). That stays optional and avoids pulling validation libraries into every consumer.

## API

### `createGitHubWebhookHandler(options)`

Creates an async request handler compatible with Next.js Route Handlers.

| Option      | Type                                            | Description                        |
| ----------- | ------------------------------------------------ | ---------------------------------- |
| `secret`    | `string`                                         | Webhook secret from GitHub         |
| `handlers`  | `Partial<Record<EmitterWebhookEventName, WebhookHandler>>` | Event name → handler mapping |

Returns an `async (req: Request) => Response` function.

### Handler events

You can register handlers for any [GitHub webhook event](https://docs.github.com/en/webhooks/webhook-events-and-payloads), for example:

- `push`
- `issues`
- `issue_comment`
- `pull_request`
- `star`
- `workflow_run`
- …and many more

Example with multiple events:

```ts
handlers: {
  push: async (ctx) => {
    console.log("Push received", ctx.payload);
  },
  issues: async (ctx) => {
    console.log("Issue event", ctx.payload);
  },
  pull_request: async (ctx) => {
    console.log("PR event", ctx.payload);
  },
}
```

### Types

- **`WebhookContext<E>`** – Context passed to handlers: `{ id: string; payload: T }`. Use `WebhookContext<"push">` for typed payloads.
- **`PushPayload`** – Typed payload for `push` events.
- **`WebhookHandler`** – Handler signature: `(context) => Promise<void>`.
- **`EmitterWebhookEventName`** – All supported event names from `@octokit/webhooks`.

## Responses

| Status | Condition |
| ------ | --------- |
| `400`  | Missing required headers (`x-hub-signature-256`, `x-github-event`, or `x-github-delivery`), or body is not valid JSON |
| `401`  | Invalid signature |
| `500`  | A registered handler threw or rejected |
| `200`  | Webhook processed successfully |

## License

MIT
