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
