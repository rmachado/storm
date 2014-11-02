'use strict';

var _ = require('underscore'),
    db = require('./db'),
    QueryParam = db.QueryParam;

var utils = require('./utils');

// Generates a SELECT query from model
module.exports.select = function(q) {
  var sql = 'select';

  if(q._limit)
    sql += ' top ' + q._limit;

  if(q._fields === '*' || _.isEmpty(q._fields))
    sql += ' *';
  else
    sql += ' ' + _.map(q._fields, utils.quoteField).join(', ');

  if(q._into)
    sql += ' into ' + utils.quoteTable(q._into);

  if(!q._from)
    throw new Error('You must specify a FROM clause');

  sql += ' from ' + utils.quoteTable(q._from);

  if(!_.isEmpty(q._where)){
    sql += ' where ' + generateSearch(q._where);
  }

  if(!_.isEmpty(q._groupBy)){
    sql += ' group by ' + _.map(q._groupBy, utils.quoteField).join(', ');
  }

  if(!_.isEmpty(q._having)){
    sql += ' having ' + generateSearch(q._having);
  }

  if(!_.isEmpty(q._orderBy)){
    sql += ' order by ' + _.map(q._orderBy, function(criteria){
      var str = utils.quoteField(criteria.column);

      if(criteria.collation)
        str += ' collate ' + criteria.collation;
      if(criteria.order)
        str += ' ' + criteria.order.toLowerCase();

      return str;
    }).join(', ');
  }

  if(q._skip)
    sql += ' offset ' + q._skip + ' rows';

  return sql + ';';
};

// Generates an UPDATE query from model
module.exports.update = function(q) {
  var sql = 'update';

  if(q._limit)
    sql += ' top(' + q._limit + ')';

  if(!q._from)
    throw new Error('You must specify a FROM clause');

  sql += ' ' + utils.quoteTable(q._from);

  if(_.isEmpty(q._set))
    throw new Error('You must specify a SET clause');

  sql += ' set ' + generateSet(q._set);

  if(!_.isEmpty(q._where)) {
    sql += ' where ' + generateSearch(q._where);
  }

  return sql + ';';
};

// Generates an DELETE query from model
module.exports.delete = function(q) {
  var sql = 'delete';

  if(q._limit)
    sql += ' top(' + q._limit + ')';

  if(!q._from)
    throw new Error('You must specify a FROM clause');

  sql += ' from ' + utils.quoteTable(q._from);

  if(!_.isEmpty(q._where)) {
    sql += ' where ' + generateSearch(q._where);
  }

  return sql + ';';
};

// Generates an INSERT query from model
module.exports.insert = function(q) {
  var sql = 'insert';

  if(q._limit)
    sql += ' top(' + q._limit + ')';

  if(!q._into)
    throw new Error('You must specify an INTO clause');

  sql += ' into ' + utils.quoteTable(q._into);

  if(_.isEmpty(q._set))
    throw new Error('You must specify the insertion data');

  var data = generateInsert(q._set);

  sql += ' (' + data.columns.join(', ') + ')';
  sql += ' values (' + data.values.join(', ') + ')';

  return sql + ';';
};

/* Generates the WHERE or HAVING portion of a query */
var generateSearch = function(search) {
  return _.map(Object.keys(search), function(key){
    var value = search[key];
    if(key === '$or') {
      return '(' + _.map(value, generateSearch).join(' or ') + ')';
    }
    else if(_.isArray(value)) {
      if(!_.isEmpty(value))
        return utils.quoteField(key) + ' in (' +
          _.map(value, generateValue).join(', ') + ')';
    }
    else if(_.isObject(value) && value instanceof QueryParam) { // Simple search
      return utils.quoteField(key) + '=' + generateValue(value);
    }
    else if(_.isObject(value)){ // Compound search
      key = utils.quoteField(key);
      var params = [];
      _.each(value, function(v, op){
        var param = generateWhereOperator(key, op, v);
        if(param)
          params.push(param);
      });
      if(params.length === 1)
        return params[0];
      else if(params.length > 1)
        return '(' + params.join(' and ') + ')';
    }
  }).join(' and ');
};

/* Generates the SET portion of an UPDATE query */
var generateSet = function(updates) {
  return _.map(Object.keys(updates), function(key){
    var value = updates[key];

    if(_.isObject(value) && value instanceof QueryParam) { // Simple update
      return utils.quoteField(key) + '=' + generateValue(value);
    }
    else if(_.isObject(value)) { // Compound update
      key = utils.quoteField(key);
      var params = [], param;
      _.each(value, function(v, op){
        param = generateSetOperator(key, op, v);
        if(param)
          params.push(param);
      });
      return params.join(', ');
    }
    else if(value === '$currentDate'){
      return utils.quoteField(key) + '= GETDATE()';
    }
  }).join(', ');
};

/* Generates the data insertion portion of an INSERT query */
var generateInsert = function(data) {
  var columns = [], values = [];
  _.map(data, function(value, key) {
    columns.push(utils.quoteField(key));

    if(_.isObject(value) && value instanceof QueryParam) {
      values.push(generateValue(value));
    }
    else if(value === null){
      values.push('NULL');
    }
    else if(value === QueryParam.DEFAULT) {
      values.push('DEFAULT');
    }
    else if(value === '$currentDate'){
      values.push('GETDATE()');
    }
  });

  return { columns : columns, values : values };
};

/* Generates a value for the query.
   It only accepts QueryParam instances so far */
var generateValue = function(value){
  if(value instanceof QueryParam)
    return '@' + value.name;
  else
    throw new Error('Invalid value: ' + value + '. Must be a parameter');
};

/* Generates an expression containing an operator and their operands.
   Only suitable for WHERE and HAVING clauses */
var generateWhereOperator = function(key, op, value){
  switch(op){
    case '$gt':
      return key + '>' + generateValue(value);
    case '$gte':
      return key + '>=' + generateValue(value);
    case '$lt':
      return key + '<' + generateValue(value);
    case '$lte':
      return key + '<=' + generateValue(value);
    case '$in':
      return key + ' in (' + _.map(value, generateValue).join(', ') + ')';
    case '$nin':
      return key + ' not in (' + _.map(value, generateValue).join(', ') + ')';
    case '$ne':
      return key + '!=' + generateValue(value);
    case '$null':
      return key + ' is ' + (value ? '' : 'not ') + 'null';
  }
};

/* Generates an expression containing an operator and their operands.
   Only suitable for SET clauses */
var generateSetOperator = function(key, op, value){
  switch(op){
    case '$inc':
      return key + '+=' + generateValue(value);
    case '$dec':
      return key + '-=' + generateValue(value);
    case '$mul':
      return key + '*=' + generateValue(value);
    case '$div':
      return key + '/=' + generateValue(value);
    case '$mod':
      return key + '%=' + generateValue(value);
    case '$and':
      return key + '&=' + generateValue(value);
    case '$xor':
      return key + '^=' + generateValue(value);
    case '$or':
      return key + '|=' + generateValue(value);
  }
};
