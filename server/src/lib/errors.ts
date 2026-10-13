export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = 'BAD_REQUEST',
  ) {
    super(message);
  }
}
export function assertFound<T>(value: T | null | undefined, message = 'Not found'): T {
  if (!value) throw new AppError(404, message, 'NOT_FOUND');
  return value;
}
