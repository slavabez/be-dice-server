import "jest";
import UserManager, { User } from "./UserManager";
import FakeGenerator from "./FakeGenerator";

describe("UserManager Unit Tests", () => {
  test("initialises with an empty user map", () => {
    const um = new UserManager();
    expect(um.allUsers instanceof Map).toBe(true);
    expect(um.allUsers.size).toBe(0);
  });

  describe("registerNewUser", () => {
    test("works with proper props", () => {
      const um = new UserManager();
      const user = FakeGenerator.fakeUser();
      um.registerNewUser(user);

      expect(um.allUsers.size).toBe(1);
      expect(um.allUsers.get(user.id)).toEqual(user);
    });

    test("shortens props that are too long", () => {
      const um = new UserManager();
      const props = {
        id: "SomeAlphaNumericID",
        name: "MyNameIsSoSoSoSoLong",
        avatar: {
          thumb:
            "img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg.png",
          src:
            "img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg.png",
          name: "123456789012345678901234567890"
        },
        color: {
          hex: "#FF1133FF1133FF1133FF1133",
          name: "123456789012345678901234567890"
        },
        socketId: "AlsoSomeAlphaNumericID"
      };
      um.registerNewUser(props);

      expect(um.allUsers.size).toBe(1);
      const saved = um.allUsers.get("SomeAlphaNumericID");
      expect(saved instanceof User).toBe(true);
      expect(saved!.name).toBe("MyNameIsSoSoSoSo");

      expect(saved!.avatar!.thumb).toBe(
        "img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg"
      );
      expect(saved!.avatar!.src).toBe(
        "img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg/img/avatar/jpeg"
      );
      expect(saved!.avatar!.name).toBe("12345678901234567890");

      expect(saved!.color!.hex).toBe("#FF1133FF");
      expect(saved!.color!.name).toBe("12345678901234567890");
    });
  });

  describe("updateSocketId", () => {
    test("replaces the socket ID properly", () => {
      const um = new UserManager();
      const users = FakeGenerator.fakeUsers();

      users.forEach(u => {
        um.registerNewUser(u);
      });

      const oldSocketId = users[2].socketId;

      um.updateSocketId(users[1].id, "New shiny ID");
      expect(um.allUsers.get(users[1].id)!.socketId).not.toBe(oldSocketId);
      expect(um.allUsers.get(users[1].id)!.socketId).toBe("New shiny ID");
    });
  });

  describe("findUserBySocketId", () => {
    test("returns the correct user", () => {
      const um = new UserManager();
      const users = FakeGenerator.fakeUsers();

      users.forEach(u => {
        um.registerNewUser(u);
      });

      const socketId = users[3].socketId;

      const user = um.findUserBySocketId(socketId);
      expect(user).toEqual(users[3]);
    });

    test("returns undefined when not found", () => {
      const um = new UserManager();
      const users = FakeGenerator.fakeUsers();

      users.forEach(u => {
        um.registerNewUser(u);
      });

      const socketId = "WrongSocketId";

      const user = um.findUserBySocketId(socketId);
      expect(user).toBe(undefined);
    });
  });

  describe("deleteUser", () => {
    test("deletes a user properly", () => {
      const um = new UserManager();
      const users = FakeGenerator.fakeUsers();

      users.forEach(u => {
        um.registerNewUser(u);
      });

      const id = users[1].id;

      um.deleteUser(id);
      expect(um.allUsers.has(id)).toBe(false);
      expect(um.allUsers.size).toBe(4);
    });

    test("doesn't crash when deleting a non-existent user", () => {
      const um = new UserManager();
      um.deleteUser("someid");
      // If we got this far, we're good
    });
  });
});
