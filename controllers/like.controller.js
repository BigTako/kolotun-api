const AppError = require("../utils/appError");
const Meme = require("../models/meme.model");
const User = require("../models/user.model");
const catchAsync = require("../utils/catchAsync");
const statusCode = require("../utils/statusCode");
//like meme -> check if user already did like a meme -> update Meme likes array & likesCount -> update User likes array

exports.likeMeme = catchAsync(async (req, res, next) => {
  let doc;
  try {
    doc = await Meme.findOneAndUpdate(
      {
        _id: req.params.id,
        likes: { $ne: req.user.id },
      },
      {
        $inc: { likesCount: 1 },
        $push: { likes: req.user.id },
      },
      {
        new: true,
      }
    );

    if (!doc) {
      throw new Error("");
      // return next(new AppError('No document found with that slug', 404));
    }

    await User.findByIdAndUpdate(
      req.user.id,
      {
        $push: { likedMemes: doc._id },
      },
      {
        new: true,
        runValidators: true,
      }
    );
  } catch {
    doc = await Meme.findOneAndUpdate(
      {
        _id: req.params.id,
        // likes: { $ne: req.user.id },
      },
      {
        $inc: { likesCount: -1 },
        $pull: { likes: req.user.id },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!doc) {
      return next(new AppError("Document not found", 404));
    }

    await User.findByIdAndUpdate(
      req.user.id,
      {
        $pull: { likedMemes: doc._id },
      },
      {
        new: true,
        runValidators: true,
      }
    );
  }

  res.status(statusCode.OK_SC).json({
    status: "success",
    data: doc,
  });
});
