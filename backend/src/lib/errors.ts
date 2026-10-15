export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what = 'Registo') => new HttpError(404, `${what} não encontrado`);
export const conflict = (message: string) => new HttpError(409, message);
