import { DefaultSession } from "next-auth";
import type { ExamType } from "@/lib/types/common";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "USER" | "MANAGER" | "ADMIN";
      managerId: string | null;
      /** Which roles' onboarding tours this account has already sat through. */
      onboardingToursSeen: string[];
      /** The exams a reviewee picked; null until they have picked. */
      focusTracks: ExamType[] | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: "USER" | "MANAGER" | "ADMIN";
    managerId: string | null;
    onboardingToursSeen: string[];
    focusTracks: ExamType[] | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "USER" | "MANAGER" | "ADMIN";
    managerId: string | null;
    onboardingToursSeen: string[];
    focusTracks: ExamType[] | null;
  }
}
