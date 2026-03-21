import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGitHubWebhookHandler } from "./index";

const { mockVerifyAndReceive, mockHandlers } = vi.hoisted(() => ({
  mockVerifyAndReceive: vi.fn(),
  mockHandlers: {} as Record<string, (evt: { id: string; payload: unknown }) => void>,
}));

vi.mock("@octokit/webhooks", () => ({
  Webhooks: vi.fn().mockImplementation(() => ({
    on: vi.fn((event: string, fn: (evt: { id: string; payload: unknown }) => void) => {
      mockHandlers[event] = fn;
    }),
    verifyAndReceive: mockVerifyAndReceive,
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
    mockVerifyAndReceive.mockResolvedValue(undefined);
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
    expect(mockVerifyAndReceive).not.toHaveBeenCalled();
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
    expect(mockVerifyAndReceive).not.toHaveBeenCalled();
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
    expect(mockVerifyAndReceive).not.toHaveBeenCalled();
  });

  it("returns 401 when verifyAndReceive throws (invalid signature)", async () => {
    mockVerifyAndReceive.mockRejectedValueOnce(new Error("Invalid signature"));
    const handler = createGitHubWebhookHandler({
      secret: "test-secret",
      handlers: {},
    });

    const res = await handler(createRequest());
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Invalid signature" });
    expect(mockVerifyAndReceive).toHaveBeenCalledWith({
      id: "delivery-123",
      name: "push",
      signature: "sha256=abc",
      payload: '{"ref":"refs/heads/main"}',
    });
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
    mockVerifyAndReceive.mockImplementation(async (opts: { id: string; name: string; payload: string }) => {
      const handler = mockHandlers[opts.name];
      if (handler) await handler({ id: opts.id, payload: JSON.parse(opts.payload) });
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
