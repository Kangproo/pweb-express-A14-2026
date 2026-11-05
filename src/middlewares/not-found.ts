
import { Request, Response } from "express";

export function notFound(req: Request, res: Response) {
  res.status(404).json({
    status: false,
    message: `Endpoint ${req.originalUrl} tidak ditemukan`,
  });
}
