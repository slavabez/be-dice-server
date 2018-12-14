import * as faker from "faker";
import * as yadicer from "yadicer";
import { User } from "./UserManager";
import { RollMessage, Room } from "./RoomManager";

export default class FakeGenerator {
  static fakeUser(): User {
    return new User({
      socketId: faker.random.uuid(),
      color: "#" + faker.random.number({ min: 100000, max: 999999 }).toString(),
      avatar: faker.internet.url(),
      name: faker.internet.userName()
    });
  }

  /**
   * Generates an array of random Users with 'num' users
   * @param num 5 by default
   */
  static fakeUsers(num: number = 5): User[] {
    return [...Array(num)].map(() => FakeGenerator.fakeUser());
  }

  static async fakeRollMessage(): Promise<RollMessage> {
    const randomRollString = `${faker.random.number({
      min: 1,
      max: 20
    })}d${faker.random.number({ min: 1, max: 20 })}`;
    const roll = <RollMessage>await yadicer(randomRollString);
    roll.author = FakeGenerator.fakeUser();
    return roll;
  }

  static fakeRoom(): Room {
    return new Room(faker.internet.domainName());
  }

}
