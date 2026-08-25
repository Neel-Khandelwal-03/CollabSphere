const multer = require('multer');
const { ALLOWED_MIME_TYPES, MAX_FILE_BYTES } = require('../utils/cloudinary');
const ApiError = require('../utils/ApiError');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(ApiError.badRequest(`Unsupported file type: ${file.mimetype}`));
    }
    cb(null, true);
  },
});

module.exports = upload;
