/*
 Export function which catches errors and trasfers it into error handling middleware.
*/
module.exports = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
