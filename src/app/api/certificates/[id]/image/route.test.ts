import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { auth, query, ImageResponse } = vi.hoisted(() => ({
  auth: vi.fn(),
  query: vi.fn(),
  ImageResponse: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/lib/db", () => ({ default: { query } }));

// The sheet's own rendering is a visual check, not a unit test. Standing in for
// it here keeps this file on what the route decides: who may see a certificate,
// whose name goes on it, and how the response is labelled.
vi.mock("next/og", () => ({
  ImageResponse: class {
    constructor(element: unknown, options: Record<string, unknown>) {
      ImageResponse(element, options);
      return new Response("png-bytes", {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          ...((options?.headers as Record<string, string>) ?? {}),
        },
      });
    }
  },
}));

import { GET } from "./route";

const HOLDER = "11111111-1111-1111-1111-111111111111";
const CERTIFICATE = "22222222-2222-2222-2222-222222222222";

/** What the join returns for a certificate that belongs to the caller. */
const row = (name: string) => ({
  id: CERTIFICATE,
  exam_type: "VUL",
  issued_at: new Date("2026-03-01T00:00:00Z"),
  certificate_no: "INS-2026-0042",
  recipient: name,
});

function request() {
  return new Request(
    `http://localhost/api/certificates/${CERTIFICATE}/image`,
  );
}

function params() {
  return { params: Promise.resolve({ id: CERTIFICATE }) };
}

/** The recipient the route handed to the renderer. */
function renderedRecipient() {
  const element = ImageResponse.mock.calls[0][0] as {
    props: { recipient: string };
  };
  return element.props.recipient;
}

beforeEach(() => {
  auth.mockResolvedValue({ user: { id: HOLDER, name: "Session Display Name" } });
  query.mockResolvedValue({ rowCount: 1, rows: [row("Maria Clara Santos")] });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/certificates/[id]/image", () => {
  it("renders the holder's own name, not the session's", async () => {
    const response = await GET(request(), params());

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(renderedRecipient()).toBe("Maria Clara Santos");
  });

  it("puts each holder's own name on their sheet", async () => {
    query.mockResolvedValue({ rowCount: 1, rows: [row("Jose Rizal Mercado")] });

    await GET(request(), params());

    expect(renderedRecipient()).toBe("Jose Rizal Mercado");
  });

  it("scopes the lookup to the signed-in user", async () => {
    await GET(request(), params());

    const [sql, values] = query.mock.calls[0];
    expect(sql).toContain("user_id = $2");
    expect(values).toEqual([CERTIFICATE, HOLDER]);
  });

  it("404s a certificate that is not the caller's", async () => {
    query.mockResolvedValue({ rowCount: 0, rows: [] });

    const response = await GET(request(), params());

    expect(response.status).toBe(404);
    expect(ImageResponse).not.toHaveBeenCalled();
  });

  it("401s a caller with no session", async () => {
    auth.mockResolvedValue(null);

    const response = await GET(request(), params());

    expect(response.status).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });

  it("names the download after the certificate number", async () => {
    const response = await GET(
      new Request(
        `http://localhost/api/certificates/${CERTIFICATE}/image?download=1`,
      ),
      params(),
    );

    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="INS-2026-0042.png"',
    );
  });

  it("serves inline unless a download was asked for", async () => {
    const response = await GET(request(), params());

    expect(response.headers.get("Content-Disposition")).toBeNull();
  });

  it("caches per browser, never in a shared cache", async () => {
    const response = await GET(request(), params());

    // A certificate is one holder's document. A shared cache keying on the URL
    // alone would hand it to the next caller.
    expect(response.headers.get("Cache-Control")).toContain("private");
  });
});
