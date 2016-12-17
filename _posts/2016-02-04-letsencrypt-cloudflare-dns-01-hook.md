---
category: articles
description: "How to get free SSL certificates from Let's Encrypt utilizing the letsencrypt.sh ACME client with a dns-01 challenge and a custom CloudFlare hook."
published: true
title: "From StartSSL to Let's Encrypt, using CloudFlare DNS"
---

End-to-end encryption is a great thing for the web, even if the current system is [fundamentally broken](https://www.youtube.com/watch?v=Z7Wl2FW2TcA). I'm not going to bore you with all the nitty-gritty details, since I'm pretty sure that if you're reading this we're in agreement, possibly on both accounts. What's important is that [Let's Encrypt](https://letsencrypt.org/) eliminated the monetary cost of acquiring SSL certificates.

But how did we get here?

Google got the ball rolling with the SSL-only SPDY protocol [way back in 2009](http://googleresearch.blogspot.gr/2009/11/2x-faster-web.html). It became clear then that performance and security were to be on equal grounds. The community agreed, and HTTP/2 was born in 2012 by forking SPDY and building upon it. Fast forward to early 2016, and Chrome is replacing SPDY with HTTP/2. All browsers are on board, opting for HTTP/2 support solely over SSL, making encryption the future of the web.

Meanwhile CloudFlare, serving a significant chunk of global traffic, jumped on board in September 2014, with the [announcement of Universal SSL](https://blog.cloudflare.com/introducing-universal-ssl/). This meant  you could have your SSL website delivered worldwide for $0 instead of $20/month. They even allowed you to use a self-signed cert, which effectively meant end-to-end encryption at no cost (but this was a crutch, since you would always depend on CloudFlare's goodwill to mask your certificate in order to prevent [browser warnings](https://static.googleusercontent.com/media/research.google.com/en/pubs/archive/43265.pdf)).

The missing piece of the puzzle was a Certificate Authority (CA) that could issue valid certificates, for free.

This is where [StartSSL](https://www.startssl.com/) came into the picture. By providing free domain validated (DV) certificates for up to a year (and unlimited manual re-issuings) they stood out in a field criticized by many for providing little value at significant cost. The catch? [Non-commercial use only](https://www.startssl.com/policy.pdf).

On December 2015 Let's Encrypt [entered public beta](https://letsencrypt.org/2015/12/03/entering-public-beta.html), marking the end of an era. Now anyone can have free domain validated certificates, even for commercial use.


## Dealing with the technicalities of Let's Encrypt

An interesting decision by Let's Encrypt was to limit the lifetime of certificates to 90 days, in order to [encourage automation and mitigate potential security risks from key compromise](https://letsencrypt.org/2015/11/09/why-90-days.html). This means that interacting with their infrastructure becomes a common affair for most devops folk, and makes selecting the proper client important.

You have a [plethora of clients](https://community.letsencrypt.org/t/list-of-client-implementations/2103) that conform to the [ACME spec](https://github.com/ietf-wg-acme/acme/) to choose from, including the official one. Here, I'll be using [letsencrypt.sh](https://github.com/lukas2511/letsencrypt.sh), for which I've written a [custom hook for CloudFlare](https://github.com/kappataumu/letsencrypt-cloudflare-hook) that enables us to use DNS records instead of a web server to complete the whole process. This means we'll be using the `dns-01` challenge instead of `http-01`, so that [Boulder](https://github.com/letsencrypt/boulder) (the Let's Encrypt ACME server) will be looking for challenge responses in our DNS records instead of some `.well-known/acme-challenge` publicly facing directory.

Let's get started:

```
$ git clone https://github.com/lukas2511/letsencrypt.sh
$ cd letsencrypt.sh
$ mkdir hooks
$ git clone https://github.com/kappataumu/letsencrypt-cloudflare-hook hooks/cloudflare
$ pip install -r hooks/cloudflare/requirements.txt
$ export CF_EMAIL='user@example.com'
$ export CF_KEY='K9uX2HyUjeWg5AhAb'
```

Having the initial configuration out of the way, we can now make ourselves some certificates:

```
$ letsencrypt.sh -c -d example.com -t dns-01 -k 'hooks/cloudflare/hook.py'
#
# !! WARNING !! No main config file found, using default config!
#
Processing example.com
 + Signing domains...
 + Creating new directory /home/user/letsencrypt.sh/certs/example.com ...
 + Generating private key...
 + Generating signing request...
 + Requesting challenge for example.com...
 + CloudFlare hook executing: deploy_challenge
 + DNS not propagated, waiting 30s...
 + DNS not propagated, waiting 30s...
 + Responding to challenge for example.com...
 + CloudFlare hook executing: clean_challenge
 + Challenge is valid!
 + Requesting certificate...
 + Checking certificate...
 + Done!
 + Creating fullchain.pem...
 + CloudFlare hook executing: deploy_cert
 + ssl_certificate: /home/user/letsencrypt.sh/certs/example.com/fullchain.pem
 + ssl_certificate_key: /home/user/letsencrypt.sh/certs/example.com/privkey.pem
 + Done!
```

You can paste the `ssl_certificate` and `ssl_certificate_key` lines directly into the nginx server block, which might look like this:

```
server {
    listen 443;
    server_name example.com;

    ssl on;
    ssl_certificate /home/user/letsencrypt.sh/certs/example.com/fullchain.pem;
    ssl_certificate_key /home/user/letsencrypt.sh/certs/example.com/privkey.pem;
    ssl_session_timeout 5m;
    ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA:ECDHE-RSA-AES128-SHA:DHE-RSA-AES256-SHA:DHE-RSA-AES128-SHA;
    ssl_session_cache shared:SSL:50m;
    ssl_dhparam /path/to/server.dhparam;
    ssl_prefer_server_ciphers on;

    ...the rest of your config here

}
```

Automated certificate renewal is merely one cron job away. Here's one way to go about it, using a helper script:

* Put all your domain names in `letsencrypt.sh/domains.txt`.
* Create a helper script, say `letsencrypt.sh/cron.sh`, for cron to execute:


```
#!/usr/bin/env bash

# You could also put these in config.sh, which is
# automatically sourced when letsencrypt.sh runs
export CF_EMAIL='user@example.com'
export CF_KEY='K9uX2HyUjeWg5AhAb'

/home/user/letsencrypt.sh/letsencrypt.sh \
    --cron \
    --challenge dns-01 \
    --hook '/home/user/letsencrypt.sh/hooks/cloudflare/hook.py'

service nginx restart
```

* Finally, add the following crontab entry (will run daily at 1 AM):

```
0 1 * * * /home/user/letsencrypt.sh/cron.sh >> /home/user/letsencrypt.sh/cron.log 2>&1
```


## A note on security

It is your responsibility to evaluate the trustworthiness of the various ACME clients. More so of Let's Encrypt itself in its capacity of certificate authority and software company. Even then, you have to make sure to put the appropriate processes in place to manage all the artifacts by way of file permissions, file ownership, service restarting privileges and so on. Skimping on these will negate all your efforts in securing a valid SSL certificate.

## Where to get the code

You can find the Python code for the letsencrypt.sh hook on Github, here is the link: [letsencrypt.sh CloudFlare hook](https://github.com/kappataumu/letsencrypt-cloudflare-hook).
