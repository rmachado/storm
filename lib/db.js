'use strict';

var tedious = require('tedious');

var QueryParam = function(name, value, type) {
  this.name = name;
  this.type = type;
  this.value = value;
};

module.exports = {
  QueryParam : QueryParam
};
