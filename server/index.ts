import BeDiceServer from "./BeDiceServer";

const server = new BeDiceServer();
const port = Number.parseInt(process.env.PORT || "3050");
server.listen(port);
