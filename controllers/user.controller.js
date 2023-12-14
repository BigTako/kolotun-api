const multer = require("multer");
const sharp = require("sharp");
const User = require("../models/user.model");
const catchAsync = require("../utils/catchAsync");
const statusCode = require("../utils/statusCode");
const AppError = require("../utils/appError");
const filterObj = require("../utils/filtration");
const factory = require("./handler.factory");

const multerStorage = multer.memoryStorage(); // image will be stored as a buffer

// set filter to filter not image type files
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true); // OK case
  } else {
    cb(new AppError("Not an image! Please upload only images", 400), false); // NOT OK case
  }
};

//if multer option dest is not set, image will be saved to memory, not to the disk
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadUserPhoto = upload.single("avatar");

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next();
  }
  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;
  req.body.avatar = req.file.filename;
  await sharp(req.file.buffer) // image will be accessible by req.file.buffer if multer storage is set to memory
    .resize(500, 500)
    .toFormat("jpeg")
    .jpeg({ quality: 90 }) // 90% (compress)
    .toFile(`public/img/users/${req.file.filename}`);
  next();
});

/**
 * Updating user info handler.
 * Updating means from user himself.
 * Can't contain information about password. Passwords changind handles in another place.
 * (It neccessary to user Update cause we`re not dealing with passwords)
 */
exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        "This route is not for password updates. Please, use /updateMyPassword."
      )
    );
  }

  // 2) Filtered out unwanted fields name that are not allowed to be updated(leave only fields 'name' and 'email').
  const filteredBody = filterObj(req.body, "pseudo", "name", "email", "avatar");
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    data: updatedUser,
  });
});

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

/**
 * Deleting user handler. Deleting means from user himself.
 * Does not actually delete the user, just sets an 'active' field to false.
 * Info about user still will be available in DB.
 * (It neccessary to user Update cause we`re not dealing with passwords)
 */
exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });
  res.status(204).json({ status: "success", data: null });
});

exports.getAllUsers = factory.getAll(User);

exports.createUser = catchAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);

  newUser.password = "[covered]";
  newUser.passwordConfirm = "[covered]";

  res.status(statusCode.CREATED_SC).json({
    status: "success",
    data: newUser,
  });
});

// ------------------------------ID section
exports.updateUser = factory.updateOne(
  User,
  {
    allowedFields: ["name", "role", "pseudo", "avatar", "email"],
  },
  "_id",
  "id"
);

exports.deleteUser = factory.deleteOne(User, "_id", "id");

exports.getUser = factory.getOne(User, "_id", "id");
