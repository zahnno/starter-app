const multer = require("multer");

const fileFilter = (req, file, cb) => {
  // Handle image uploads
  if (file.fieldname === 'image' || file.fieldname === 'profileImage') {
    if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
      cb(null, true);
    } else {
      cb(new Error("Invalid image file type, only JPEG and PNG is allowed!"), false);
    }
  }
  // Handle book file uploads
  else if (file.fieldname === 'file') {
    if (file.mimetype === "text/plain" || file.mimetype === "application/pdf" || file.mimetype === "application/epub+zip") {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type, only TXT, PDF, and EPUB is allowed!"), false);
    }
  }
  // Reject any other field names
  else {
    cb(new Error("Invalid field name"), false);
  }
};

const upload = multer({
  fileFilter,
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 * 10 }, // 10MB limit
});

module.exports = upload;