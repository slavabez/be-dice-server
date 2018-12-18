import { Server, createServer } from "http";
import * as socketIO from "socket.io";
import { AddressInfo } from "net";

// Event handlers
import { handlePing } from "./handlers/connection";
import UserManager from "./helpers/UserManager";
import RoomManager from "./helpers/RoomManager";

class BeDiceServer {
  private readonly server: Server;
  public readonly io: socketIO.Server;

  public address?: string | AddressInfo;
  public um: UserManager;
  public rm: RoomManager;

  constructor() {
    this.server = createServer();
    this.io = socketIO(this.server);
    this.um = new UserManager();
    this.rm = new RoomManager();
  }

  listen(port?: number): void {
    this.server.listen(port, () => {
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
