const fs = require("fs");
const slugify = require("slugify");
const multer = require("multer");
const sharp = require("sharp");

const catchAsync = require("../utils/catchAsync");
const statusCode = require("../utils/statusCode");

const Meme = require("../models/meme.model");
const ApiFeatures = require("../utils/apiFeatures");
const factory = require("./../controllers/handler.factory");
const AppError = require("../utils/appError");

const filterObj = require("../utils/filtration");

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

exports.uploadMemeImages = upload.fields([{ name: "images", maxCount: 5 }]);

/**
 * Create list of filenames, but save only when meme data is validated.
 */
exports.createImagesFilenames = catchAsync(async (req, res, next) => {
  if (!req.files || !req.files.images) {
    return next();
  }

  req.body.images = [];
  for (let i = 0; i < req.files.images.length; i++) {
    req.body.images.push(`meme-${req.user.id}-${Date.now()}-${i}.jpeg`);
  }
  next();
});

const resizeSaveMemeImages = async (req) => {
  if (!req.body.images || !req.files.images) {
    return;
  }

  await Promise.all(
    req.files.images.map(async (file, i) => {
      await sharp(file.buffer) // image will be accessible by req.file.buffer if multer storage is set to memory
        // .resize(2600, 1633)
        .toFormat("jpeg")
        .jpeg({ quality: 90 }) // 90% (compress)
        .toFile(`public/img/memes/${req.body.images[i]}`);
    })
  );
};

exports.aliasTopTrending = (req, res, next) => {
  req.query.limit = req.query.limit || "5";
  req.query.sort = "-views";
  req.query.fields = "name,origin,views";
  next();
};

exports.checkMemeSlug = (req, res, next) => {
  if (req.body.name) {
    req.body.slug = slugify(req.body.name, { lower: true });
  }
  next();
};

exports.getAllMemes = catchAsync(async (req, res, next) => {
  const {
    page = "1",
    limit = "15",
    sort = "-createdAt,-views,-likesCount,name,_id",
  } = req.query;

  let query;

  if (req.route.path === "/account/likes") {
    query = Meme.find({ _id: { $in: req.user.likedMemes } }).select(
      "+createdAt"
    );
  } else {
    query = Meme.find();
  }

  const memesFeatures = new ApiFeatures(query, {
    ...req.query,
    page,
    limit,
    sort,
  })
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const memes = await memesFeatures.query;
  res.status(statusCode.OK_SC).json({
    status: "success",
    data: memes,
  });
});

// exports.createMeme = factory.createOne(Meme);
exports.createMeme = catchAsync(async (req, res, next) => {
  const newDoc = await Meme.create({ ...req.body, user: req.user.id });
  await resizeSaveMemeImages(req);
  res.status(statusCode.CREATED_SC).json({
    status: "success",
    data: {
      data: newDoc,
    },
  });
});

exports.getMeme = factory.getOne(Meme, "_id", "id");
exports.getMemeBySlug = factory.getOne(Meme, "slug", "slug");

const deleteFiles = async (path, files) => {
  if (files && files.length > 0) {
    files.forEach((file) => {
      fs.unlink(`${path}/${file}`, (err) => {
        if (err) {
          console.error("Error deleting file:", err);
        } else {
          console.log(`File ${file} deleted successfully`);
        }
      });
    });
  }
};

exports.updateMeme = catchAsync(async (req, res, next) => {
  const body = filterObj(
    req.body,
    "category",
    "slug",
    "tags",
    "name",
    "description",
    "origin",
    "images"
  );

  if (body.images) body.imageCover = body.images[0];
  const doc = await Meme.findByIdAndUpdate(req.params.id, body, {
    new: true,
    runValidators: true,
  });

  if (!doc) {
    return next(new AppError("Document not found", statusCode.NOT_FOUND_SC));
  }

  if (body.images) {
    await resizeSaveMemeImages(req);
    deleteFiles("./public/img/memes", doc.images);
  }

  res.status(statusCode.OK_SC).json({
    status: "success",
    data: doc,
  });
});

exports.deleteMeme = factory.deleteOne(Meme, "_id", "id");

exports.deleteMemeBySlug = catchAsync(async (req, res, next) => {
  const memeImages = await Meme.findOne({
    slug: req.params.slug,
    user: req.user._id,
  });

  if (memeImages) {
    deleteFiles("./public/img/memes", memeImages.images);
  }
  await Meme.findOneAndDelete({
    slug: req.params.slug,
    user: req.user._id,
  });

  res.status(statusCode.OK_SC).json({
    status: "success",
    data: null,
  });
});

exports.getMemesCount = factory.getCount(Meme);
