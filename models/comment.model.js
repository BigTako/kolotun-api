const mongoose = require("mongoose");
const Meme = require("./meme.model");

const commentSchema = mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
      minLength: 1,
      maxLength: 1000,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Comment must have an author specified"],
    },
    meme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meme",
      required: [true, "Comment has to relate to a Meme"],
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    changedAt: {
      type: Date,
    },
  },
  {
    toJSON: {
      virtuals: true,
    },
    toObject: {
      virtuals: true,
    },
  }
);

commentSchema.statics.calsCommentsCount = async function(memeId) {
  const stats = await this.aggregate([
    {
      $match: { meme: memeId },
    },
    {
      $group: {
        _id: "$meme",
        nComments: { $sum: 1 },
      },
    },
  ]);
  // console.log(stats);

  //Save stats to current meme
  if (stats.length > 0) {
    await Meme.findByIdAndUpdate(memeId, {
      commentsCount: stats[0].nComments,
    });
  } else {
    await Meme.findByIdAndUpdate(memeId, {
      commentsCount: 0,
    });
  }
};

commentSchema.pre(/^save/, async function(next) {
  this.c = { ...this };
  // transfer data from pre to post middleware
  next();
});

commentSchema.pre(/^find/, async function(next) {
  this.populate({ path: "user", select: "name avatar _id" }).select("-__v");
  next();
});

commentSchema.post(/^save/, async function() {
  // await this.findOne(); does NOT work here, query has already executed
  await this.constructor.calsCommentsCount(this.c._doc.meme); // this.r.tour -  tour id
});

commentSchema.post("save", function(doc, next) {
  // this.constructor.calsCommentsCount(this.meme);
  doc
    .populate({ path: "user", select: "name avatar _id" })
    .execPopulate(function() {
      next();
    });
});

const Comment = mongoose.model("Comment", commentSchema);
module.exports = Comment;
