const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const env = require('./config/env');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(
  cors({
  origin: (origin, callback) => {
    // Allow requests without an Origin header
    // (curl, server-to-server requests, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Production frontend
    if (origin === env.clientUrl) {
      return callback(null, true);
    }

    // Vercel preview deployments
    if (/^https:\/\/collab-sphere-[a-z0-9-]+\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }

    // Local development
    if (
      origin === 'http://localhost:3000' ||
      origin === 'http://127.0.0.1:3000'
    ) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(env.isProduction ? 'combined' : 'dev'));

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
