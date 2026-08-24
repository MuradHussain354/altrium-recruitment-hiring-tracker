import { Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { AppError } from '../utils/errors';

// 5 MB limit in bytes
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream' // fallback sometimes sent by browsers for docx/doc
]);

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.doc', '.docx']);

// Multer memory storage configuration
const storage = multer.memoryStorage();

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return cb(new AppError(400, 'Invalid file type. Only PDF, DOC, and DOCX files are allowed.'));
  }

  if (file.mimetype && !ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
    return cb(new AppError(400, 'Invalid MIME type. Only PDF, DOC, and DOCX files are allowed.'));
  }

  cb(null, true);
};

const multerUpload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  },
  fileFilter
}).single('resume');

/**
 * Validates binary signature / magic numbers of buffer.
 */
export function validateFileSignature(file: Express.Multer.File): boolean {
  if (!file || !file.buffer || file.buffer.length < 4) {
    return false;
  }

  const buffer = file.buffer;
  const ext = path.extname(file.originalname).toLowerCase();

  // Executable binary disguise checks (PE MZ header or ELF header)
  if (buffer[0] === 0x4d && buffer[1] === 0x5a) {
    // Windows executable MZ header
    return false;
  }
  if (buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
    // Linux ELF header
    return false;
  }

  if (ext === '.pdf') {
    // %PDF header (% = 0x25, P = 0x50, D = 0x44, F = 0x46)
    return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
  }

  if (ext === '.doc') {
    // OLE Compound Document: D0 CF 11 E0
    return buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0;
  }

  if (ext === '.docx') {
    // ZIP header: PK\x03\x04 (0x50 0x4B 0x03 0x04)
    return buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
  }

  return false;
}

/**
 * Express middleware for single CV upload handling with validation and error transformation.
 */
export const uploadCvMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  multerUpload(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new AppError(400, 'File size exceeds the 5 MB limit.'));
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return next(new AppError(400, 'Only a single CV file is allowed.'));
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return next(new AppError(400, `Unexpected field '${err.field}'. Please upload the CV file using the 'resume' field.`));
        }
        return next(new AppError(400, `Upload error: ${err.message}`));
      }
      return next(err);
    }

    // If a file was uploaded, perform signature and magic byte verification
    if (req.file) {
      if (!validateFileSignature(req.file)) {
        return next(
          new AppError(
            400,
            'Malformed or invalid file content. The file does not match its expected format or contains unsafe signatures.'
          )
        );
      }
    }

    next();
  });
};
