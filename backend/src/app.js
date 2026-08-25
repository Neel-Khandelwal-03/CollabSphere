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
    origin: env.clientUrl,
    credentials: true, // allow the refresh-token cookie
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
