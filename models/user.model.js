const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please, specify your name."],
    minLength: [1, "A username has to be at least 1 character long."],
    maxLength: [20, "A username has to be at most 20 character long."],
    trim: true,
  },
  pseudo: {
    type: String,
    required: [true, "Please, specify your pseudonim."],
    minLength: [1, "Pseudonim has to be at least 1 character long."],
    maxLength: [20, "Pseudonim has to be at most 20 character long."],
    unique: true,
    trim: true,
    validate: {
      message: "Pseudo cannot contain symbols [\\, ?, =, -]",
      validator: function(value) {
        return value.match(/(\/|\?|\=|-)/) === null;
      },
    },
  },
  email: {
    type: String,
    required: [true, "Please, specify your email address."],
    unique: true,
    trim: true,
    validate: [validator.isEmail, "Please, specify a valid email address."],
  },
  avatar: {
    type: String,
    default: "default.jpg",
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  password: {
    type: String,
    required: [true, "Please, specify your password."],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, "Please, confirm you password."],
    validate: {
      message: "Passwords do not match.",
      validator: function(value) {
        return value === this.password;
      },
    },
    select: false,
  },
  passwordChangedAt: {
    // Date when password was last changed
    type: Date,
  },
  accountActivationToken: String,
  accountActivationExpires: Date,
  passwordResetToken: String, // A reset token, generates when client forgots his password to identify its realy him
  passwordResetExpires: Date, // Time, when passwordResetToken expires
  active: {
    // when user deletes an account , type is sets to false
    type: Boolean,
    default: true,
    select: false,
  },
  activated: {
    // when user deletes an account , type is sets to false
    type: Boolean,
    default: false,
    select: false,
  },
  likedMemes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Meme" }],
});

//Indexes
userSchema.index({ pseudo: 1 });

/**
 * Pre 'save', 'create' middleware. Before user created of saved, hash his password
 * in order not to store it in raw state in DB.
 * Works only if password was modified.
 * Do not use arrow function here, cause 'this' keyword will be unavailable
 */
userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12); // hash password to store in DB

  this.passwordConfirm = undefined; // set to undefined, because it`s raw password
  next();
});

/**
 * Pre 'save', 'create' middleware. Before user created of saved,
 * field passwordCreatedAt is initialized.
 * Works only if password was modified or document is new.
 * Do not use arrow function here, cause 'this' keyword will be unavailable.
 * 'this' means current document.
 */
userSchema.pre("save", function(next) {
  if (!this.isModified("password") || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000; // subtract a second
  next();
});

/**
 * Pre 'find' query middeware. Works before each query
 * starting from 'find' will be executed.
 * Filters deleted(deactivated) accounts.
 * 'this' means current query.
 */
userSchema.pre(/^find/, function(next) {
  this.find({ active: { $ne: false } });
  next();
});

/**
 * Checks if passwords match.
 * Available from any object in the program.
 * @param {String} candidatePassword - raw(decrypted) password
 * @param {String} userPassword - encrypted(hashed) password from DB
 * @returns
 */
userSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

/**
 * Checks if password was changed before JWT token was issued,
 * so before the login.
 * If it false, current token isn't valid.
 * @param {Number} JWTTimestamp Timestamp of time JWT token was created(login)
 * @returns {Boolean} Value of statement
 */
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

/**
 * Creates random password reset token to be sent to user via email.
 * Expires in 10 minutes.
 * @returns password reset token
 */
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString("hex"); // create a random string

  //hash it
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  //set expiration time after 10 minutes
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
