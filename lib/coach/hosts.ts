function addHost(hosts: Set<string>, raw: string): void {
  try {
    const host = new URL(raw).host;
    if (host) {
      hosts.add(host);
      return;
    }
  } catch {
    /* not an http(s) URL */
  }
  const ice = raw.match(/(?:stun|stuns|turn|turns):([^?\s]+)/i);
  if (ice?.[1]) hosts.add(ice[1]);
}

export function hostsFromPerformance(entries: Array<{ name: string }>, origin?: string): string[] {
  const hosts = new Set<string>();
  for (const entry of entries) {
    try {
      const url = new URL(entry.name);
      if (origin && url.origin === origin) continue;
      hosts.add(url.host);
    } catch {
      /* ignore */
    }
  }
  return [...hosts].sort();
}

export function hostsFromIceServers(servers: Array<{ urls?: string | string[] }>): string[] {
  const hosts = new Set<string>();
  for (const server of servers) {
    const urls = Array.isArray(server.urls) ? server.urls : server.urls ? [server.urls] : [];
    for (const url of urls) addHost(hosts, url);
  }
  return [...hosts].sort();
}

export function startHostCapture(): {
  snapshot: () => string[];
  stop: () => string[];
} {
  const hosts = new Set<string>();
  const origin = typeof location !== "undefined" ? location.origin : undefined;

  const ingestPerformance = () => {
    if (typeof performance === "undefined") return;
    for (const host of hostsFromPerformance(performance.getEntriesByType("resource"), origin)) {
      hosts.add(host);
    }
  };
  ingestPerformance();

  let observer: PerformanceObserver | null = null;
  if (typeof PerformanceObserver !== "undefined") {
    observer = new PerformanceObserver((list) => {
      for (const host of hostsFromPerformance(list.getEntries(), origin)) hosts.add(host);
    });
    try {
      observer.observe({ type: "resource", buffered: true });
    } catch {
      observer = null;
    }
  }

  const Original = typeof window !== "undefined" ? window.RTCPeerConnection : undefined;
  if (Original && !(Original as unknown as { __slpSpike?: boolean }).__slpSpike) {
    const Wrapped = function (this: RTCPeerConnection, config?: RTCConfiguration) {
      for (const host of hostsFromIceServers(config?.iceServers ?? [])) hosts.add(host);
      const pc = new Original(config);
      pc.addEventListener("icecandidate", (event) => {
        const candidate = event.candidate?.candidate;
        if (candidate) addHost(hosts, candidate);
      });
      return pc;
    } as unknown as typeof RTCPeerConnection;
    Object.setPrototypeOf(Wrapped, Original);
    Wrapped.prototype = Original.prototype;
    (Wrapped as unknown as { __slpSpike?: boolean }).__slpSpike = true;
    window.RTCPeerConnection = Wrapped;
  }

  const snapshot = () => {
    ingestPerformance();
    return [...hosts].sort();
  };

  return {
    snapshot,
    stop() {
      observer?.disconnect();
      return snapshot();
    },
  };
}
