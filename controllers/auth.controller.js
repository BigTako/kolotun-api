const crypto = require("crypto");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const Email = require("../utils/email");

/**
 * Generate JWT token
 * @param {*} id - user id
 * @returns generated JWT token
 */
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

/**
 * Generate JWt token and send it to cookie based on user credentials.
 * @param {*} user object with user data
 * @param {*} res - response object
 * @returns String generated JWT token
 */
const createToken = (user, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };
  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

  res.cookie("jwt", token, cookieOptions);
  return token;
};

/**
 * Generate JWt token and send it to cookie and as a responce based on user credentials.
 * @param {*} user object with user data
 * @param {*} statusCode - responce status code
 * @param {*} res - response object
 */
exports.createSendToken = (user, statusCode, res) => {
  const token = createToken(user, res);
  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const activationToken = crypto.randomBytes(32).toString("hex");

  const newUser = await User.create({
    name: req.body.name,
    pseudo: req.body.pseudo,
    email: req.body.email,
    role: req.body.role,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    passwordResetToken: req.body.passwordResetToken,
    passwordResetExpires: req.body.passwordResetExpires,
    accountActivationToken: crypto
      .createHash("sha256")
      .update(activationToken)
      .digest("hex"),
    accountActivationExpires: Date.now() + 12 * 60 * 60 * 1000, // after 12 hours
  });

  // console.log(newUser);
  // 1) Get user based on the token
  try {
    const activationURL = `${req.protocol}://${req.get(
      "host"
    )}/api/v1/users/accountActivation/${newUser.accountActivationToken}`;

    await new Email(newUser, activationURL).sendWelcome(
      "Please, activate your accrount via URL below (token expires in 12 hours ).Activation URL:"
    );

    res.status(200).json({
      status: "success",
      message: "Success! Activate your account via url in the email.",
    });
  } catch (err) {
    console.log(err);
    newUser.accountActivationToken = undefined;
    newUser.accountActivationExpires = undefined;
    await newUser.delete({ validateBeforeSave: false });

    return next(
      new AppError("There was an error sending the email. Try again later!"),
      500
    );
  }
});

exports.activateAccount = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token

  const user = await User.findOneAndUpdate(
    {
      accountActivationToken: req.params.token,
      accountActivationExpires: { $gt: Date.now() },
    },
    {
      accountActivationToken: undefined,
      accountActivationExpires: undefined,
      activated: true,
    },
    {
      new: true,
      runValidators: false,
    }
  );

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError("Token is invalid or has expired", 400));
  }

  // 4) Log the user in, send JWT
  // createToken(user, res);
  this.createSendToken(user, 200, res);
  // exports.createSendToken(user, 200, res);
});

exports.login = catchAsync(async (req, res, next) => {
  console.log(req.body);
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError("Please provide email and password!", 400));
  }
  // 2) Check if user exists && password is correct
  const user = await User.findOne({ email, activated: true }).select(
    "+password"
  );

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  // 3) If everything ok, send token to client

  exports.createSendToken(user, 200, res);
});

/**
 * Resets current token to log out user.
 */
exports.logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: "success" });
};

/**
 * Checks if user logged in to give an access to routes which require it.
 * Decodes current token and checks if there is user with such credentials.
 *
 */
exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  // console.log("token: " + token);
  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  // 2) Verification token
  // console.log(`TOken in protect: ${token}`);

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // console.log(decoded);
  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        "The user belonging to this token does no longer exist.",
        401
      )
    );
  }

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password! Please log in again.", 401)
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// Only for rendered pages, no errors!
/**
 * Just checks if user logged in to show corresponding header in page(does not throw exceptions)
 * @param {*} req - request object
 * @param {*} res - responce object
 * @param {*} next - next function
 * @returns next function if it is needed
 */
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      res.locals.user = currentUser;
      req.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

/**
 * Limit roles by access to routes
 * @param  {...any} roles give an access to routes to given list of roles
 * @returns Error if role do not have an access
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'lead-guide']. role='user'
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }

    next();
  };
};

exports.restrictToOrPersonal = (Moda, roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      const doc = Moda.findById(req.params.id).select("user");
      if (req.user.id !== doc.user) {
        return next(
          new AppError("You do not have permission to perform this action", 403)
        );
      }
    }
    next();
  };
};

/**
 * Sends an email(req.email.body) with password reset token.
 * Token expires in 10m.
 */
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("There is no user with email address.", 404));
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email

  try {
    const resetURL = `${req.protocol}://${req.get(
      "host"
    )}/api/v1/resetPassword/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset(
      "Reset your password by sending PATCH request with (password, passwordConfirm) body (token expires in 10 ). Reset URL:"
    );

    res.status(200).json({
      status: "success",
      message: "Token sent to email!",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError("There was an error sending the email. Try again later!"),
      500
    );
  }
});

/**
 * Reset current password using token received via email.
 */
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError("User not found", 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  this.createSendToken(user, 200, res);
});

/**
 * Update logged in user password.
 */
exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select("+password");

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError("Your current password is wrong.", 401));
  }

  // 3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // User.findByIdAndUpdate will NOT work as intended!

  // 4) Log user in, send JWT
  this.createSendToken(user, 200, res);
});
