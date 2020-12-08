import { Server, createServer } from "http";
import * as socketIO from "socket.io";
import { AddressInfo } from "net";
import { config as loadEnv } from "dotenv";

loadEnv();
// Event handlers
import { handlePing, handleVersion } from "./handlers/connection";
import UserManager from "./helpers/UserManager";
import RoomManager from "./helpers/RoomManager";

class BeDiceServer {
  private readonly server: Server;
  public readonly io: socketIO.Server;

  public address?: string | AddressInfo | null;
  public um: UserManager;
  public rm: RoomManager;

  constructor() {
    this.um = new UserManager();
    this.rm = new RoomManager();
    this.server = createServer((req, res) => {
      try {
        switch (req.url) {
          case "/":
            // Attempt to read room numbers and user data
            const metaData = {
              userData: this.um.getFormattedData(),
              roomData: this.rm.getFormattedData(),
              welcomeMessage: `Hello! This is the Be-Dice.com backend`,
            };

            res.setHeader(`Content-Type`, `application/json`);
            res.writeHead(200);

            res.end(JSON.stringify(metaData));
            break;
          case "/health":
            res.setHeader(`Content-Type`, `application/json`);
            res.writeHead(200);
            res.end(
              JSON.stringify({
                success: true,
                message: "Server is live and working",
              })
            );
            break;

          default:
            // Not found
            res.setHeader(`Content-Type`, `application/json`);
            res.writeHead(404);
            res.end(JSON.stringify({ error: "Page not found" }));
        }
      } catch (e) {
        res.writeHead(500);
        res.end(`Internal server error`);
      }
    });
    this.io = socketIO(this.server);
  }

  listen(port?: number): void {
    this.server.listen(port, () => {
      // Don't spam the console if we're in a test environment
      if (process.env.NODE_ENV !== "test" && process.env.NODE_ENV !== "ci")
        console.log(`HTTP Server listening on port ${this.getPort()}`);
    });
    this.address = this.server.address();
    this.io.on("connection", (socket: socketIO.Socket) => {
      // New user connected, attach socket event listeners
      this.addEventListeners(socket);
      socket.on("disconnect", this.um.handleClientDisconnect(socket, this.rm));
    });
  }

  public getAddress() {
    if (
      this.address &&
      typeof this.address !== "string" &&
      this.address.address
    )
      return this.address.address;
  }

  public getPort() {
    if (this.address && typeof this.address !== "string" && this.address.port)
      return this.address.port;
  }

  stop(): void {
    this.io.close();
    this.server.close();
  }

  addEventListeners(socket: socketIO.Socket) {
    // Register all events here
    socket.on("server.ping", handlePing(socket));
    socket.on("server.version", handleVersion(socket));

    // Registration stuff
    socket.on("register.new", this.um.handleNewUserRegistration(socket));
    socket.on("register.restore", this.um.handleRestoreUser(socket));

    // Rooms - creating, joining, listing
    socket.on("room.create", this.rm.handleRoomCreate(socket));
    socket.on("room.list", this.rm.handleRoomList(socket));
    socket.on("room.join", this.rm.handleRoomJoin(socket, this.um));
    socket.on("room.leave", this.rm.handleRoomLeave(socket, this.um));

    // Roll - handle
    socket.on("room.roll", this.rm.handleRoll(socket, this.um, this.io));
  }
}

export default BeDiceServer;
