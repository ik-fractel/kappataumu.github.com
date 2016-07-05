---
category: articles
description: "Custom Ubuntu Vagrant box for rapid Django web application development, using Cookiecutter Django for the Django project layout."
published: true
title: "Custom Vagrant box for jump-starting Django projects using Cookiecutter"
---

Being able to effortlessly bootstrap new [Django](https://www.djangoproject.com/) projects and quickly flesh out ideas is very important. It minimizes the effort spent on configuration minutiae, enabling us to focus on the actual task at hand. Haven't we all felt drained after a long tooling troubleshooting session, wanting to hit the sack instead of writing beautiful code? Let's see how to streamline things.

## A Vagrant box using Ubuntu

To begin with, we are going to use [Vagrant](https://www.vagrantup.com/) with a minimal `Vagrantfile`, to specify the details of our virtual machine (using the [ubuntu/trusty64 box](https://atlas.hashicorp.com/ubuntu/boxes/trusty64)). Two ports will be forwarded, `8000` for the web server and `35729` for [LiveReload](http://livereload.com/).

<script src='https://gitembed.com/https://github.com/kappataumu/vagrant-django-cookie-dough/blob/master/Vagrantfile?lexer=rb'></script>
<noscript><a href='https://github.com/kappataumu/vagrant-django-cookie-dough/blob/master/Vagrantfile'>https://github.com/kappataumu/vagrant-django-cookie-dough/blob/master/Vagrantfile</a></noscript>

The rest of the configuration will be delegated to a simple Bash shell script ([cookiestrap.sh](https://github.com/kappataumu/vagrant-django-cookie-dough/blob/master/cookiestrap.sh)) to provision a self-contained, local development machine. At the top of the file, a number of variables should be customized for each project:

```bash
domain_name="example.com"
project_slug="cookiestrap"
db_user='db_user'
db_password='db_pass'
``` 

## Provisioning and configuration

We'll use [pyenv](https://github.com/yyuu/pyenv) and [pyenv-virtualenv](https://github.com/yyuu/pyenv-virtualenv) to compile, install and manage the latest Python and a new virtualenv for our project respectivelly. 

For the Django app, [Cookiecutter Django](https://github.com/pydanny/cookiecutter-django) will be used. It is an opinionated, production-ready Django project template that readers of [Two Scoops of Django](https://www.twoscoopspress.com/products/two-scoops-of-django-1-8) are probably familiar with. This should also serve as a practical introduction to [Cookiecutter](https://github.com/audreyr/cookiecutter), a command-line utility that creates projects from cookiecutters (project templates) which you can use as a shortcut for any kind of project. 

Cookiecutter Django has a number of configuration parameters, usually set interactively. They are available in [cookiecutter.json](https://github.com/pydanny/cookiecutter-django/blob/master/cookiecutter.json):

<script src='https://gitembed.com/https://github.com/pydanny/cookiecutter-django/blob/master/cookiecutter.json'></script>
<noscript><a href='https://github.com/pydanny/cookiecutter-django/blob/master/cookiecutter.json'>https://github.com/pydanny/cookiecutter-django/blob/master/cookiecutter.json</a></noscript>

Before instantiating your virtual machine, you should configure `cookiecutter_options` in `cookiestrap.sh` according to the above. A minimal set of defaults is provided to get you started, with as few dependencies as possible:

```bash
cookiecutter_options=(
    "project_name=My project name"
    "project_slug=$project_slug"
    "author_name=Your Name"
    "email=Your email"
    "description=A short description of the project."
    "domain_name=$domain_name"
    "version=0.1.0"
    "timezone=UTC"
    "use_whitenoise=y"
    "use_celery=n"
    "use_mailhog=n"
    "use_sentry_for_error_reporting=n"
    "use_opbeat=n"
    "use_pycharm=n"
    "windows=n"
    "use_python2=n"
    "use_docker=n"
    "use_heroku=n"
    "js_task_runner=Grunt"
    "use_lets_encrypt=n"
)
``` 

To wrap things up, we'll install and configure PostgreSQL and [Grunt](http://gruntjs.com/) (to provide automatic [Sass/SCSS](http://sass-lang.com/) recompilation and push notifications to the [LiveReload browser extension](http://livereload.com/extensions/)). Finally, we'll serve the app using Django's development server.

The provisioning script in its entirety:

<script src='https://gitembed.com/https://github.com/kappataumu/vagrant-django-cookie-dough/blob/master/cookiestrap.sh'></script>
<noscript><a href='https://github.com/kappataumu/vagrant-django-cookie-dough/blob/master/cookiestrap.sh'>https://github.com/kappataumu/vagrant-django-cookie-dough/blob/master/cookiestrap.sh</a></noscript>

## Setting off on your own

You can now set off on your own, by cloning the project's [repository](https://github.com/kappataumu/vagrant-django-cookie-dough) and editing `cookiestrap.sh`:

```
$ git clone https://github.com/kappataumu/vagrant-django-cookie-dough
$ cd vagrant-django-cookie-dough
$ vim cookiestrap.sh
$ # Edit domain_name, project_slug, db_user, db_password and cookiecutter_options
$ vagrant up
```

As soon as the machine is brought up, browse to [http://localhost:8000](http://localhost:8000) to see the live website.

Inside the VM, you can find all the things in `/srv/www/$domain_name/`, which has been mapped locally to the `www/$domain_name/` subfolder of the repository. It is in the locally mapped folder that any file editing will take place. If you've installed and enabled the LiveReload extension for your browser, the page will automatically be refreshed every time you edit and save a file.

Log files are kept in `$domain_name/logs/`, capturing the output of the Django development web server and Grunt. If anything goes wrong, you can poke around:

```
$ vagrant ssh
$ less -S +F /srv/www/$domain_name/logs/runserver.log
$ less -S +F /srv/www/$domain_name/logs/taskrunner.log
```
