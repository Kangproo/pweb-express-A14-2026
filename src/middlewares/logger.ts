
import { Request, Response, NextFunction } from "express";

export function logger(
  req: Request,
  res: Response,
  next: NextFunction
) {
  res.on("finish", () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode}`);
  });

  next();
}
