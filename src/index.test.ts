import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGitHubWebhookHandler } from "./index";

const { mockVerify, mockReceive, mockHandlers } = vi.hoisted(() => ({
  mockVerify: vi.fn(),
  mockReceive: vi.fn(),
  mockHandlers: {} as Record<string, (evt: { id: string; payload: unknown }) => void>,
}));

vi.mock("@octokit/webhooks", () => ({
  Webhooks: vi.fn().mockImplementation(() => ({
    on: vi.fn((event: string, fn: (evt: { id: string; payload: unknown }) => void) => {
      mockHandlers[event] = fn;
    }),
    verify: mockVerify,
    receive: mockReceive,
  })),
}));

function createRequest(
  overrides: Partial<{
    "x-hub-signature-256": string | null;
    "x-github-event": string | null;
    "x-github-delivery": string | null;
    body: string;
  }> = {}
): Request {
  const headers = new Headers();
  if (overrides["x-hub-signature-256"] !== null)
    headers.set("x-hub-signature-256", overrides["x-hub-signature-256"] ?? "sha256=abc");
  if (overrides["x-github-event"] !== null)
    headers.set("x-github-event", overrides["x-github-event"] ?? "push");
  if (overrides["x-github-delivery"] !== null)
    headers.set("x-github-delivery", overrides["x-github-delivery"] ?? "delivery-123");
  return new Request("https://example.com/webhook", {
    method: "POST",
    headers,
    body: overrides.body ?? '{"ref":"refs/heads/main"}',
  });
}

describe("createGitHubWebhookHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockHandlers).forEach((k) => delete mockHandlers[k]);
    mockVerify.mockResolvedValue(true);
    mockReceive.mockResolvedValue(undefined);
  });

  it("returns 400 when x-hub-signature-256 header is missing", async () => {
    const handler = createGitHubWebhookHandler({
      secret: "test-secret",
      handlers: {},
    });
    const req = createRequest({ "x-hub-signature-256": null });

    const res = await handler(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "Missing headers" });
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it("returns 400 when x-github-event header is missing", async () => {
    const handler = createGitHubWebhookHandler({
      secret: "test-secret",
      handlers: {},
    });
    const req = createRequest({ "x-github-event": null });

    const res = await handler(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "Missing headers" });
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it("returns 400 when x-github-delivery header is missing", async () => {
    const handler = createGitHubWebhookHandler({
      secret: "test-secret",
      handlers: {},
    });
    const req = createRequest({ "x-github-delivery": null });

    const res = await handler(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "Missing headers" });
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it("returns 401 when verify returns false (signature does not match)", async () => {
    mockVerify.mockResolvedValueOnce(false);
    const handler = createGitHubWebhookHandler({
      secret: "test-secret",
      handlers: {},
    });

    const res = await handler(createRequest());
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Invalid signature" });
    expect(mockVerify).toHaveBeenCalledWith('{"ref":"refs/heads/main"}', "sha256=abc");
    expect(mockReceive).not.toHaveBeenCalled();
  });

  it("returns 400 when body is not valid JSON", async () => {
    const handler = createGitHubWebhookHandler({
      secret: "test-secret",
      handlers: {},
    });

    const res = await handler(createRequest({ body: "{not-json" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "Invalid JSON payload" });
    expect(mockReceive).not.toHaveBeenCalled();
  });

  it("returns 500 when receive rejects because a handler failed", async () => {
    mockReceive.mockRejectedValueOnce(new Error("database unavailable"));
    const handler = createGitHubWebhookHandler({
      secret: "test-secret",
      handlers: {},
    });

    const res = await handler(createRequest());
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data).toEqual({ error: "Webhook handler failed" });
  });

  it("returns 200 with received: true when signature is valid", async () => {
    const handler = createGitHubWebhookHandler({
      secret: "test-secret",
      handlers: {},
    });

    const res = await handler(createRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ received: true });
  });

  it("invokes the registered handler with id and payload when event is received", async () => {
    const pushHandler = vi.fn().mockResolvedValue(undefined);
    mockReceive.mockImplementation(async (evt: { id: string; name: string; payload: unknown }) => {
      const fn = mockHandlers[evt.name];
      if (fn) await fn({ id: evt.id, payload: evt.payload });
    });

    const handler = createGitHubWebhookHandler({
      secret: "test-secret",
      handlers: { push: pushHandler },
    });

    const payload = { ref: "refs/heads/main", repository: { name: "foo" } };
    await handler(
      createRequest({
        body: JSON.stringify(payload),
        "x-github-delivery": "delivery-456",
      })
    );

    expect(pushHandler).toHaveBeenCalledTimes(1);
    expect(pushHandler).toHaveBeenCalledWith({
      id: "delivery-456",
      payload,
    });
  });
});
