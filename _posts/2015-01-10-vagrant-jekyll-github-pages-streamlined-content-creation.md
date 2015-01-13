---
author_twitter: kappataumu
author: kappataumu
category: articles
description: "Vagrant can be an absolute lifesaver for developers. It is lightweight, available everywhere (Linux, Mac, Windows), and can do wonders for your productivity by allowing you to easily compartmentalize diverse development environments."
layout: nouveau_article
published: true
title: "Vagrant, Jekyll and Github Pages for streamlined content creation"
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

```bash
#!/bin/bash
# This provisioning script has been derived from VVV.

CLONEREPO='https://github.com/kappataumu/kappataumu.github.com.git'
CLONEDIR="$(basename $CLONEREPO)"

start_seconds="$(date +%s)"
echo "Welcome to the initialization script."

ping_result="$(ping -c 2 8.8.4.4 2>&1)"
if [[ $ping_result != *bytes?from* ]]; then
	echo "Network connection unavailable. Try again later."
    exit 1
fi

apt_package_check_list=(
    vim
    curl
    git-core
    nodejs
)

# Loop through each of our packages that should be installed on the system. If
# not yet installed, it should be added to the array of packages to install.
apt_package_install_list=()
for pkg in "${apt_package_check_list[@]}"; do
	package_version="$(dpkg -s $pkg 2>&1 | grep 'Version:' | cut -d " " -f 2)"
	if [[ -n "${package_version}" ]]; then
		space_count="$(expr 20 - "${#pkg}")" #11
		pack_space_count="$(expr 30 - "${#package_version}")"
		real_space="$(expr ${space_count} + ${pack_space_count} + ${#package_version})"
		printf " * $pkg %${real_space}.${#package_version}s ${package_version}\n"
	else
		echo " *" $pkg [not installed]
		apt_package_install_list+=($pkg)
	fi
done


# If there are any packages to be installed in the apt_package_list array,
# then we'll run `apt-get update` and then `apt-get install` to proceed.
if [[ ${#apt_package_install_list[@]} = 0 ]]; then
    echo -e "No apt packages to install.\n"
else

    # Provides add-apt-repository (including for Ubuntu 12.10)
    sudo apt-get update --assume-yes > /dev/null
    sudo apt-get install --assume-yes python-software-properties
    sudo apt-get install --assume-yes software-properties-common

    sudo add-apt-repository -y ppa:git-core/ppa

    # Needed for nodejs
    curl -sL https://deb.nodesource.com/setup | sudo bash -

    sudo apt-get update --assume-yes > /dev/null

    # install required packages
    echo "Installing apt-get packages..."
    sudo apt-get install --assume-yes ${apt_package_install_list[@]}
    sudo apt-get clean
fi

# http://rvm.io/rvm/install
gpg --keyserver hkp://keys.gnupg.net --recv-keys D39DC0E3
\curl -sSL https://get.rvm.io | bash -s stable --ruby
source ~/.rvm/scripts/rvm

# https://github.com/github/pages-gem
gem install github-pages

# Preemptively accept Github's SSH fingerprint, but only
# if we previously haven't done so.
fingerprint="$(ssh-keyscan -H github.com)"
if ! grep -qs "$fingerprint" ~/.ssh/known_hosts; then
    echo "$fingerprint" >> ~/.ssh/known_hosts
fi

# Vagrant should've created /srv/www according to the Vagrantfile,
# but let's make sure it exists even if run directly.
if [[ ! -d '/srv/www' ]]; then
    sudo mkdir '/srv/www'
fi

# Time to pull the repo. If the directory is there, we do nothing,
# since git should be used to push/pull commits instead.
if [[ ! -d "$CLONEDIR" ]]; then
    git clone "$CLONEREPO" "$CLONEDIR"
fi

# Now, for the Jekyll part
cd "$CLONEDIR"
jekyll serve --detach

end_seconds="$(date +%s)"
echo "-----------------------------"
echo "Provisioning complete in "$(expr $end_seconds - $start_seconds)" seconds"
```

Replace `CLONEREPO` as you see fit. You could, for example, explore [@mojombo's site](http://tom.preston-werner.com/) by specifying:

```bash
$ CLONEREPO='https://github.com/mojombo/mojombo.github.io.git'
```

`bootstrap.sh` will fetch, build and install the needed packages, clone the specified repository and have Jekyll serve it. Nothing fancy. But still, this would require setting up a new VM/droplet/EC2 instance, or further complicating the setup of your main development machine.

Vagrant takes this pain away; a very concise `Vagrantfile` is all that's needed:

```ruby
# -*- mode: ruby -*-
# vi: set ft=ruby :

# Vagrantfile API/syntax version. Don't touch unless you know what you're doing!
VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|

  # Every Vagrant virtual environment requires a box to build off of.
  config.vm.box = "hashicorp/precise32"
  config.vm.hostname = "jekyll"
  config.vm.define "github-pages" do |base|
  end

  # Throw in our provisioning script
  config.vm.provision "shell", path: "bootstrap.sh", privileged: false

  # Map localhost:4000 to port 4000 inside the VM
  config.vm.network "forwarded_port", guest: 4000, host: 4000
  config.vm.network "private_network", ip: "192.168.3.33"

  # Create a shared folder between guest and host
  config.vm.synced_folder "www/", "/srv/www", create: true

  config.ssh.forward_agent = true

  # VirtualBox-specific configuration
  config.vm.provider "virtualbox" do |v|
    v.customize ["modifyvm", :id, "--memory", 512]
    v.customize ["modifyvm", :id, "--natdnshostresolver1", "on"]
    v.customize ["modifyvm", :id, "--natdnsproxy1", "on"]
  end

end
```

Just like that, a suitable VM is brought up for you, port forwarding is arranged and the repo folder is exposed to the host. We can edit the files in the repository with our favorite editor, and browse to [http://localhost:4000](http://localhost:4000) to preview the results.

You can try this immediately by cloning the [companion repository i've put up on GitHub](https://github.com/kappataumu/vagrant-up-github-pages) and running `vagrant up` inside the repository directory:

```bash
$ git clone https://github.com/kappataumu/vagrant-up-github-pages
$ vagrant up
```
