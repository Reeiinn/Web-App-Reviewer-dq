import { describe, expect, it } from "vitest";
import { appOrigin, appUrl } from "./app-url";

const request = (url: string, headers: Record<string, string> = {}) =>
  new Request(url, { headers });

describe("appOrigin", () => {
  it("prefers the configured address over the request", () => {
    expect(
      appOrigin(request("http://localhost:3000/api/invites"), {
        APP_URL: "https://insure.example.com",
      }),
    ).toBe("https://insure.example.com");
  });

  it("takes NextAuth's address when nothing app-specific is set", () => {
    expect(
      appOrigin(request("http://localhost:3000/api/invites"), {
        AUTH_URL: "https://insure.example.com/api/auth",
      }),
    ).toBe("https://insure.example.com");
  });

  it("uses the platform's production domain before a per-deployment one", () => {
    expect(
      appOrigin(request("http://10.0.0.4/api/invites"), {
        VERCEL_URL: "web-app-reviewer-git-abc123.vercel.app",
        VERCEL_PROJECT_PRODUCTION_URL: "insure.vercel.app",
      }),
    ).toBe("https://insure.vercel.app");
  });

  it("falls back to what the proxy says the browser asked for", () => {
    expect(
      appOrigin(
        request("http://10.0.0.4:3000/api/invites", {
          "x-forwarded-proto": "https",
          "x-forwarded-host": "insure.example.com",
        }),
        {},
      ),
    ).toBe("https://insure.example.com");
  });

  it("reads the first hop of a forwarded chain", () => {
    expect(
      appOrigin(
        request("http://10.0.0.4:3000/api/invites", {
          "x-forwarded-proto": "https, http",
          "x-forwarded-host": "insure.example.com, internal.local",
        }),
        {},
      ),
    ).toBe("https://insure.example.com");
  });

  it("serves a local dev request from the request itself", () => {
    expect(appOrigin(request("http://localhost:3000/api/invites"), {})).toBe(
      "http://localhost:3000",
    );
  });

  it("ignores a blank or unparseable setting", () => {
    expect(
      appOrigin(request("http://localhost:3000/api/invites"), {
        APP_URL: "   ",
        NEXT_PUBLIC_APP_URL: "://not a url",
        AUTH_URL: "https://insure.example.com",
      }),
    ).toBe("https://insure.example.com");
  });
});

describe("appUrl", () => {
  it("joins a path onto the origin", () => {
    const req = request("http://localhost:3000/api/invites");
    const env = { APP_URL: "https://insure.example.com/" };

    expect(appUrl(req, "/signup?code=abc", env)).toBe(
      "https://insure.example.com/signup?code=abc",
    );
    expect(appUrl(req, "signup", env)).toBe(
      "https://insure.example.com/signup",
    );
  });
});
