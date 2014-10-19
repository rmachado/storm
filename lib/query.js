'use strict';

var tedious = require('tedious'),
    _ = require('underscore');

var builder = require('./querybuilder'),
    utils = require('./utils');

var Query = function(command, obj, options){

  this._command = command;

  this._options = options || {};

  this._fields = [];

  this._into = null;

  this._from = '';

  this._limit = null;

  this._skip = null;

  this._where = {};

  this._groupBy = [];

  this._having = {};

  this._orderBy = [];

  this._joins = [];

  constructQuery(this, obj || {});
};

Query.prototype.execute = function(){

};

// A list of fields to select, or the wildcard ('*')
Query.prototype.select = function(fields) {

  if(_.isArray(fields)) {

    if(this._fields === '*')
      return this;

    if(_.some(fields, function(f){ return !_.isString(f); }))
      throw new Error('Invalid "fields" value. Must be an array of ' +
        'strings or the wildcard ("*")');

    fields = _.map(fields, utils.normalizeField);

    this._fields = _.union(this._fields, fields);
  }
  else if(fields === '*') {
    this._fields = fields;
  }
  else {
    throw new Error('Invalid "fields" value. Must be an array of ' +
      'strings or the wildcard ("*")');
  }
  return this;
};

// A table name to store the results into
Query.prototype.into = function(tableName) {
  this._into = utils.normalizeTable(tableName);
  return this;
};

// The table to extract the data from
Query.prototype.from = function(tableName) {
  this._from = utils.normalizeTable(tableName);
  return this;
};

Query.prototype.where = function(where) {
  if(!_.isObject(where))
    throw new Error('Invalid "where" object');

  _.extend(this._where, parseSearch(where));

  return this;
};

Query.prototype.limit = function(n) {
  if(!_.isNumber(n))
    throw new Error('Invalid limit value: ' + n);

  this._limit = n;
  return this;
};

Query.prototype.skip = function(n) {
  if(!_.isNumber(n))
    throw new Error('Invalid skip value: ' + n);

  this._skip = n;
  return this;
};

Query.prototype.groupBy = function(grouping) {
  if(_.isString(grouping))
    this._groupBy.push(utils.normalizeField(grouping));
  else if(_.isArray(grouping))
    this._groupBy = this._groupBy.concat(_.map(grouping, utils.normalizeField));
  else
    throw new Error('Invalid grouping. Must be a column or a list of columns');

  return this;
};

Query.prototype.having = function(search) {
  if(this._command !== 'select')
    throw new Error('HAVING is only allowed in SELECT queries');
  if(!_.isObject(search))
    throw new Error('Invalid "having" object');

  _.extend(this._having, parseSearch(search));

  return this;
};

Query.prototype.sort = function(order) {
  if(!_.isArray(order))
    order = [ order ];

  this._orderBy = this._orderBy.concat(_.map(order, function(criteria){
    if(!_.isObject(criteria))
      criteria = { column: criteria, order: 'asc'};

    criteria.column = utils.normalizeField(criteria.column);

    if(criteria.order){
      var ord = criteria.order.toLowerCase();
      if(ord !== 'asc' && ord !== 'desc')
        throw new Error('Invalid order. Must be either "ASC" or "DESC"');
    }
    return criteria;
  }));

  return this;
};

Query.prototype.include = function(fields) {

};

Query.prototype._generateSQL = function() {
  if(!builder.hasOwnProperty(this._command))
    throw new Error('Command not implemented: ' + this._command);

  return builder[this._command](this);
};

var constructQuery = function(query, obj) {

  if(obj.fields) {
    query.select(obj.fields);
  }
  if(obj.into) {
    query.into(obj.into);
  }
  if(obj.from) {
    query.from(obj.from);
  }
  if(obj.limit) {
    query.limit(obj.limit);
  }
  if(obj.where) {
    query.where(obj.where);
  }
  if(obj.groupBy) {
    query.groupBy(obj.groupBy);
  }

};

var operatorKeys = [ '$or' ];

// Parse recursively a WHERE and HAVING sentences
var parseSearch = function(search) {
  var result = {};

  _.each(search, function(value, key){
    if(key === '$or')
      value = _.map(value, parseSearch);

    if(!_.contains(operatorKeys, key))
      key = utils.normalizeField(key);

    result[key] = value;
  });

  return result;
};

module.exports = Query;
