---
category: articles
description: "If you've never been hit by catastrophe it's easy to dismiss taking regular backups as a nice-to-have instead of the absolute necessity it is. We need to fix this. We’ll use Duplicity to instrument our backups, which will be encrypted on the server and subsequently pushed to Amazon S3."
published: true
title: "Cloud backups with Duplicity and Amazon S3"
---

If you've never been hit by catastrophe it's easy to dismiss taking regular backups as a nice-to-have instead of the absolute necessity it is. We need to fix this. We’ll use Duplicity to instrument our backups, which will be encrypted on the server and subsequently pushed to Amazon S3.

First of all, lets install [Duplicity](http://duplicity.nongnu.org/). The S3 backend is powered by [Boto](https://github.com/boto/boto), which is a dependency we’ll also have to install. Before moving on, make sure you have `add-apt-repository`, by installing these packages:

```bash
$ sudo apt-get install python-software-properties
$ sudo apt-get install software-properties-common
```

Okay then. Lets proceed:

```bash
$ sudo apt-add-repository ppa:duplicity-team/ppa
$ sudo add-apt-repository ppa:chris-lea/python-boto
$ sudo apt-get update
$ sudo apt-get install duplicity python-boto haveged
```

If the packages aren’t as fresh as you’d like, consider installing from source.

## Setting up the S3 bucket and user credentials

Now for the S3 part. Log in to the [AWS IAM Console](https://console.aws.amazon.com/iam/home) and create a new user, say `backup-duplicity`. Note the Access Key ID and Secret Access Key, which will look similar to mine below. We’ll make these available to Duplicity later on.

```bash
Access Key ID: AKIAICDEMO2KVF2ODEMO
Secret Access Key: kGDEMOEqf/CuM+fuDEMOENfmCeX9eDEMO0gVi9tN
```

Still in AWS, navigate to the [S3 Console](https://console.aws.amazon.com/s3/) and create a new bucket. If you want to take advantage of subdomain based bucket addressing in S3 (the `--s3-use-new-style` option), your bucket name must not contain uppercase letters or any other characters that are not valid parts of a hostname. Note the bucket name.

Navigate to your [IAM user list](https://console.aws.amazon.com/iam/home#users), locate the newly created user `backup-duplicity` and attach the following custom user policy. Make sure to put it your own bucket name:

```json
{
  "Statement": [
    {
        "Effect": "Allow",
        "Action": [
          "s3:CreateBucket",
          "s3:ListAllMyBuckets"
        ],
        "Resource": [
          "arn:aws:s3:::*"
        ]
    },
    {
        "Effect": "Allow",
        "Action": "s3:*",
        "Resource": [
            "arn:aws:s3:::your-bucket-name-here",
            "arn:aws:s3:::your-bucket-name-here/*"
        ]
    }
  ]
}
```

Since our backups will be kept off-site, encryption is needed to ensure no one can peek inside while at rest. It also solves the problem of eavesdropping while in transit. Taking encryption into our hands, instead of mulling over a provider’s security pedigree, allows us to make decisions based on what really matters to us: backup redundancy and availability.



## Creating a GPG key for encryption

We are going to generate a GPG key pair, which we’ll instruct Duplicity to use for encrypting and signing our backups, before they are sent to their final destination. Kick-off the interactive key pair parameter configuration and hit `ENTER` `ENTER` `ENTER` followed by `y` to confirm your selections (RSA and RSA keys, default keysize and no expiration date):

```bash
$ gpg --gen-key
```

You will also be prompted for your name, e-mail address, and a comment to be associated with this keypair. Fill in your details, and hit `O` to confirm you are happy with the USER-ID derived from your data. For extra security, a passphrase is required; type it in twice. Make sure to pick something other than ‘correct horse battery staple’, which is what I always use:

```bash
Enter passphrase:
Repeat passphrase:
```

Finally, entropy is required. This is where `haveged` comes in handy, since your system is unlikely to have enough, especially if it’s a headless VM. Taking care of an entropy shortage means we won’t get stuck here forever:

```bash
Not enough random bytes available.  Please do some other work to give
the OS a chance to collect more entropy! (Need 280 more bytes)
```

Well, that was the last hurdle and the PGP key should have been created. From the final command output, inspect the following line and note the public key ID:

```
gpg: key 5E46FBDC marked as ultimately trusted
```

## Creating a Bash script to drive Duplicity

Having done all the legwork, it’s time to mess with the interesting part. Actually taking backups. First we create a directory to store all our files, `~/.duplicity`. Create `~/.duplicity/.credentials.conf` to hold the credentials Duplicity needs, like so:

```bash
PASSPHRASE='correct horse battery staple'
AWS_ACCESS_KEY_ID='AKIAICDEMO2KVF2ODEMO'
AWS_SECRET_ACCESS_KEY='kGDEMOEqf/CuM+fuDEMOENfmCeX9eDEMO0gVi9tN'
```

And now for the Bash script, `~/.duplicity/backup.sh`; replace ‘kappataumu’ with your username and set your desired backup directory:

```bash
#!/bin/bash

# Make GPG explicitly aware of our private key,
# since we'll be running this via cron as root
HOME="/home/kappataumu"
export HOME=$HOME

# Load our credentials
source "$HOME/.duplicity/.credentials.conf"

export PASSPHRASE
export AWS_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY

GPG_KEY='5E46FBDC'

duplicity \
    --verbosity notice \
    --s3-use-new-style \
    --encrypt-key="$GPG_KEY" \
    --sign-key="$GPG_KEY" \
    --full-if-older-than 7D \
    --asynchronous-upload \
    --volsize=100 \
    --log-file "$HOME/.duplicity/notice.log" \
    /your/backup/directory/ \
    s3+http://bucket-duplicity/

unset PASSPHRASE
unset AWS_ACCESS_KEY_ID
unset AWS_SECRET_ACCESS_KEY
```

Don’t forget to set appropriate file permissions for `.credentials.conf` and `backup.sh`; only root should be able to read or execute them:

```bash
$ chown root:root ~/.credentials.conf
$ chown root:root ~/.backup.sh
$ chmod 0600 ~/.credentials.conf
$ chmod 0700 ~/.backup.sh
```

Finally, introduce the new task to be run by `cron`, let's say at 3 am every night. Note that i’m using root’s crontab explicitly:

```bash
$ sudo crontab -e
0 3 * * * /home/kappataumu/.duplicity/backup.sh >> /home/kappataumu/.duplicity/cron.log 2>&1
```



## A note on security

Remember that if an intruder infiltrates the server, she can read and modify all your files and possibly create new ones, which will be pushed to S3 along with everything else. If the root account is compromised as well, the intruder will gain **complete access** to all of your backups, since the S3 credentials are stored locally. So is the GPG private key, and its passphrase. Not good, eh?

Having a separate server to orchestrate backups and pull data is the only clean way to mitigate these risks, but adds some complexity and perhaps cost. It is up to you to decide if it's worth it and may be reason enough for an additional post.
