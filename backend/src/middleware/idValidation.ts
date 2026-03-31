import { Request, Response, NextFunction } from 'express';
import { validateMongoId } from './utils/validation';

export const validateObjectId = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const id = req.params[paramName];

    if (!validateMongoId(id)) {
      const error = new Error('Invalid ID format');
      (error as any).statusCode = 400;
      next(error);
      return;
    }

    next();
  };
};
