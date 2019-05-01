import UserManager, { User } from "./UserManager";
import * as SocketIO from "socket.io";
import * as roll from "yadicer";

interface singleRoll {
  order?: number;
  sides?: number;
  result?: number;
}

export interface rollAuthor {
  name: string;
  avatar: string;
  color: string;
}

interface rollMessageProps {
  author: rollAuthor;
  rollString: string;
  total?: number;
  rolls?: singleRoll[];
}

export class RollMessage {
  public author: rollAuthor;
  public rollString: string;
  public total?: number;
  public rolls?: singleRoll[];
  public createdAt: Date;

  constructor(props: rollMessageProps) {
    this.author = props!.author;
    this.rollString = props!.rollString;
    this.total = props!.total;
    this.rolls = props!.rolls;
    this.createdAt = new Date();
  }
}

export class Room {
  public name: string;
  public users: Map<string, User>;
  public history: RollMessage[];
  public createdAt: Date;
  public numOfUsers?: number;

  constructor(name: string) {
    this.name = name.length < 16 ? name : name.substr(0, 15);
    this.users = new Map<string, User>();
    this.history = [];
    this.createdAt = new Date();
  }
}

export default class RoomManager {
  public allRooms: Map<string, Room>;

  constructor() {
    this.allRooms = new Map<string, Room>();
  }

  createNewRoom(name: string): null | Room {
    if (this.allRooms.has(name)) return null;
    const room = new Room(name);
    this.allRooms.set(room.name, room);
    return room;
  }

  getRoomList(): Room[] {
    const list = Array.from(this.allRooms.values());
    list.forEach(li => {
      li.numOfUsers = li.users.size;
    });
    return list;
  }

  addUserToRoom(user: User, roomName: string): boolean {
    if (!this.allRooms.has(roomName)) return false;
    // Add to the Users map
    this.allRooms.get(roomName)!.users.set(user.id, user);
    return true;
  }

  removeUserFromRoom(user: User, roomName: string): boolean {
    if (!this.allRooms.has(roomName)) return false;
    if (!this.allRooms.get(roomName)!.users.has(user.id)) return false;
    this.allRooms.get(roomName)!.users.delete(user.id);
    return true;
  }

  getUsersInRoom(roomName: string): null | User[] {
    if (!this.allRooms.has(roomName)) return null;
    const room = this.allRooms.get(roomName);
    return Array.from(room!.users.values());
  }

  /**
   * Looks through all rooms and deletes a user if found. Returns true if found and deleted, false if not found in any room
   * @param user
   */
  removeUserFromAllRooms(user: User): boolean {
    let hasDeleted = false;
    this.allRooms.forEach(r => {
      r.users.forEach(u => {
        if (u.id === user.id) {
          r.users.delete(user.id);
          hasDeleted = true;
        }
      });
    });
    return hasDeleted;
  }

  /**
   * Find the room the socket is in. Caution, gets the first room that isn't the same as the ID of the socket
   * @param socket
   */
  public static getSocketRoom(socket: SocketIO.Socket) {
    const sRooms = Object.values(socket.rooms);
    // Rooms is an object, by default every socket is automatically in it's own room with ID of user ID
    return sRooms.find(r => r !== socket.id);
  }

  /*  emitRoomUsersToAll(io: SocketIO.Server): void {
    this.allRooms.forEach(r => {
      // Get users as array, emit to that room
      const users = Array.from(r.users.values());
      if (users.length > 0) io.in(r.name).emit("room.players", users);
    });
  }*/

  /**
   * Broadcasts a list of all rooms as an array
   * @param io
   */
  broadcastRoomList(io: SocketIO.Server): void {
    io.emit("room.list", this.getRoomList());
  }

  postRollToRoom(roll: RollMessage, roomName: string): boolean {
    if (!this.allRooms.has(roomName)) return false;
    const room = this.allRooms.get(roomName);
    // 20 messages allowed in history max, delete if more
    if (room!.history.length > 19) {
      room!.history = room!.history.slice(room!.history.length - 19);
    }
    room!.history.push(roll);
    return true;
  }

