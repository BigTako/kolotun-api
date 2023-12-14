const express = require("express");
const commentController = require("../controllers/comment.controller");
const authController = require("../controllers/auth.controller");
const Comment = require("../models/comment.model");
const router = express.Router({ mergeParams: true });

router
  .route("/") // '/:memeSlug/comments'
  .get(commentController.getMemeComments)
  .post(authController.protect, commentController.createComment);

router
  .route("/:id") // id - comment id
  .patch(
    authController.protect,
    authController.restrictToOrPersonal(Comment, ["admin"]),
    commentController.updateComment
  )
  .delete(
    authController.protect,
    authController.restrictToOrPersonal(Comment, ["admin"]),
    commentController.deleteComment
  );

module.exports = router;
