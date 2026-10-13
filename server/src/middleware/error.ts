import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { MulterError } from 'multer';
import { AppError } from '../lib/errors.js';
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (res.headersSent) return _next(error);
  if (error instanceof ZodError) {
    res
      .status(422)
      .json({
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please check the form fields.',
          details: error.flatten(),
        },
      });
    return;
  }
  if (error instanceof AppError) {
    res
      .status(error.status)
      .json({ data: null, error: { code: error.code, message: error.message } });
    return;
  }
  if (error instanceof MulterError) {
    res.status(422).json({ data: null, error: { code: error.code, message: error.message } });
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const status =
      error.code === 'P2025' ? 404 : ['P2002', 'P2003'].includes(error.code) ? 409 : 500;
    if (status !== 500) {
      res
        .status(status)
        .json({
          data: null,
          error: {
            code: error.code,
            message:
              status === 404
                ? 'Record not found'
                : 'This record conflicts with an existing record or relation.',
          },
        });
      return;
    }
  }
  if (error instanceof SyntaxError && 'body' in error) {
    res
      .status(400)
      .json({ data: null, error: { code: 'INVALID_JSON', message: 'Invalid JSON body' } });
    return;
  }
  console.error(error);
  res
    .status(500)
    .json({
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' },
    });
};
