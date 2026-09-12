// Native health/calendar content must never be emitted through generic analytics.
export function platformTelemetryAllowed() { return false; }
