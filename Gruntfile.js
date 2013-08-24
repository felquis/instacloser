module.exports = function (grunt) {
    'use strict';
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		connect: {
			server: {
				options: {
					port: 9001,
					keepalive : true,
                    base: 'app/'
				}
			}
		}
	});
	grunt.loadNpmTasks('grunt-contrib-connect');
	grunt.registerTask('server', ['connect:server']);
}