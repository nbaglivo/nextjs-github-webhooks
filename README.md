# @sourceflow/nextjs-github-webhooks

A lightweight integration for handling GitHub webhooks in your Next.js App Router application.

## Installation

```bash
pnpm add @sourceflow/nextjs-github-webhooks
# or
npm install @sourceflow/nextjs-github-webhooks
# or
yarn add @sourceflow/nextjs-github-webhooks
```

## Setup

### 1. Create a webhook route

Create a route handler (e.g. `app/api/webhooks/github/route.ts`) and use `createGitHubWebhookHandler`:

```ts
import { createGitHubWebhookHandler } from "@sourceflow/nextjs-github-webhooks";
import type { WebhookContext, PushPayload } from "@sourceflow/nextjs-github-webhooks";

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

### 2. Configure your GitHub webhook

1. Go to your repository **Settings → Webhooks → Add webhook**
2. Set **Payload URL** to your route, e.g. `https://your-domain.com/api/webhooks/github`
3. Choose **Content type**: `application/json`
4. Generate and set a **Secret** – store it in `GITHUB_WEBHOOK_SECRET` (or your chosen env var)
5. Select the events you want to receive, or use **Just the push event** for minimal setup

### 3. Environment variable

Add your webhook secret to `.env.local`:

```env
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here
```

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

| Status | Condition                         |
| ------ | --------------------------------- |
| `400`  | Missing headers (`x-hub-signature-256`, `x-github-event`, or `x-github-delivery`) |
| `401`  | Invalid signature                 |
| `200`  | Webhook processed successfully   |

## License

MIT
