import "jest";
import BeDiceServer from "../BeDiceServer";
import * as ioClient from "socket.io-client";
import FakeGenerator from "../helpers/FakeGenerator";
import { version } from "../../package.json";

describe("BeDiceServer tests", () => {
  let server: BeDiceServer;
  let clientSocket: SocketIOClient.Socket;

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

    clientSocket = ioClient.connect(connString, {
      transports: ["websocket"]
    });

    clientSocket.on("connect", () => {
      done();
    });
  });

  afterEach(done => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }

    done();
  });

  describe("Basic connectivity tests", () => {
    test("can emit a ping and receive a pong in response", done => {
      clientSocket.on("server.pong", (data: any) => {
        expect(data.message).toBe("You bet!");
        done();
      });

      clientSocket.emit("server.ping", { message: "Are you there?" });
    });

    test("can communicate using direct emits from the server", done => {
      clientSocket.on("Test emit", (data: any) => {
        expect(data.test).toBe("Test");
        done();
      });

      server.io.emit("Test emit", { test: "Test" });
    });

    test("can recieve version of the app from the server", done => {
      clientSocket.on("server.version", (data: any) => {
        expect(data.version).toBe(version);
        done();
      });

      clientSocket.emit("server.version");
    });
  });

  describe("Integration tests for registration", () => {
    test("can register basic user, receive session object in return", done => {
      // Create user, emit register.new, expect register.new.success with session to save
      clientSocket.on("register.new.success", (session: any) => {
        // Seems good, check the session is a string
        console.log(session.user);
        expect(session.session).toBeTruthy();
        expect(typeof session.session).toBe("string");
        // Session should be less than 4000 bytes because it's saved as a cookie
        expect(Buffer.byteLength(session.session, "utf8")).toBeLessThan(4000);
        done();
      });
      clientSocket.on("register.new.failure", () => {
        done.fail(new Error("Received a registration failure from the server"));
      });

      const user = FakeGenerator.fakeUser();
      clientSocket.emit("register.new", user);
    });

    test("emits error when passed incomplete data", done => {
      let counter = 0;
      clientSocket.on("register.new.success", () => {
        // We expect failure, bad test
        done.fail(
          new Error(
            "Expected register.new.failure but got register.new.success"
          )
        );
      });

      clientSocket.on("register.new.failure", () => {
        // We expect this to come three times for each failure
        counter++;
        if (counter >= 3) done();
      });

      const noName = FakeGenerator.fakeUser();
      noName.name = "";
      const noAvatar = FakeGenerator.fakeUser();
      noAvatar.avatar = "";
      const noColor = FakeGenerator.fakeUser();
      noColor.color = "";

      clientSocket.emit("register.new", noName);
      clientSocket.emit("register.new", noAvatar);
      clientSocket.emit("register.new", noColor);
    });

    test("emits error when passed user with ID that already exists", done => {
      // Expect 2 assertions from the successful register
      expect.assertions(2);
      clientSocket.on("register.new.success", (session: any) => {
        expect(session.session).toBeTruthy();
        expect(typeof session.session).toBe("string");
      });
      clientSocket.on("register.new.failure", () => {
        done();
      });

      const existingUser = FakeGenerator.fakeUser();
      const copyUser = FakeGenerator.fakeUser();
      copyUser.id = existingUser.id;

      clientSocket.emit("register.new", existingUser);
      clientSocket.emit("register.new", copyUser);
    });
  });
});