  deleteOldRooms(): void {
    try {
      const namesToDelete: string[] = [];
      this.allRooms.forEach(r => {
        // First, check if there are any messages in history
        if (r.history.length < 1) {
          if (r.createdAt.getTime() + 1000 * 60 * 60 < new Date().getTime()) {
            // No messages and older than 60 minutes - flag for deletion
            namesToDelete.push(r.name);
          }
        } else {
          // History exists, check time on the last roll, flag to delete if older than 60 minutes
          const lastMessageIsOld = r.history.some(
            message =>
              message.createdAt.getTime() + 1000 * 60 * 60 <
              new Date().getTime()
          );
          if (lastMessageIsOld) namesToDelete.push(r.name);
        }
      });
      // console.log(`Flagged ${namesToDelete.length} rooms for deletion.`);
      namesToDelete.forEach(n => {
        if (this.allRooms.has(n)) this.allRooms.delete(n);
      });
    } catch (e) {
      console.error(`Failed to clean up old rooms`, e);
    }
  }

  handleRoomCreate(socket: SocketIO.Socket) {
    const rm = this;
    try {
      return function(data: any) {
        // Data should be string with new name
        const room = rm.createNewRoom(data);
        // Send the new room to the client, broadcast new room list to other clients
        if (room) {
          socket.emit("room.created", room);
          // Send everybody an updated room list
          socket.broadcast.emit("room.list", rm.getRoomList());
        } else {
          socket.emit(
            "error.client",
            `Failed to create a new room. Perhaps a room with the same name already exist?`
          );
        }
      };
    } catch (e) {
      return function() {
        socket.emit("error.client", `Failed to create a new room`);
      };
    }
  }

  handleRoomList(socket: SocketIO.Socket) {
    const rm = this;
    return function() {
      socket.emit("room.list", rm.getRoomList());
    };
  }

  handleRoomJoin(socket: SocketIO.Socket, um: UserManager) {
    const rm = this;
    return function(roomName: any) {
      // See if such room exists
      if (!rm.allRooms.has(roomName)) {
        socket.emit("error.client", "Room does not exist");
        socket.emit("room.list", rm.getRoomList());
        return;
      }

      const user = um.findUserBySocketId(socket.id);
      if (!user) {
        socket.emit("error.client", "Error adding user to the room");
        return;
      }
      rm.addUserToRoom(user, roomName);
      socket.join(roomName);
      const room = rm.allRooms.get(roomName);

      // Broadcast to the room that a user joined
      socket.broadcast.to(roomName).emit("room.joined", user);
      socket.emit("room.join.success", room);
    };
  }

  handleRoomLeave(socket: SocketIO.Socket, um: UserManager) {
    const rm = this;
    return function(roomName: any) {
      // See if such room exists
      if (!rm.allRooms.has(roomName)) {
        socket.emit("error.client", "Error leaving the room");
        socket.emit("room.list", rm.getRoomList());
        return;
      }

      const user = um.findUserBySocketId(socket.id);
      if (!user) {
        socket.emit("error.client", "Error adding user to the room");
        return;
      }
      rm.removeUserFromRoom(user, roomName);
      socket.leave(roomName);

      // Broadcast to the room that a user joined
      socket.broadcast.to(roomName).emit("room.left", user);
      socket.emit("room.leave.success");
    };
  }

  handleRoll(socket: SocketIO.Socket, um: UserManager, io: SocketIO.Server) {
    const rm = this;
    return async function(rollData: any) {
      try {
        const room = RoomManager.getSocketRoom(socket);
        if (!room || !rm.allRooms.has(room)) {
          socket.emit("error.client", "Error rolling the dice");
          return;
        }
        // Got the room, roll using Yadicer
        const rolls = await roll(rollData);
        const user = um.findUserBySocketId(socket.id);
        if (!user) {
          socket.emit("error.client", "Error rolling the dice");
          return;
        }
        // Construct the Roll Message object for the room
        const rollMessage = new RollMessage({
          rollString: rollData,
          rolls: rolls.rolls,
          total: rolls.total,
          author: {
            avatar: user.avatar.thumb,
            color: user.color.hex,
            name: user.name
          }
        });
        rm.postRollToRoom(rollMessage, room);
        // Broadcast to all in the room a new roll just came in
        io.to(room).emit("room.roll.new", rollMessage);
      } catch (e) {
        socket.emit(
          "error.client",
          "Error rolling the di(c)e, please try again"
        );
      }
    };
  }
}
