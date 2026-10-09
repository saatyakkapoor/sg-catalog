"use server";

import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn, signOut } from "@/auth";

export type LoginState = { error?: string };

const loginSchema = z.object({
  email: z.string().trim().min(1, "Enter your email address.").email("That does not look like a valid email address."),
  password: z.string().min(1, "Enter your password."),
  redirectTo: z.string().optional(),
});

/** Only same-origin admin paths are accepted as a post-login destination. */
function safeRedirect(target: string | undefined): string {
  if (!target) return "/admin";
  if (!target.startsWith("/admin")) return "/admin";
  if (target.startsWith("/admin/login")) return "/admin";
  return target;
}

export async function loginAction(
  _previous: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    redirectTo: formData.get("redirectTo") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details and try again." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: safeRedirect(parsed.data.redirectTo),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Incorrect email or password." };
    }
    // Re-throw redirect signals so Next.js can complete the navigation.
    throw error;
  }

  return {};
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/admin/login" });
}
