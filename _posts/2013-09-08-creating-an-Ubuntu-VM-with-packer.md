---
author_twitter: kappataumu
author: kappataumu
category: articles
layout: nouveau_article
published: true
---

Trying to build a simple Ubuntu image was not without digging around, even though the documentation at www.packer.io would lead you to believe everything is quite straightforward. If you were looking for a concrete example of creating an Ubuntu 12.04 LTS image with Packer, this should be a straightforward guide to get you up and running fast.

![packer_splash.jpg](/_posts/packer_splash.jpg)

Packer is driven by template files, so the first thing we need to do is create a Packer template. These are JSON documents that let Packer know what you want built, and how (and other things that are outside the scope of this guide). There can be a few discrete sections in each template, but let’s focus on the most prominent one. Instantiating a “builder” (in our case a VirtualBox builder) to create a VirtualBox image.

Roughly speaking, the building process takes an ISO you have specified and uses it to create a full-blown installation of the OS. This is accomplished by mounting the ISO, booting off it, dealing with the OS installer initial UI, and proceeding with an unattended installation. If everything goes well, we then have a functional, bootable VM image. 

The crucial parts here are two:

* Dealing with the Ubuntu installer initial UI.
* Completing a hands-off installation.

Both issues can be dealt with the boot_command option. 

This is an array of commands that are sent to the graphical Ubuntu installer as if you were typing them at a physical keyboard. In our case, we need to bypass the graphical installer (by typing <esc><esc><enter>), drop to the boot prompt and then type some configuration directives there. 

One of these commands will instruct the Ubuntu installer to fetch a preconfiguration file (preseed.cfg) from the web, that will automatically provide answers to the installer prompts, thus automating the installation in its entirety. You can find more information on preseeding here [1] and here [2]. Of course this file will have to be created and tailored to your needs and then uploaded somewhere. You will find a fully working example further below.

Do note that due to missing CA certs, the preconfiguration file is best served from a non-https URL [3]. Keep this in mind if you were thinking of simply hosting it off a GitHub repo.

Now, armed with this information, we start by creating the Packer template. Let’s name it ubuntu_64.json and place it in the same directory as Packer itself. Take a look at mine: 

```json
{
    "variables": {
        "ssh_name": "kappataumu",
        "ssh_pass": "kappataumu",
        "preseed" : "http:/example.com/ubuntu/preseed.cfg",
        "hostname": "packer-test"
    },

    "builders": [{
        "type": "virtualbox",
        "guest_os_type": "Ubuntu_64",

        "disk_size" : 10000,

        "iso_url": "http://releases.ubuntu.com/precise/ubuntu-12.04.3-server-amd64.iso",
        "iso_checksum": "2cbe868812a871242cdcdd8f2fd6feb9",
        "iso_checksum_type": "md5",

        "ssh_username": "{{user `ssh_name`}}",
        "ssh_password": "{{user `ssh_pass`}}",
        "ssh_wait_timeout": "20m",

        "shutdown_command": "echo {{user `ssh_pass`}} | sudo -S shutdown -P now",

        "boot_command" : [
            "<esc><esc><enter><wait>",
            "/install/vmlinuz noapic ",
            "preseed/url={{user `preseed`}}",
            "debian-installer=en_US auto locale=en_US kbd-chooser/method=us ",
            "hostname={{user `hostname`}}",
            "fb=false debconf/frontend=noninteractive ",
            "keyboard-configuration/modelcode=SKIP keyboard-configuration/layout=USA ",
            "keyboard-configuration/variant=USA console-setup/ask_detect=false ",
            "initrd=/install/initrd.gz -- <enter>"
        ]
    }]
}
```

Remember that you can always validate the correctness of the template by running packer validate ubuntu_64.json

Next, the file used to preseed the installer:


