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

module.exports.normalizeTable = function(tableName) {
  if(!_.isString(tableName))
    throw new Error('Invalid table name: "' + tableName + '". Must be a string');

  // If already quoted we unquote it
  if(tableName[0] === '[')
    tableName = tableName.substr(1, tableName.length - 1);

  return tableName;
};

module.exports.normalizeField = function(fieldName) {
  // If already quoted we unquote it
  if(fieldName[0] === '[')
    fieldName = fieldName.substr(1, fieldName.length - 1);

  // Normalize to CamelCase
  fieldName = fieldName.trim().replace(/[-_\.]+(.)?/g, function(match, c){
    return c ? c.toUpperCase() : '';
  });

  fieldName = fieldName[0].toUpperCase() + fieldName.substr(1);

  return fieldName;
};
