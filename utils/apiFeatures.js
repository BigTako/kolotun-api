/*
  Filter - get only objects which fields satisfy given criteria(e.x. price[gte|gt|lte|lt]=2).
  Sort - sort by given object field(if fields have same value, add one more of field to sort by it).
  Limit - send to user objects only with given set of fields.
  Paginate - divide full set of objects into subsets (page or limit)
*/
class APIFeatures {
  /**
   * Class constructor
   * @param {*} query - set of data (Model.find()...) in NOT AWAITED query
   * @param {*} queryString - query with criteria (usually req.query)
   */
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    //1A) Filtering
    const queryObj = { ...this.queryString };
    const excludeFields = ["page", "sort", "limit", "fields"];

    excludeFields.forEach((el) => delete queryObj[el]);

    //1B) Advanced filtering

    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(",").join(" ");
      this.query = this.query.sort(sortBy);
      //sort('price ratingAverage')
    } else {
      this.query = this.query.sort("name");
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(",").join(" ");
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select("-__v"); //exclude fields
    }
    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * this.queryString.limit;
    //this.queryString.page

    //skip - from which object to start(number), limit - how many objects to load
    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeatures;
