'use strict';

var tedious = require('tedious');

var QueryParam = function(name, value, type) {
  this.name = name;
  this.type = type;
  this.value = value;
};

QueryParam.DEFAULT = 'default'; // DEFAULT constant;

module.exports = {
  TYPES : tedious.TYPES,
  QueryParam : QueryParam
};
