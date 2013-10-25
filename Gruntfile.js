module.exports = function(grunt) {
  grunt.initConfig({
        less: {
            options: {
                compress: true,
                yuicompress: true,
                optimization: 2
            },
            files: { 
                "nouveau/css/main.css": "nouveau/css/main.less"
            }
        },
        watch: {
            styles: {
               options: {
                    spawn: false,
                    event: ["added", "deleted", "changed"]
                },
                files: [ "nouveau/css/*.css", "nouveau/css/*.less" ],
                tasks: [ "less" ]
            }
        }
    });

    grunt.loadNpmTasks("grunt-contrib-less");
    grunt.loadNpmTasks("grunt-contrib-watch");

    // the default task can be run just by typing "grunt" on the command line
    grunt.registerTask("default", ["watch"]);
};

