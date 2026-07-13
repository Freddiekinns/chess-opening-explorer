/**
 * Vercel API Endpoint: /api/event
 *
 * Fire-and-forget instrumentation beacon (deviation-trainer PRD §9).
 * Counts only, no PII: {event, page, id} plus a short whitelist of extras.
 * The v1 "store" is Vercel runtime logs — one structured JSON line per
 * valid event, queryable from the dashboard. Always Cache-Control: no-store.
 */

const MAX_BODY_BYTES = 4096;
const MAX_EVENT_LENGTH = 64;
// Non-identifying extras individual events may attach (band choice, HTTP
// status of an explorer failure). Everything else in the payload is dropped.
const EXTRA_KEYS = ['band', 'status'];

function readBody(req) {
  if (req.body !== undefined) {
    return Promise.resolve(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
  }
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > MAX_BODY_BYTES) {
        data = '';
        req.destroy();
        resolve('');
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', () => resolve(''));
  });
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end();
    return;
  }

  let payload = null;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    // Malformed beacons are dropped silently — the client never retries.
  }

  const event = payload && typeof payload.event === 'string' ? payload.event : '';
  if (event && event.length <= MAX_EVENT_LENGTH) {
    const entry = {
      type: 'event',
      event,
      page: typeof payload.page === 'string' ? payload.page.slice(0, 200) : '',
      id: typeof payload.id === 'string' ? payload.id.slice(0, 64) : '',
      ts: Date.now(),
    };
    for (const key of EXTRA_KEYS) {
      const value = payload[key];
      if (typeof value === 'number' || (typeof value === 'string' && value.length <= 32)) {
        entry[key] = value;
      }
    }
    // Intentional console.log: Vercel runtime logs are the event store (§9).
    console.log(JSON.stringify(entry));
  }

  res.statusCode = 204;
  res.end();
};
