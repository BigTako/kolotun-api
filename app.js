const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const compression = require("compression");

const globalErrorHandler = require("./controllers/error.controller");
const AppError = require("./utils/appError");

const memeRouter = require("./routers/meme.routes");
const userRouter = require("./routers/user.routes");

const app = express();

//GLOBAL MIDDLEWARES
//Set security HTTP headers
app.use(helmet());

app.enable("trust proxy");
app.use(
  cors({
    origin: true, // specify the exact origin
    credentials: true,
  })
);

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

//Body parser, reading data from the body into req.body
//Do not accept body larger that 10 kb(optional)
app.use(express.json());
// app.use(express.urlencoded({ extended: true, limit: '10kb' })); // allows to get data from HTML form(from elements by names)
app.use(cookieParser());
// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

app.use(compression()); // compress all the text sent to clients

app.use(`/api/v1/memes`, memeRouter);
app.use(`/api/v1/users`, userRouter);

app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// Error handling middleware
app.use(globalErrorHandler);
module.exports = app;
