const express = require("express");
const memeController = require("../controllers/meme.controller");
const authController = require("../controllers/auth.controller");
const commentRouter = require("./comment.routes");
const likeController = require("../controllers/like.controller");
const Meme = require("../models/meme.model");
const router = express.Router();

router.get("/me/likes", authController.protect, memeController.getAllMemes);

router.use("/:id/comments", commentRouter);

router.post("/:id/like", authController.protect, likeController.likeMeme);
router
  .route("/top-trending")
  .get(memeController.aliasTopTrending, memeController.getAllMemes);

router
  .route("/")
  .get(memeController.getAllMemes)
  .post(
    authController.protect,
    memeController.uploadMemeImages,
    memeController.createImagesFilenames,
    memeController.createMeme
  );

router.get("/count", memeController.getMemesCount);

router
  .route("/:id")
  .get(memeController.getMeme)
  .patch(
    authController.protect,
    authController.restrictToOrPersonal(Meme, ["admin"]),
    memeController.uploadMemeImages,
    memeController.createImagesFilenames,
    memeController.checkMemeSlug,
    memeController.updateMeme
  )
  .delete(
    authController.protect,
    authController.restrictToOrPersonal(Meme, ["admin"]),
    memeController.deleteMeme
  );

module.exports = router;
