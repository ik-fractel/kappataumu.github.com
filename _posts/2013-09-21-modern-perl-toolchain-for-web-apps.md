---
category: articles
description: "A modern Perl toolchain sing plenv, cpanm and carton to manage and deploy Perl web apps, version controlled with Git."
published: true
title: "Modern Perl toolchain for Git managed web apps"
updated: 2014-10-30
---

Separation of concerns has always been a key issue for me as a developer, often going to great lengths for compartmentalization and clearly defined boundaries. A macro example of this is using VMs for development; it has improved my productivity immensely because the host OS is decoupled from the dependencies of the projects I am working on.

But this also trickles down inside VMs. Working with Linux, i’ve found that keeping the system as pristine as possible after installation is a good thing. When working with Perl, I set the following objectives:

1. Leave the system Perl alone.
2. Install any Perl I choose.
    - And even switch between installed Perls
    - Either globally or on a per-project page
3. Manage Perl module dependencies within the project’s git repo.

If you were uncertain about getting into all this trouble because it might be complicated, I assure you it’s easier than you think, even if you are a beginner. And the benefits are worth it. Read on.

These objectives can be satisfied with a modern breed of Perl tools, that take their inspiration from the paradigms of other languages with an established toolchain geared towards isolation and, well, keeping related things together.

### Brief tool introduction

[plenv](https://github.com/tokuhirom/plenv): Bash script that installs the Perl of your liking, contained inside your home directory. Can also be used to specify a per-project Perl version. Depends on nothing.

[cpanminus](https://github.com/miyagawa/cpanminus): A lightweight, dependency-free alternative to get, unpack, build and install  modules from CPAN.

[carton](https://github.com/miyagawa/carton/): A module dependency manager for Perl. Installs the modules for your project inside the project’s directory.


Examples are great for understanding how such things come into play. Here i’ll briefly  outline the process of creating and managing a simple Perl web app with plenv, cpanm and Carton. Mojolicious will be used for the web part.

First of all we need to install everything. I’ll be using Ubuntu 12.0.4 LTS as the OS.

### Installing plenv and our own Perl

```bash
$ git clone git://github.com/tokuhirom/plenv.git ~/.plenv
$ echo 'export PATH="$HOME/.plenv/bin:$PATH"' >> ~/.profile
$ echo 'eval "$(plenv init -)"' >> ~/.profile
$ exec $SHELL -l
$ git clone git://github.com/tokuhirom/Perl-Build.git ~/.plenv/plugins/perl-build/
$ plenv install 5.18.0
$ plenv rehash
$ plenv global 5.18.0
```
At this point we have Perl 5.18.0 installed in our home directory but aren’t using it anywhere. The system’s Perl is intact. Moving on.

## Installing cpanminus
```bash
$ plenv install-cpanm
```
Note that this installs cpanm into the current global Perl. As you saw above, I've set this to Perl 5.18.0 which resides in our home directory and is managed by `plenv`. If for any reason you revert to the system Perl and try to execute `cpanm`, `plenv` will warn you that it is not available (and show which Perl you'll need to switch to, to get it).

```bash
$ cpanm
plenv: cpanm: command not found

The `cpanm' command exists in these Perl versions:
  5.18.0
```

## Installing Carton
```bash
$ cpanm Carton
```


Alright, now our kit is complete. Let’s create a directory structure to house our Mojolicious web app.

```bash
$ mkdir /srv/www
$ mkdir /srv/www/web_app
$ cd /srv/www/web_app
```

We are going to use `plenv` to dictate that the project that resides in this directory must use Perl 5.18.0 (remember it was installed earlier):

```bash
$ plenv local 5.18.0
```

This command creates a `.perl-version` file in the project’s root that signals to `plenv` which Perl to load when Perl is invoked from within that directory:

```bash
$ cat .perl-version
5.18.0
```

To convince yourself this Perl juggling is actually working, execute `perl -v` inside the project’s directory, immediately step out and re-issue `perl -v`. You should see that the versions are indeed different.

Now we’ll use `carton` to install Mojolicious. But we can’t invoke `carton` directly for this. We must first create a special file, a `cpanfile`, which describes which modules we want and even their desired versions.

```bash
$ echo 'requires "Mojolicious", "4.39";' >> cpanfile
$ carton install
Installing modules using /srv/www/web_app/cpanfile
Successfully installed Mojolicious-4.40
1 distribution installed
Complete! Modules were installed into /srv/www/web_app/local
```


This builds the Mojolicious module inside a newly created directory, `local`, which we’ll exclude from version control. `carton` also created `cpanfile.snapshot`.

```bash
$ echo local/ >> .gitignore
```

We now construct a dummy Mojolicious app, `web-app.pl`, so that we can subsequently test if everything works as expected:

```perl
use Mojolicious::Lite;

get '/:foo' => sub {
  my $self = shift;
  my $foo  = $self->param('foo');
  $self->render(text => "Hello from $foo.");
};

app->start;
```

And this is our project directory so far:

```bash
$ ls -m1
cpanfile
cpanfile.snapshot
local
web-app.pl
```

Let’s initialize a Git repo and commit everything:

```bash
$ git init
$ git add .
$ git status
# On branch master
#
# Initial commit
#
# Changes to be committed:
#   (use "git rm --cached <file>..." to unstage)
#
#       new file:   .gitignore
#       new file:   .perl-version
#       new file:   cpanfile
#       new file:   cpanfile.snapshot
#       new file:   web-app.pl
#
$ git commit -m “Initial commit”
```

Okay, so everything is set. We’ll now use `carton` to bootstrap our Mojolicious web app:

```bash
$ carton exec perl web-app.pl daemon
[XXX Sep XX 11:34:22 2013] [info] Listening at "http://*:3000".
Server available at http://127.0.0.1:3000.
```

Success! Next time we’ll see how `carton` can also help with deploying this application to other machines.
