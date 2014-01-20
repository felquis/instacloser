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
            },
            dev: {
                options: {
                    port: 8080,
                    keepalive : true,
                    base: '.temp/',
                    hostname: '*'
                }
            },
            buildtest: {
                options: {
                    port: 8080,
                    keepalive : true,
                    base: 'build/',
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
                exclude: ['app/js/jquery.*.js'],
                directives: {
                    browser: true,
                    indent: 4,
                    devel: true,
                    debug: true,
                    predef: ['$']
                }
            }
        },
        env: {
            dev: {
                NODE_ENV: 'development'
            },
            build: {
                NODE_ENV: 'production'
            }
        },
        preprocess : {
            options: {
                context : {
                    DEBUG: true
                }
            },
            dev: {
                src : 'app/index.html',
                dest : '.temp/index.html',
                options: {
                    context : {
                        instagram_client_id: 'a2dadbd1d44f4e4a869d3fd3ab8543fc',
                        instagram_redirect_uri: 'http://localhost:8080/'
                    }
                }
            },
            build: {
                src : 'app/index.html',
                dest : 'build/index.html',
                options: {
                    context : {
                        instagram_client_id: '05d5219366e24a3bb9f4d7eec6427e52',
                        instagram_redirect_uri: 'http://instacloser.joel-ipsum.com/'
                    }
                }
            }
        },
        copy: {
            dev: {
                expand: true,
                cwd: 'app/',
                src: '**',
                dest: '.temp/'
            },
            build: {
                expand: true,
                cwd: '.temp/',
                src: '**',
                dest: 'build/'
            }
        },
        clean: ['.temp', 'build']
    });

    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-jslint');
    grunt.loadNpmTasks('grunt-preprocess');
    grunt.loadNpmTasks('grunt-env');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-clean');

    grunt.registerTask('default', ['env:dev', 'jslint', 'clean', 'copy:dev', 'preprocess:dev', 'connect:dev']);
    grunt.registerTask('build', ['env:build', 'jslint', 'clean', 'copy:build', 'preprocess:build']);
};