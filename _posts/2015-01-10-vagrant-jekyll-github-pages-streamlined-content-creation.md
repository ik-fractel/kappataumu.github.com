---
category: articles
description: "Vagrant can be an absolute lifesaver for developers. It is lightweight, available everywhere (Linux, Mac, Windows), and can do wonders for your productivity by allowing you to easily compartmentalize diverse development environments."
published: true
title: "Vagrant, Jekyll and Github Pages for streamlined content creation"
updated: 2015-12-31
---

[Vagrant](https://www.vagrantup.com/) can be an absolute lifesaver for developers. It is lightweight, available everywhere (Linux, Mac, Windows), and can do wonders for your productivity by allowing you to easily compartmentalize diverse development environments.

As you probably know, [GitHub](https://github.com/) has a feature called [GitHub pages](https://pages.github.com/) that allows you to host your static website, for free, from a public repo. Whenever you push to that repo, the website is rebuilt, instantly available. And if you want to get fancy, they even support [Jekyll](http://jekyllrb.com/). The website you are currently reading has been created this way.

Our goal is to configure a local GitHub Pages server, inside a disposable and trivially instantiable environment, managed by Vagrant. If you don't have a suitable repository, you can [create one in a couple of clicks](https://pages.github.com/). If you can't be bothered, no worries, you can check out mine.

We'll need Vagrant installed on the host. And for the guest:

* A recent [Ruby](https://www.ruby-lang.org/en/) ([RVM](https://rvm.io/) to the rescue)
* [nodejs](http://nodejs.org/) (required by Jekyll)
* The [github-pages gem](https://github.com/github/pages-gem)
* Some provisioning glue

Now it's time to install the packages and configure the host.

[Chef](https://www.chef.io/), [Puppet](http://puppetlabs.com/), [Ansible](http://www.ansible.com/home) and other provisioning tools allow us to capture and even version control this process. Vagrant can pick up from there, using the generated artifacts (recipes, manifests, what-have-you) to automatically create an identical environment.

For our very simple purposes though, a bash script will suffice. I've only added a few bells and whistles so that re-provisioning is graceful. Let's name the script `bootstrap.sh`:

<script src='https://gitembed.com/https://github.com/kappataumu/vagrant-up-github-pages/blob/master/bootstrap.sh?lexer=bash'></script>
<noscript><a href='https://github.com/kappataumu/vagrant-up-github-pages/blob/master/bootstrap.sh'>https://github.com/kappataumu/vagrant-up-github-pages/blob/master/bootstrap.sh</a></noscript>

`bootstrap.sh` will fetch, build and install the needed packages, clone the specified repository and have Jekyll serve it. Nothing fancy. But still, this would require setting up a new VM/droplet/EC2 instance, or further complicating the setup of your main development machine.

Vagrant takes this pain away; a very concise `Vagrantfile` is all that's needed:

<script src='https://gitembed.com/https://github.com/kappataumu/vagrant-up-github-pages/blob/master/Vagrantfile?lexer=rb'></script>
<noscript><a href='https://github.com/kappataumu/vagrant-up-github-pages/blob/master/Vagrantfile'>https://github.com/kappataumu/vagrant-up-github-pages/blob/master/Vagrantfile</a></noscript>

Just like that, a suitable VM is brought up for you, port forwarding is arranged and the repo folder is exposed to the host. We can edit the files in the repository with our favorite editor, and browse to [http://localhost:4000](http://localhost:4000) to preview the results.

You can try this immediately by cloning the [companion repository I've put up on GitHub](https://github.com/kappataumu/vagrant-up-github-pages), like so (make sure you set `REPO` to your own repository):

```bash
$ git clone https://github.com/kappataumu/vagrant-up-github-pages.git
$ cd vagrant-up-github-pages
$ export REPO='https://github.com/kappataumu/kappataumu.github.com.git'
$ vagrant up
```

If you found this interesting, you should also check out this other post of mine, [Packer: In 10 minutes, from zero to bootable VirtualBox Ubuntu 12.04](http://kappataumu.com/articles/creating-an-Ubuntu-VM-with-packer.html). By enabling the appropriate post-processor, you can use Packer to [create your own images for Vagrant](https://www.packer.io/intro/getting-started/vagrant.html).
