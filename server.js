const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

let WebSocketServer = null;
try {
  WebSocketServer = require("ws").WebSocketServer;
} catch (err) {
  console.warn("ws package is not installed: realtime calls will work with polling only.", err?.message || "");
}

const wsClients = new Set();

const dev = process.env.NODE_ENV !== "production";

const port = process.env.PORT || 3000; // Change the port to the port that your IIS is running on. Default its 80 and 3000 if you are using it for developing.
const hostname = "localhost";
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      const { pathname, query } = parsedUrl;

      if (pathname === "/a") {
        await app.render(req, res, "/a", query);
      } else if (pathname === "/b") {
        await app.render(req, res, "/b", query);
      } else {
        await handle(req, res, parsedUrl);
      }
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  if (WebSocketServer) {
    const wss = new WebSocketServer({ noServer: true });

    wss.on("connection", (socket) => {
      wsClients.add(socket);
      socket.send(JSON.stringify({ type: "connection", message: "Call Monitoring socket connected" }));

      socket.on("close", () => wsClients.delete(socket));
      socket.on("error", () => wsClients.delete(socket));
    });

    server.on("upgrade", (req, socket, head) => {
      if (!req.url || !req.url.startsWith("/ws/call-monitoring")) {
        socket.destroy();
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    });

    global.callMonitoringWs = {
      send: (data) => {
        const payload = typeof data === "string" ? data : JSON.stringify(data);
        wsClients.forEach((socket) => {
          if (socket.readyState === socket.OPEN) {
            socket.send(payload);
          }
        });
      },
    };
  }

  server
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, async () => {
      console.log(`> Ready on http://localhost:${port}`);
    });
});
