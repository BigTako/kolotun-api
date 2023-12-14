const Comment = require("../models/comment.model");
const ApiFeatures = require("../utils/apiFeatures");
const catchAsync = require("../utils/catchAsync");
const factory = require("./handler.factory");
const statusCode = require("../utils/statusCode");

exports.setMemeAuthorIds = (req, res, next) => {
  req.body.meme = req.params.slug;
  if (req.user) req.body.user = req.user.id;
  next();
};

// DO not know for what, just get meme and virtually populated comments
exports.getMemeComments = catchAsync(async (req, res, next) => {
  const features = new ApiFeatures(
    Comment.find({ meme: req.params.id }),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const comments = await features.query;

  res.status(200).json({
    status: "success",
    data: comments,
  });
});

exports.createComment = catchAsync(async (req, res, next) => {
  const newDoc = await Comment.create({
    ...req.body,
    meme: req.params.id,
    user: req.user.id,
  });

  res.status(statusCode.CREATED_SC).json({
    status: "success",
    data: {
      data: newDoc,
    },
  });
});

exports.updateComment = factory.updateOne(
  Comment,
  { allowedFields: ["content"] },
  "_id",
  "id"
);

exports.deleteComment = factory.deleteOne(Comment, "_id", "id");
