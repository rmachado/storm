'use strict';

var tedious = require('tedious'),
    _ = require('underscore');

var utils = require('./utils');

var Query = function(command, obj){

  this._command = command;

  this._fields = [];

  this._into = '';

  this._from = '';

  this._where = {};

  this._groupBy = [];

  this._having = {};

  this._orderBy = [];

  constructQuery(this, obj);
};

Query.prototype.execute = function(){

};

Query.prototype.select = function(fields) {

  if(_.isArray(fields)) {

    if(_.some(fields, function(f){ return !_.isString(f); }))
      throw new Error('Invalid "fields" value. Must be an array of ' +
        'strings or the wildcard ("*")');

    this._fields = _.union()
  }
  else if(obj.fields === '*') {
    query._fields = obj.fields;
  }
  else {
    throw new Error('Invalid "fields" value. Must be an array of ' +
      'strings or the wildcard ("*")');
  }
};

Query.prototype.where = function(where) {

};

Query.prototype.limit = function(n) {

};

Query.prototype.sort = function(order) {

};

Query.prototype.include = function(fields) {

};

var constructQuery = function(query, obj) {

  // A list of fields to select, or the wildcard ('*')
  if(obj.fields) {

  }

  // A table name to store the results into
  if(obj.into) {

  }

};

module.exports = Query;
