import { getBaseUrl } from "./fetcher";
import { getConnectWorldUrl } from "./generated/api";
import type { ClientMessage, ServerMessage } from "./generated/models";

type Handlers = {
  [K in ServerMessage["type"]]?: (
    message: Extract<ServerMessage, { type: K }>,
  ) => void;
};

export interface WorldSocketOptions {
  /** Called once the socket opens; send `join` from here. */
  onOpen?: (socket: WorldSocket) => void;
  onClose?: () => void;
}

/** Typed wrapper around the `/ws` endpoint: JSON frames in, JSON frames out. */
export class WorldSocket {
  private ws: WebSocket;
  private handlers: Handlers = {};

  constructor(options: WorldSocketOptions = {}) {
    const url = new URL(
      getConnectWorldUrl(),
      getBaseUrl() || window.location.origin,
    );
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    this.ws = new WebSocket(url);
    this.ws.addEventListener("open", () => options.onOpen?.(this));
    this.ws.addEventListener("close", () => options.onClose?.());
    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data)) as ServerMessage;
      const handler = this.handlers[message.type] as
        | ((m: ServerMessage) => void)
        | undefined;
      handler?.(message);
    });
  }

  on<K extends ServerMessage["type"]>(
    type: K,
    handler: NonNullable<Handlers[K]>,
  ) {
    this.handlers[type] = handler as Handlers[K];
    return this;
  }

  send(message: ClientMessage) {
    if (this.ws.readyState === WebSocket.OPEN)
      this.ws.send(JSON.stringify(message));
  }

  close() {
    this.ws.close();
  }
}
