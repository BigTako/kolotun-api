/**
 * Deletes all fields from object except those are in ..allowerFieds array.
 * @param {Object} obj - current object with info of new fields
 * @param  {...String} fields - list of fields to leave or deletein object
 * @returns
 */
module.exports = (obj, ...allowedFields) => {
  if (!obj) return null;
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) {
      newObj[el] = obj[el];
    }
  });
  return newObj;
};
