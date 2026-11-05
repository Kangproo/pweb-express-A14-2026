
import { Request, Response, NextFunction } from "express";
import { Prisma } from "../generated/prisma/client.js";
import { HttpError } from "../utils/http-error.js";

function isMalformedJsonError(error: Error): boolean {
  return (
    error instanceof SyntaxError &&
    "status" in error &&
    error.status === 400 &&
    "type" in error &&
    error.type === "entity.parse.failed"
  );
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      status: false,
      message: err.message,
    });
  }

  if (isMalformedJsonError(err)) {
    return res.status(400).json({
      status: false,
      message: "Format JSON tidak valid",
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({
        status: false,
        message: "Data dengan nilai tersebut sudah ada",
      });
    }

    if (err.code === "P2025") {
      return res.status(404).json({
        status: false,
        message: "Data tidak ditemukan",
      });
    }

    if (err.code === "P2034") {
      return res.status(409).json({
        status: false,
        message: "Terjadi konflik transaksi, silakan coba kembali",
      });
    }
  }

  console.error(err);

  return res.status(500).json({
    status: false,
    message: "Terjadi kesalahan pada server",
  });
}
