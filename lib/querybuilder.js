'use strict';

var _ = require('underscore'),
    tedious = require('tedious');

var utils = require('./utils');

// Generate a SELECT query from model
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

var generateSearch = function(where) {
  return _.map(Object.keys(where), function(key){
    var value = where[key];
    if(key === '$or')
      return '(' + _.map(value, generateSearch).join(' or ') + ')';
    else
      return utils.quoteField(key) + '=@' + value.name;
  }).join(' and ');
};
