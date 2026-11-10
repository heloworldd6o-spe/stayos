const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Check if running in serverless environment (Vercel / AWS Lambda / Netlify)
const isServerless = !!(process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL_ENV);

// Use /tmp on serverless environments where local folder is read-only
let uploadDir = isServerless
  ? path.join('/tmp', 'stayos-uploads')
  : path.resolve(__dirname, '../uploads');

// Safe directory initialization that never throws
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (err) {
  // If local mkdir fails (e.g. read-only container), fallback to /tmp
  try {
    uploadDir = path.join('/tmp', 'stayos-uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  } catch (tmpErr) {
    console.warn('⚠️ Serverless upload directory warning:', tmpErr.message);
  }
}

// Storage engine abstraction (Local disk implementation with cloud-ready interface)
let storage;
try {
  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      try {
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
      } catch (e) {}
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `doc-${uniqueSuffix}${ext}`);
    }
  });
} catch (e) {
  storage = multer.memoryStorage();
}

// File filter for KYC and verification safety
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Only JPG, PNG, WEBP, and PDF documents are allowed.'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter
});

module.exports = {
  upload,
  uploadDir
};
