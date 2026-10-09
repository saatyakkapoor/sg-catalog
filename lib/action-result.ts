import { revalidatePath } from "next/cache";

export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export const idleResult: ActionResult<never> = { ok: true };

export function failure(
  error: string,
  fieldErrors?: Record<string, string>
): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

export function success<T>(message?: string, data?: T): ActionResult<T> {
  return { ok: true, message, data };
}

/**
 * Wraps an admin action so unexpected failures surface as plain language and
 * never leak stack traces or SQL into the UI.
 */
export async function guard<T>(
  run: () => Promise<ActionResult<T>>
): Promise<ActionResult<T>> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return failure("Your session has expired. Please sign in again.");
      }
      if (error.message.startsWith("SAFE:")) {
        return failure(error.message.slice(5).trim());
      }
    }
    // Keep the detail in the server log for debugging, not in the response.
    console.error("[admin action]", error);
    return failure("Something went wrong. Please try again.");
  }
}

/** Raises an error whose message is safe to show to the admin. */
export function safeError(message: string): Error {
  return new Error(`SAFE: ${message}`);
}

/**
 * Invalidates the cached public pages plus the admin views. Called after every
 * mutation so the catalog reflects changes immediately.
 */
export function revalidateSite(): void {
  revalidatePath("/", "layout");
}
