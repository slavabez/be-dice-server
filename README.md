# Be-Dice back-end code

This project is what powers the be-dice.com logic, such as creating rooms, sending/receiving dice rolls

Latest commit status: [![CircleCI](https://circleci.com/gh/slavabez/be-dice-server.svg?style=svg)](https://circleci.com/gh/slavabez/be-dice-server)

Latest commit coverage:

## Built with

Written with Typescript to run on Node 10, using Socket.IO for connectivity. Can build a production-ready Docker image to be deployed anywhere.

## List of SocketIO events

Events that the server listens for:

- **server.ping** - emits an event called **server.pong** with a message
- **server.version** - emits an event called **server.version** with the server version (taken from package.json)
- **register.new** - registers a new user. Requires some parameters, such as avatar, name, color. Emits **register.new.failure** if an error occurred. If registration was a success, emits **register.new.success** with the following object { user, session }, where session is an unique encrypted hash of the user, which can be used to retrieve the user at a later date (if the client re-connects for whatever reason)
- **register.restore** - takes the encrypted session and returns the user. The session is formatted as iv:hash. Sends **register.restore.failure** if there was an error, or **register.restore.success** with the user object if everything worked fine.
- **room.create** - accepts a string (name) and creates a room. If an error occurred, emits **error.client** with the error. If succeeded, emits **room.created** with the room object.
- **room.list** - emits **room.list** with a list of rooms and users in them.
- **room.join** - accepts a string (room name) and joins the room. If an error occurred, emits **error.client** with the error and emits **room.list** with up-to-date rooms. If succeeded, emits **room.join.success** with the room object and broadcasts **room.joined** to the room with the user object.
- **room.leave** - accepts a string (name of the room to leave). If an error occurred, emits **error.client** with the error. If all went well - emits **room.leave.success** and broadcasts **room.left** to the room with the user object.
- **room.roll** - the main event! Takes a string of a roll (e.g. 2d6 or 4d20) and rolls that die in the room the socket is in. If an error occurred, emits **error.client** with the error. If all went well, broadcasts a **room.roll.new** to the room with an object of type RollMessage.

## Code Structure

The main file is BeDiceServer.ts, which is a Socket.IO server wrapper. The server registers event listeners using various handlers, similar to how an Express would work.

The server also uses classes UserManager and RoomManager to help manage the operations
