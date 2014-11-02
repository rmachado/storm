'use strict';

var tedious = require('tedious'),
    _ = require('underscore');

var builder = require('./querybuilder'),
    utils = require('./utils');

/**
 * Query class constructor
 *
 * @param {String} command the sql command (select, insert, etc.)
 * @param {Object} obj the Query specifications
 * @param {Object} options
 */
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

  this._set = {};

  this._joins = [];

  constructQuery(this, obj || {});
};

/**
 * Executes the Query
 *
 * @return {Promise} function(results)
 * @api public
 */
Query.prototype.execute = function(){

};

/**
 * Adds a list of fields to select.
 * Only suitable for SELECT queries.
 *
 * @example
 *     new Query('select').select(['Id', 'Name'])
 *     // => 'select [Id], [Name]'
 *
 * @param {String|Array} fields the field list, or the wildcard string ('*')
 * @return {Object} the same Query instance
 * @api public
 */
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

/**
 * Specifies a table to store the results into.
 * Only suitable for SELECT queries.
 *
 * @example
 *    new Query('select').into('NewTable'])
 *    // => 'select * into [NewTable]'
 *
 * @param {String} tableName the table name where to store the results
 * @return {Object} the same Query instance
 * @api public
 */
Query.prototype.into = function(tableName) {
  this._into = utils.normalizeTable(tableName);
  return this;
};

/**
 * The table to operate with.
 * * In SELECT queries represent the 'SELECT FROM <table>'.
 * * In UPDATE queries represent the 'UPDATE <table>.'
 * * In INSERT queries represent the 'INSERT INTO <table>.'
 * * In DELETE queries represent the 'DELETE FROM <table>.'
 *
 * @example
 *    new Query('select').from('AnotherTable'])
 *    // => 'select * from [AnotherTable]'
 *
 * @param {String} tableName the table name to operate with
 * @return {Object} the same Query instance
 * @api public
 */
Query.prototype.from = function(tableName) {
  this._from = utils.normalizeTable(tableName);
  return this;
};

/**
 * Filters the results of the query.
 * Only suitable for SELECT, UPDATE and DELETE queries.
 *
 * @example
 *    query.where({ 'verified' : isVerifiedParam })
 *    // => 'select * from [User] where [Verified]=@isVerified;'
 *
 * ##Query Operators
 * Some mongoDB-like query operators are supported:
 * * $gt, $gte, $lt and $lte, corresponding to '>', '>=', '<' and '<=' respectively
 * * $in, $nin, corresponding to 'IN' and 'NOT IN' respectively
 * * $neq, corresponding to '!=' operator
 * * $null, corresponding to 'IS NULL' and 'IS NOT NULL' (see the code below)
 *
 * @param {Object} where the filter criteria. The keys correspond to column names,
 *  while values must be Parameters objects, contaning an unique name, the data
 *  type and the value. Using direct values is discouraged and is not currently
 *  supported. The value may also be compound by one or more `Query Operators`
 * @return {Object} the same Query instance
 * @api public
 */
Query.prototype.where = function(where) {
  if(!_.isObject(where))
    throw new Error('Invalid "where" object');

  _.extend(this._where, parseSearch(where));

  return this;
};

/**
 * Limits the number of result rows.
 *
 * @example
 *    new Query('select').limit(10)
 *    // => 'select top 10 * from [User]'
 *
 * @param {Number} n the number of rows to obtain
 * @return {Object} the same Query instance
 * @api public
 */
Query.prototype.limit = function(n) {
  if(!_.isNumber(n))
    throw new Error('Invalid limit value: ' + n);

  this._limit = n;
  return this;
};

/**
 * Skips rows from the result set.
 *
 * @example
 *    new Query('select').skip(5)
 *    // => 'select * from [User] OFFSET 5 ROWS'
 *
 * @param {Number} n the number of rows to skip
 * @return {Object} the same Query instance
 * @api public
 */
Query.prototype.skip = function(n) {
  if(!_.isNumber(n))
    throw new Error('Invalid skip value: ' + n);

  this._skip = n;
  return this;
};

/**
 * Groups the result set by one or more columns
 *
 * @example
 *    new Query('select').groupBy('Age')
 *    // => 'select * from [User] GROUP BY [Age]'
 *
 * @param {String|Array} grouping a column name or an Array of column names
 *  specifying the grouping criteria.
 * @return {Object} the same Query instance
 * @api public
 */
Query.prototype.groupBy = function(grouping) {
  if(_.isString(grouping))
    this._groupBy.push(utils.normalizeField(grouping));
  else if(_.isArray(grouping))
    this._groupBy = this._groupBy.concat(_.map(grouping, utils.normalizeField));
  else
    throw new Error('Invalid grouping. Must be a column or a list of columns');

  return this;
};

/**
 * Filters the results in a grouping or aggregate in the same way than a WHERE
 * clause does with the result set. It can be used as a common WHERE clause as well.
 * Only suitable for SELECT queries.
 *
 * @param {Object} where the filter criteria. Same as in WHERE clause.
 * @return {Object} the same Query instance
 * @api public
 */
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

Query.prototype.set = function(updates) {
  if(this._command !== 'update')
    throw new Error('SET is only allowed in UPDATE queries');
  if(!_.isObject(updates))
    throw new Error('Invalid "set" object');

  _.extend(this._set, parseSet(updates));

  return this;
};

Query.prototype.include = function(fields) {

};

Query.prototype._generateSQL = function() {
  if(!builder.hasOwnProperty(this._command))
    throw new Error('Command not implemented: ' + this._command);

  return builder[this._command](this);
};

var commandOptions = {
  select: ['select', 'into', 'from', 'limit', 'skip', 'where', 'groupBy',
           'having', 'sort'],
  update: ['from', 'limit', 'set', 'where'],
  delete: ['from', 'limit', 'where'],
};

var constructQuery = function(query, obj) {

  _.each(commandOptions[query._command], function(opt){
    if(obj[opt]) {
      query[opt].call(query, obj[opt]);
    }
  });
};

var operatorKeys = [ '$or' ];

// Parses recursively a WHERE and HAVING clauses
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

// Parses a SET clause
var parseSet = function(updates) {
  var result = {};

  _.each(updates, function(value, key){
    key = utils.normalizeField(key);
    result[key] = value;
  });

  return result;
};

module.exports = Query;
