import "jest";
import BeDiceServer from "../BeDiceServer";
import * as ioClient from "socket.io-client";
import RoomManager, { RollMessage, Room } from "../helpers/RoomManager";
import FakeGenerator from "../helpers/FakeGenerator";

const userProps = {
  name: "Tester",
  avatar: { name: "ava", src: "yikes.png", thumb: "yikes.png" },
  color: { hex: "#fafafa", name: "red" }
};

describe("Server-client integration tests", () => {
  let server: BeDiceServer;
  let clients: SocketIOClient.Socket[] = [];
  const numOfClients = 5;

  //#region Preparing and tearing down socketIO server/clients
  beforeAll(done => {
    server = new BeDiceServer();
    server.listen();
    done();
  });

  afterAll(() => {
    server.stop();
  });

  beforeEach(done => {
    const connString = `http://localhost:${server.getPort()}`;

    let counter = 0;

    const connected = () => {
      counter++;
      if (counter >= numOfClients) done();
    };

    for (let i = 0; i < numOfClients; i++) {
      const socket = ioClient.connect(connString, {
        transports: ["websocket"]
      });
      socket.on("connect", connected);
      clients.push(socket);
    }
  });

  afterEach(done => {
    clients.forEach(c => {
      if (c.connected) c.disconnect();
    });
    done();
  });
  //#endregion

  test("broadcastRoomList sends a list of all rooms to all clients", done => {
    expect.assertions(numOfClients * 3);
    // Create some sample rooms
    const rm = new RoomManager();
    rm.createNewRoom("room-1");
    rm.createNewRoom("room-2");
    rm.createNewRoom("room-3");

    const users1 = FakeGenerator.fakeUsers(5);
    const users2 = FakeGenerator.fakeUsers(2);
    const users3 = FakeGenerator.fakeUsers(10);

    users1.forEach(u => rm.addUserToRoom(u, "room-1"));
    users2.forEach(u => rm.addUserToRoom(u, "room-2"));
    users3.forEach(u => rm.addUserToRoom(u, "room-3"));

    let counter = 0;
    // Room 1 should have 5 fake users, room 2 - 2, room 3 - 10
    const receivedEmit = (list: Room[]) => {
      // Every time assert we have the correct numbers
      expect(list[0].numOfUsers).toBe(5);
      expect(list[1].numOfUsers).toBe(2);
      expect(list[2].numOfUsers).toBe(10);

      counter++;
      if (counter >= numOfClients) {
        done();
      }
    };

    // When room list is received - call this function
    clients.forEach(c => {
      c.on("room.list", receivedEmit);
    });

    // Send the broadcast to all users
    rm.broadcastRoomList(server.io);
  });
});

describe("Simple use flow tests with single client", () => {
  let server: BeDiceServer;
  let client: SocketIOClient.Socket;

  beforeAll(done => {
    server = new BeDiceServer();
    server.listen();
    done();
  });
  afterAll(() => {
    server.stop();
  });
  beforeEach(done => {
    const connString = `http://localhost:${server.getPort()}`;

    client = ioClient.connect(connString, { transports: ["websocket"] });

    client.on("connect", () => {
      done();
    });
  });
  afterEach(done => {
    if (client.connected) {
      client.disconnect();
    }
    // Also remove all rooms to avoid test conflicts
    server.rm.allRooms.clear();
    done();
  });

  test("register user -> session -> restore user works", done => {
    expect.assertions(5);
    const userProps = {
      avatar: {
        name: "Warlock",
        src: "some_image.jpeg",
        thumb: "some_image.jpeg"
      },
      name: "Josh Peterson",
      color: {
        hex: "#ff34ac",
        name: "Blue"
      }
    };

    client.on("register.new.success", (data: any) => {
      // Expect the session object to be a string, less than 4000 bytes
      expect(typeof data.session).toBe("string");
      expect(Buffer.byteLength(data.session, "utf8")).toBeLessThan(4000);
      client.emit("register.restore", data.session);
    });

    client.on("register.new.failure", () => {
      done.fail(
        "Expected register.new.success, got register.new.failure instead"
      );
    });

    client.on("register.restore.success", (user: any) => {
      expect(user.name).toBe(userProps.name);
      expect(user.avatar).toEqual(userProps.avatar);
      expect(user.color).toEqual(userProps.color);
      done();
    });

    client.on("register.restore.failure", () => {
      done.fail(
        new Error(
          "Expected register.restore.success but received registration.restore.failure"
        )
      );
    });

    // Set everything in motion
    client.emit("register.new", userProps);
  });

  test("register user -> create & enter room -> leave room works", done => {
    expect.assertions(4);

    const roomName = "A New Room";

    client.on("error.client", (error: any) => {
      done.fail(`Received client.error event: ${error}`);
    });

    client.on("room.leave.success", () => {
      // Verify on the server that room is empty
      const room = server.rm.allRooms.get(roomName);
      expect(room!.users.size).toBe(0);
      done();
    });

    client.on("room.join.success", () => {
      // Check on the server the room now has 1 user
      const room = server.rm.allRooms.get(roomName);
      expect(room!.name).toBe(roomName);
      expect(room!.users.size).toBe(1);
      client.emit("room.leave", roomName);
    });

    client.on("room.created", (room: any) => {
      expect(room.name).toBe(roomName);
      client.emit("room.join", roomName);
    });

    client.on("register.new.success", () => {
      // Success, create and join a room
      client.emit("room.create", roomName);
    });

    client.emit("register.new", userProps);
  });

  test("register user -> create & enter room -> roll a die -> leave room works", done => {
    // expect.assertions(4);
    const roomName = "A New Room";
    const rollString = "2d20";

    client.on("error.client", (error: any) => {
      console.error(error);
      done.fail(`Received client.error event, something went wrong`);
    });
    // Number indicates the order of execution

    client.on("room.leave.success", () => {
      // Verify on the server that room is empty
      const room = server.rm.allRooms.get(roomName);
      expect(room!.users.size).toBe(0);
      done();
    });

    // 5
    client.on("room.roll.new", (rollMessage: RollMessage) => {
      // Make sure the roll assigned the right author
      expect(rollMessage.author).toEqual({
        name: userProps.name,
        color: userProps.color.hex,
        avatar: userProps.avatar.src
      });
      // Roll string (2d20)
      expect(rollMessage.rollString).toBe(rollString);
      // Roll Total should be between 2 and 40, since we rolled 2d20
      expect(rollMessage.total).toBeGreaterThanOrEqual(2);
      expect(rollMessage.total).toBeLessThanOrEqual(40);
      // Roll Message should have 2 rolls
      expect(rollMessage.rolls!.length).toBe(2);

      client.emit("room.leave", roomName);
    });

    // 4
    client.on("room.join.success", () => {
      // Check on the server the room now has 1 user
      const room = server.rm.allRooms.get(roomName);
      expect(room!.name).toBe(roomName);
      expect(room!.users.size).toBe(1);

      client.emit("room.roll", rollString);
    });

    // 3
    client.on("room.created", (room: any) => {
      expect(room.name).toBe(roomName);
      client.emit("room.join", roomName);
    });

    // 2
    client.on("register.new.success", () => {
      // Success, create and join a room
      client.emit("room.create", roomName);
    });

    // 1
    client.emit("register.new", userProps);
  });
});
