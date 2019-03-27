# Be-Dice backend code

This project is what powers the be-dice.com logic, such as creating rooms, sending/recieving dice rolls

## Built with

Written with Typescript to run on Node 10, using Socket.IO for connectivity. Can build a production-ready Docker image to be deployed anywhere.

## Code Structure

The main file is BeDiceServer.ts, which is a Socket.IO server wrapper. The server registers event listeners using various handlers, similar to how an Express would work.