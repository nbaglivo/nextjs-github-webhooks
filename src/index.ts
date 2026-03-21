import { Webhooks } from "@octokit/webhooks";
import { NextResponse } from "next/server";
import type { Options } from "./types";

export type {
  EmitterWebhookEvent,
  EmitterWebhookEventName,
  Options,
  PushPayload,
  WebhookContext,
  WebhookHandler,
} from "./types";

export function createGitHubWebhookHandler(options: Options) {
    const webhooks = new Webhooks({ secret: options.secret });

    for (const [event, handler] of Object.entries(options.handlers)) {
        if (handler) webhooks.on(event as any, (evt) => handler({ id: evt.id, payload: evt.payload }));
    }

    return async (req: Request) => {
        const signature = req.headers.get("x-hub-signature-256");
        const event = req.headers.get("x-github-event");
        const delivery = req.headers.get("x-github-delivery");

        if (!signature || !event || !delivery) {
            return NextResponse.json({ error: "Missing headers" }, { status: 400 });
        }

        const body = await req.text();

        try {
            await webhooks.verifyAndReceive({
                id: delivery,
                name: event,
                signature,
                payload: body,
            });
        } catch {
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        return NextResponse.json({ received: true });
    }
}
