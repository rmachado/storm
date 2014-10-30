'use strict';

module.exports = function (grunt) {

  grunt.loadNpmTasks('grunt-doxx');

    grunt.initConfig({
      doxx: {
        all: {
          src: 'lib/',
          target: 'docs',
          options: {
            title: 'Simple TDS ORM - Documentation'
          }
        }
      }
    });
};
