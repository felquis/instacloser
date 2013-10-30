module.exports = function (grunt) {
    'use strict';

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        connect: {
            server: {
                options: {
                    port: 8080,
                    keepalive : true,
                    base: 'app/',
                    hostname: '*'
                }
            }
        },
        jslint: {
            node: {
                src: ['Gruntfile.js'],
                directives: {
                    node: true,
                    indent: 4
                }
            },
            client: {
                src: ['app/js/{,*}/*.js'],
                directives: {
                    browser: true,
                    indent: 4,
                    devel: true
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-jslint');

    grunt.registerTask('server', ['jslint', 'connect:server']);
    grunt.registerTask('build', ['jslint']);
};