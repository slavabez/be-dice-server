import "jest";
import BeDiceServer from "../BeDiceServer";
import * as ioClient from "socket.io-client";
import RoomManager, {Room} from "./RoomManager";
import FakeGenerator from "./FakeGenerator";
import {User} from "./UserManager";

describe("RoomManager Unit tests", () => {
  test("Creating new room works", () => {
    const rm = new RoomManager();
    const room = rm.createNewRoom("Test Room");
    expect(room!.history).toHaveLength(0);
    expect(room!.name).toBe("Test Room");
    expect(room!.users.size).toBe(0);
    expect(rm.allRooms.size).toBe(1);
  });

  test("addUserToRoom works", () => {
    const rm = new RoomManager();
    const roomName = "Sample";
    rm.createNewRoom(roomName);
    const user = FakeGenerator.fakeUser();
    const result = rm.addUserToRoom(user, roomName);

    expect(result).toBe(true);
    expect(rm.allRooms.size).toBe(1);
    expect(rm.allRooms.get(roomName)!.users.size).toBe(1);
  });

  describe("removeUser methods and checks", () => {
    let rm: RoomManager;
    let room1: Room | null;
    let room2: Room | null;
    let user1: User;
    let user2: User;

    beforeEach(() => {
      rm = new RoomManager();
      room1 = rm.createNewRoom("room1");
      room2 = rm.createNewRoom("room2");
      user1 = FakeGenerator.fakeUser();
      user2 = FakeGenerator.fakeUser();
      rm.addUserToRoom(user1, room1!.name);
      rm.addUserToRoom(user2, room1!.name);
      rm.addUserToRoom(user1, room2!.name);
      rm.addUserToRoom(user2, room2!.name);
    });

    test("removeUser works", () => {
      const deleteResult = rm.removeUserFromRoom(user1, room1!.name);
      expect(deleteResult).toBe(true);
      expect(rm.allRooms.get(room1!.name)!.users.has(user1.id)).toBe(false);
    });

    test("getUsersInRoom works", () => {
      const users = rm.getUsersInRoom(room1!.name);
      expect(Array.isArray(users)).toBe(true);
      expect(users).toHaveLength(2);
      expect(users![0].name === user1.name);
    });

    test("removeUserFromAllRooms", () => {
      const result = rm.removeUserFromAllRooms(user1);
      expect(result).toBe(true);
      expect(room1!.users.size).toBe(1);
      expect(room2!.users.size).toBe(1);
      expect(room1!.users.has(user1.id)).toBe(false);
      expect(room2!.users.has(user1.id)).toBe(false);
    });
  });

  describe("testing automatic room deletion (deleteOldRooms)", () => {

    let rm: RoomManager;
    const roomName = "old-room";

    beforeEach(() => {
      rm = new RoomManager();
      rm.createNewRoom(roomName);
    });

    test("deletes room that was created more than 60 minutes ago", () => {
      const room = rm.allRooms.get(roomName);
      room!.createdAt = new Date(new Date().getTime() - 1000 * 60 * 61);

      expect(rm.allRooms.size).toBe(1);
      rm.deleteOldRooms();
      expect(rm.allRooms.size).toBe(0);
    });

    test("does not delete room that was created less than 60 minutes ago", () => {
      const room = rm.allRooms.get(roomName);
      room!.createdAt = new Date(new Date().getTime() - 1000 * 60 * 59);

      expect(rm.allRooms.size).toBe(1);
      rm.deleteOldRooms();
      expect(rm.allRooms.size).toBe(1);
    });

    test("works with both old and new rooms at the same time", () => {
      // One new room already there, add another new and one old
      rm.createNewRoom("new-room");
      const oldRoom = rm.createNewRoom("old-room2");
      oldRoom!.createdAt = new Date(new Date().getTime() - 1000 * 60 * 61);

      expect(rm.allRooms.size).toBe(3);
      rm.deleteOldRooms();
      expect(rm.allRooms.size).toBe(2);
    });

  });
});


