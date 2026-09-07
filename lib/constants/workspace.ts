/**
 * Workspace cookie constants.
 *
 * Single source of truth for the cookie name and max-age used to persist
 * the active workspace across client, server-components, API routes and middleware.
 */

/** Cookie name that stores the active workspace UUID. */
export const ACTIVE_WORKSPACE_COOKIE = "active_workspace_id";

/** Cookie max-age in seconds (30 days). */
export const ACTIVE_WORKSPACE_COOKIE_MAX_AGE = 2592000;
