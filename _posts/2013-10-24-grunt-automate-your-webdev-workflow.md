---
author_twitter: kappataumu
author: kappataumu
category: articles
description: "A very basic Grunt tutorial for web developers: Automating LESS compilation as monitored files change."
title: "Simple automation for web developers, using Grunt"
layout: nouveau_article
published: true
---

[Grunt, the JavaScript task runner](http://gruntjs.com/), is an excellent tool to automate boring, repetitive stuff. With a plethora of plugins, and a thriving community around it, you'll find it's a great weapon for your webdev arsenal. I'd go as far as saying that it's invaluable for any moderately complex web project. Once you spend a bit of time on it, you'll be able to compile your LESS, concatenate, compress and optimize your CSS, minify and combine your JavaScript files, keep separate builds for production and development, deploy your kids to school after they have breakfast and even more!


Let's begin by installing some needed tools.

###Install node.js

```bash
$ cd ~
$ wget http://nodejs.org/dist/v0.10.21/node-v0.10.21.tar.gz
$ tar -xvzf node-v0.10.21.tar.gz
$ cd node-v0.10.21/
$ ./configure
$ make
$ sudo make install
$ node -v
```


###Install Grunt

```bash
$ sudo npm install grunt-cli
$ sudo npm install grunt
```

Now, in order to do anything useful we must install Node modules for the tasks we envision to use Grunt for. For instance, if we are using [LESS](http://lesscss.org/), a good starting point would be a module for automatic compilation of LESS stylesheets to plain CSS every time the `.less` file is saved.

These Node modules (essentially [Grunt plugins](http://gruntjs.com/plugins)) will be catalogued by `npm` during their installation in a file named `package.json` inside the root of our project. Let’s create this file, with the following contents:

```json
{
  "name": "my-project-name",
  "version": "0.1.0",
  "devDependencies": {
    "grunt": "~0.4.1"
  }
}
```

Perusing the popular Node plugins, we need to locate something to monitor our `.less` files for changes and then automatically compile them to `.css`. The following seem up to the task:

* [grunt-contrib-less](https://github.com/gruntjs/grunt-contrib-less) seems appropriate for compiling less using Grunt.
* [grunt-contrib-watch](https://github.com/gruntjs/grunt-contrib-watch) ditto for watching over our files using Grunt.

Intuitively, we also need to install the actual LESS compiler, `lessc`. Let’s start with that:

```bash
sudo npm install -g less
lessc --version
```

Next, installation of the two Grunt plugins we located earlier:

```bash
npm install grunt-contrib-less --save-dev
npm install grunt-contrib-watch --save-dev
```

The `--save-dev` parameter captures our dependency on this plugin in `package.json`. Here is what it looks like after installing the plugins:

```json
{
  "name": "my-project-name",
  "version": "0.1.0",
  "devDependencies": {
    "grunt": "~0.4.1",
    "grunt-contrib-less": "~0.8.0",
    "grunt-contrib-watch": "~0.5.3"
  }
}
```

Commit `package.json` in git along with your other files. When starting afresh, say on a new development VM, installing all your plugins is only one `npm install` away, executed inside your project’s root directory.

Now let’s move on to `Gruntfile.js`, the actual configuration of Grunt. First, create it:

```javascript
module.exports = function(grunt) {
  grunt.initConfig({
     // named tasks will go here
  });

grunt.loadNpmTasks('grunt-contrib-less');
grunt.loadNpmTasks('grunt-contrib-watch');

// the default task can be run just by typing "grunt" on the command line
grunt.registerTask('default', ['watch']);

};
```

Okay, now we’ll configure our two tasks, `watch` and `less`. Remember, these will be placed in `Gruntfile.js` at the appropriate section as indicated by my comment. First, `less`:

```
less: {
  options: {
    compress: true,
    yuicompress: true,
    optimization: 2
  },
  files: {
    "assets/public/result.css": "assets/private/css/source.less"
  }
}
```

This is a very simple task, which when run will simply compile `source.less` into `result.css`.

We’ll use the second task, `watch`, to invoke `less` when the any `.css` or `.less` files change within the specified monitored directory:

```
watch: {
    styles: {
        options: {
    		spawn: false
        },
        files: [ "assets/public/css/*.css": "assets/public/css/*.less"],
        tasks: [ "less" ]
    }
}
```

It’s quite simple, isn’t it? Here is the completed `Gruntfile.js` in all its glory:

```javascript
module.exports = function(grunt) {
  grunt.initConfig({
        less: {
            options: {
                compress: true,
                yuicompress: true,
                optimization: 2
            },
            files: {
                "assets/public/result.css": "assets/private/css/source.less"
            }
        },
        watch: {
            styles: {
               options: {
                    spawn: false,
                    event: ["added", "deleted", "changed"]
                },
                files: [ "assets/public/css/*.css": "assets/public/css/*.less"],
                tasks: [ "less" ]
            }
        }
    });

    grunt.loadNpmTasks("grunt-contrib-less");
    grunt.loadNpmTasks("grunt-contrib-watch");

    // the default task can be run just by typing "grunt" on the command line
    grunt.registerTask("default", ["watch"]);
};
```

Expanding on this very basic example should not be too difficult. Start slowly, focus on one task at a time and progressively automate away all your grunt work.