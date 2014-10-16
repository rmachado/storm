'use strict';

var _ = require('underscore');

module.exports.quoteTable = function(tableName) {
  var parts = tableName.split('.');

  parts = _.map(parts, function(elem) {
    if(elem[0] !== '[')
      elem = '[' + elem + ']';
    return elem;
  });

  return parts.join('.');
};

module.exports.quoteField = function(fieldName) {
  if(fieldName[0] !== '[')
    fieldName = '[' + fieldName + ']';

  return fieldName;
};
