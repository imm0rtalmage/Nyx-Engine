/**
 * API Client with robust JSON parsing, error sanitization, and timeout abort handling.
 * Prevents "signal is aborted without reason" and "Unexpected token '<', '<!doctype '... is not valid JSON".
 */

export interface SafeFetchOptions extends RequestInit {
  timeout?: number;
}

export async function safeFetchJson<T = any>(
  resource: string,
  options: SafeFetchOptions = {}
): Promise<T> {
  const { timeout = 240000, signal: userSignal, ...fetchOptions } = options;

  let attempts = 0;
  const maxAttempts = 2;
  let lastError: any = null;

  while (attempts < maxAttempts) {
    attempts++;
    const controller = new AbortController();
    let isTimedOut = false;

    const timeoutId = setTimeout(() => {
      isTimedOut = true;
      try {
        controller.abort(new Error(`Request timed out after ${Math.round(timeout / 1000)}s`));
      } catch {
        controller.abort();
      }
    }, timeout);

    // Propagate user abort signal if provided
    if (userSignal) {
      if (userSignal.aborted) {
        clearTimeout(timeoutId);
        controller.abort(userSignal.reason || new Error("Operation cancelled by user"));
      } else {
        userSignal.addEventListener("abort", () => {
          clearTimeout(timeoutId);
          try {
            controller.abort(userSignal.reason || new Error("Operation cancelled by user"));
          } catch {
            controller.abort();
          }
        });
      }
    }

    let response: Response;
    try {
      response = await fetch(resource, {
        ...fetchOptions,
        signal: controller.signal
      });
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (isTimedOut) {
        throw new Error(`Request to ${resource} timed out after ${Math.round(timeout / 1000)}s. Please try again.`);
      }
      if (error.name === "AbortError" || (error.message && error.message.includes("aborted"))) {
        if (userSignal && userSignal.aborted) {
          throw new Error("Operation cancelled by user");
        }
        throw new Error(`Request was interrupted or timed out. Please try again.`);
      }

      lastError = error;
      // If momentary network disconnect and user has not aborted, do a quick single retry
      if (attempts < maxAttempts && !userSignal?.aborted) {
        await new Promise(r => setTimeout(r, 600));
        continue;
      }

      throw new Error(error.message || `Network error connecting to ${resource}`);
    } finally {
      clearTimeout(timeoutId);
    }

    // Read response as raw text first to safely inspect content type and prevent JSON parse crashes on HTML
    let rawText = "";
    try {
      rawText = await response.text();
    } catch (textErr: any) {
      throw new Error(`Failed to read response from ${resource}: ${textErr.message}`);
    }

    const trimmedText = (rawText || "").trim();

    // Guard against HTML error pages returned by Vite, proxy, or server crashes
    const isHtml = trimmedText.startsWith("<") || 
                   trimmedText.startsWith("<!DOCTYPE") || 
                   trimmedText.startsWith("<!doctype") || 
                   trimmedText.startsWith("<html");

    if (isHtml) {
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Service endpoint not found (${resource} - HTTP 404).`);
        }
        if (response.status === 502 || response.status === 503) {
          throw new Error(`AI service is temporarily unavailable or starting up (HTTP ${response.status}). Please retry in a moment.`);
        }
        if (response.status === 504) {
          throw new Error(`Gateway timeout waiting for AI response (HTTP 504). Please try again.`);
        }
        throw new Error(`Server returned HTTP ${response.status} with an error page.`);
      }

      // If status 200 returned HTML, it indicates the request was caught by the SPA fallback
      // or server during startup. If we have retries left, wait briefly and retry.
      if (attempts < maxAttempts && !userSignal?.aborted) {
        await new Promise(r => setTimeout(r, 800));
        continue;
      }

      throw new Error(`Server returned HTML instead of expected JSON data from ${resource}. The endpoint may be unhandled, restarting, or routed to the web application.`);
    }

    if (!trimmedText) {
      if (!response.ok) {
        throw new Error(`Request failed with HTTP ${response.status}`);
      }
      return {} as T;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(trimmedText);
    } catch (parseError: any) {
      if (!response.ok) {
        throw new Error(`Server error (HTTP ${response.status}): ${trimmedText.slice(0, 150)}`);
      }
      throw new Error(`Invalid JSON response: ${parseError.message}`);
    }

    if (!response.ok) {
      let errorMsg = parsed.error || parsed.message || `Request failed with HTTP ${response.status}`;
      if (typeof errorMsg === "object" && errorMsg !== null) {
        errorMsg = errorMsg.message || errorMsg.status || JSON.stringify(errorMsg);
      }
      throw new Error(String(errorMsg));
    }

    return parsed as T;
  }

  throw lastError || new Error(`Network error connecting to ${resource}`);
}
