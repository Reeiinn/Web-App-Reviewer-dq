import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "USER" | "MANAGER" | "ADMIN";
      managerId: string | null;
      /** Which roles' onboarding tours this account has already sat through. */
      onboardingToursSeen: string[];
    } & DefaultSession["user"];
  }

  interface User {
    role: "USER" | "MANAGER" | "ADMIN";
    managerId: string | null;
    onboardingToursSeen: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "USER" | "MANAGER" | "ADMIN";
    managerId: string | null;
    onboardingToursSeen: string[];
  }
}
