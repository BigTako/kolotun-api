const catchAsync = require("../utils/catchAsync");
const statusCode = require("../utils/statusCode");

const ApiFeatures = require("../utils/apiFeatures");
const AppError = require("../utils/appError");
const filterObj = require("../utils/filtration");

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    const features = new ApiFeatures(Model.find(), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    const documents = await features.query;
    res.status(statusCode.OK_SC).json({
      status: "success",
      results: documents.length,
      data: {
        data: documents,
      },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const newDoc = await Model.create(req.body);
    res.status(statusCode.CREATED_SC).json({
      status: "success",
      data: {
        data: newDoc,
      },
    });
  });

exports.getOne = (Model, dbCreteria, paramsCreteria) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findOne({
      [dbCreteria]: req.params[paramsCreteria],
    });

    if (!doc) {
      return next(new AppError("Document not found", statusCode.NOT_FOUND_SC));
    }

    res.status(statusCode.OK_SC).json({
      status: "success",
      data: doc,
    });
  });

exports.updateOne = (Model, filterOptions, dbCreteria, paramsCreteria) =>
  catchAsync(async (req, res, next) => {
    let body;

    if (filterOptions) {
      body = filterObj(req.body, ...filterOptions.allowedFields);
    } else {
      body = { ...req.body };
    }

    const doc = await Model.findOneAndUpdate(
      {
        [dbCreteria]: req.params[paramsCreteria],
      },
      body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (req.user.role !== "admin" && doc.user !== req.user.id) {
      return next(
        new AppError(
          "You do not have permission to perform this action",
          statusCode.FORBIDDEN_SC
        )
      );
    }

    if (!doc) {
      return next(new AppError("Document not found", statusCode.NOT_FOUND_SC));
    }

    res.status(statusCode.OK_SC).json({
      status: "success",
      data: doc,
    });
  });

exports.deleteOne = (Model, dbCreteria, paramsCreteria) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findById(req.params.id).select("user");

    if (req.user.role !== "admin" && doc.user !== req.user.id) {
      return next(
        new AppError(
          "You do not have permission to perform this action",
          statusCode.FORBIDDEN_SC
        )
      );
    }

    await Model.findOneAndDelete({
      [dbCreteria]: req.params[paramsCreteria],
    });

    res.status(statusCode.OK_SC).json({
      data: null,
    });
  });

exports.getCount = (Model) =>
  catchAsync(async (req, res, next) => {
    const count = await Model.estimatedDocumentCount();
    res.status(statusCode.OK_SC).json({
      status: "success",
      data: count,
    });
  });
