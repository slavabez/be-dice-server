import * as express from "express";

export default (
  err: express.ErrorRequestHandler,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  console.error(err);
  res.status(500).send("Server error")
};
