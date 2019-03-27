import * as SocketIO from "socket.io";
import { version } from "../../package.json";

export function handlePing(socket: SocketIO.Socket) {
  return function(data: any) {
    if (data.message === "Are you there?") {
      socket.emit("server.pong", { message: "You bet!" });
    } else {
      socket.emit("server.pong", { message: "pong" });
    }
  };
}

export function handleVersion(socket: SocketIO.Socket) {
  return function() {
    socket.emit("server.version", { version });
  };
}
