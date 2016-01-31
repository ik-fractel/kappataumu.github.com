module.exports = function(grunt) {
  grunt.initConfig({
        less: {
            options: {
                paths: ['nouveau/css'],
                plugins: [
                  new (require('less-plugin-clean-css'))({
                    advanced: true,
                    keepSpecialComments: 0,
                    processImport: true,
                  })
                ],
                optimization: 2,
            },
            dist: {
              files: {
                  "nouveau/css/main.css": "nouveau/css/main.less"
              }
            }
        },
        watch: {
            styles: {
               options: {
                    spawn: false,
                    event: ["added", "deleted", "changed"]
                },
                files: [ "nouveau/css/*.css", "nouveau/css/*.less" ],
                tasks: [ "less:dist" ]
            }
        }
    });

    grunt.loadNpmTasks("grunt-contrib-less");
    grunt.loadNpmTasks("grunt-contrib-watch");

    // the default task can be run just by typing "grunt" on the command line
    grunt.registerTask("default", ["watch"]);
};
