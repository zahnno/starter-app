const express = require("express");
const morgan = require('morgan');
const path = require('path');
require("dotenv").config({ path: "./config.env" });

const app = express();

const cors = require("cors");

const port = process.env.PORT || 5000;

app.use(cors());

// Parse regular requests as JSON
app.use((req, res, next) => {
  if (req.originalUrl === '/api/webhooks/stripe') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

app.use(morgan('tiny'));

// API Routes
app.use('/auth', require('./routes/auth'));
app.use(require("./routes/query"));
app.use('/api/payment', require("./routes/payment"));
app.use('/api/webhooks', require("./routes/webhooks"));

// Serve static files from the React app if in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
}

// Catch-all route - Handle any requests that don't match the ones above
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// Get MongoDB driver connection
const dbo = require("./db/conn");
 
app.listen(port, async () => {
  // Perform a database connection when server starts
  dbo.connectToMongoose();
  console.log(`Server is running on port: ${port}`);
});