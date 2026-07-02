// Feeds react-native-network-logger's captured requests into Reactotron.
//
// Both tools ship their own independent XMLHttpRequest monkey-patch, and the
// platform only lets one interceptor own the prototype at a time — whichever
// patches last silently wins, non-deterministically, so running Reactotron's
// auto-networking plugin alongside react-native-network-logger means one of
// them ends up seeing zero traffic. Instead, network-logger stays the single
// interceptor of record (see startNetworkLogging() in app/_layout.tsx) and
// this polls its already-public getRequests() API, forwarding each newly
// completed request into Reactotron via the same apiResponse() call its own
// (now-disabled) networking plugin would have used.

import { getRequests } from 'react-native-network-logger';
import Reactotron from './reactotron';

const POLL_INTERVAL_MS = 1000;
const forwarded = new Set<string>();

function parseBody(raw: unknown): unknown {
  if (typeof raw !== 'string' || raw.length === 0) return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export function startReactotronNetworkBridge(): void {
  if (!__DEV__) return;

  setInterval(() => {
    for (const req of getRequests()) {
      // status stays -1 until the response callback fires; skip in-flight
      // requests and anything we've already forwarded.
      if (req.status === -1 || forwarded.has(req.id)) continue;
      forwarded.add(req.id);

      Reactotron.apiResponse(
        {
          url: req.url,
          method: req.method,
          data: parseBody(req.dataSent),
          headers: req.requestHeaders,
          params: null,
        },
        {
          // Reactotron's type says `body: string`, but its own auto-networking
          // plugin passes the parsed JSON object through at runtime too — the
          // desktop app renders either fine.
          body: parseBody(req.response) as string,
          status: req.status,
          headers: req.responseHeaders,
        },
        req.duration,
      );
    }
  }, POLL_INTERVAL_MS);
}
