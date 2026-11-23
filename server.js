const { createServer } = require("node:http");
const next = require("next");
const { Server } = require("socket.io");
const { jwtVerify } = require("jose");

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "3000", 10);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

function getCookie(cookieHeader, name) {
  const pair = cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : undefined;
}

app.prepare().then(() => {
  const httpServer = createServer((request, response) => handle(request, response));
  const io = new Server(httpServer, {
    path: "/socket.io",
    allowRequest(request, callback) {
      const origin = request.headers.origin;
      if (!origin) return callback(null, true);
      try {
        const appOrigin = new URL(process.env.APP_URL || `http://${request.headers.host}`).origin;
        callback(null, new URL(origin).origin === appOrigin);
      } catch {
        callback(null, false);
      }
    },
  });
  global.io = io;

  io.use(async (socket, nextSocket) => {
    try {
      const token = getCookie(socket.handshake.headers.cookie, "ebook_session");
      if (!token || !process.env.JWT_SECRET) {
        return nextSocket(new Error("No autorizado"));
      }
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(process.env.JWT_SECRET),
        { algorithms: ["HS256"] },
      );
      if (payload.role !== "staff") {
        return nextSocket(new Error("No autorizado"));
      }
      socket.data.userId = payload.sub;
      socket.join("staff");
      nextSocket();
    } catch {
      nextSocket(new Error("No autorizado"));
    }
  });

  httpServer.listen(port, hostname, () => {
    console.log(`> E-book Store listening on http://${hostname}:${port}`);
  });
});
