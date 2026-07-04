// PostHog Cloud integration placeholder
// PostHog SDK will be integrated via frontend SDK (posthog-js) in each app.
// Server-side events are captured here for auth-specific events.

const config = require('../config');

const POSTHOG_ENABLED = !!process.env.POSTHOG_API_KEY;

function captureEvent(distinctId, event, properties = {}) {
  if (!POSTHOG_ENABLED) {
    // Dev mode: log to console
    console.log(`[PostHog] ${event}`, { distinctId, ...properties });
    return;
  }

  // Production: send to PostHog Cloud API
  const body = {
    api_key: process.env.POSTHOG_API_KEY,
    event,
    distinct_id: distinctId,
    properties: {
      ...properties,
      $host: config.cors.origin,
    },
    timestamp: new Date().toISOString(),
  };

  // Fire and forget - don't block the response
  fetch('https://app.posthog.com/capture/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {});
}

module.exports = { captureEvent };
