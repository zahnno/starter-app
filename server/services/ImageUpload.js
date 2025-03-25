const multer = require("multer");

const upload = multer({
  fileFilter,
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 * 10 }, // 10MB limit
});

module.exports = upload;