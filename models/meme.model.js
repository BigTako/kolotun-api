const mongoose = require("mongoose");
const slugify = require("slugify");

const memeSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please, specify a meme name."],
      minLength: [1, "A meme name has to be at least 1 character long."],
      maxLength: [128, "A meme name has to be at most 256 character long."],
    },
    description: {
      type: String,
    },
    category: {
      type: String,
      default: "Meme",
      enum: {
        values: ["Meme", "People", "Event", "Site", "Subculture"],
        message: `Please, choose category among this enum: Meme, People, Event, Subculture.`,
      },
    },
    tags: {
      type: [String],
    },
    origin: {
      type: String,
    },
    slug: {
      type: String,
      unique: true,
    },
    imageCover: String,
    images: {
      type: [String],
      required: [true, "Meme has to have at least one image"],
      validate: {
        validator: function(val) {
          return val.length !== 0;
        },
        message: "Meme has to have at least one image",
      },
    },
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    views: {
      type: Number,
      default: 0,
    },
    likesCount: {
      type: Number,
      default: 0,
    },
    likes: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Meme must have an author specified"],
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

//Indexes
memeSchema.index({ slug: 1 }, { unique: true });

//Virtual field

memeSchema.virtual("mark").get(function() {
  if (!!this.views) return Math.round((this.likesCount / this.views) * 100);
  return 0;
});

memeSchema.pre("save", function(next) {
  this.imageCover = this.images[0];
  this.slug = slugify(this.name, { lower: true });
  this.likesCount = this.likes.length;
  next();
});

memeSchema.pre(/update/i, async function(next) {
  const docToUpdate = this;
  if (docToUpdate.name)
    docToUpdate.slug = slugify(docToUpdate.name, { lower: true });
  next();
});

memeSchema.virtual("comments", {
  ref: "Comment",
  foreignField: "meme", // field referencing for parent in child
  localField: "_id", // field referencing for parent in parent
});

memeSchema.pre(/^findOne/, async function(next) {
  // Virtual populate
  this.populate({
    path: "comments",
    select: "-__v",
    options: { sort: { createdAt: -1 } },
  }).populate({
    path: "likes",
    select: "_id name avatar",
  });
  next();
});

memeSchema.pre(/find/, async function(next) {
  this.populate({
    path: "user",
    select: "_id name pseudo avatar",
  });
  next();
});

const Meme = mongoose.model("Meme", memeSchema);

module.exports = Meme;
