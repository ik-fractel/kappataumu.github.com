---
category: articles
description: "How to format numbers in Django templates according to locale, using a dot as a thousand separator or any custom thousand separator."
published: true
title: "Exploring Django format localization settings"
---

Django supports many languages and locales out of the box. An important aspect of locale-aware applications is number formatting and Django provides quite a few knobs and switches, but using them isn't entirely straightforward.


## The goal and some assumptions

Django ships with the wrong thousand separator for one of the locales I use, so I was interested in finding a way to fix this in my code. Furthermore, I needed a locale-*unaware* thousand separator while keeping the rest of the localization machinery. This was a good opportunity to dive in.


First, let's take a look at `settings.py`. These are the defaults when starting a new project via `startproject`, for Django 1.10:

```python
LANGUAGE_CODE = 'en-us'
USE_I18N = True
USE_L10N = True
```

Interestingly, the [docs](https://docs.djangoproject.com/en/dev/ref/settings/#use-l10n) say that the default is `USE_L10N = False`, but `startproject`, for convenience, sets `USE_L10N = True`.


## Using template filters to format numbers with a custom thousand separator

If you need to format integers only in a couple of places, doing it in the template makes sense. Let's explore options.

Searching for solutions, one will surely come across [`django.contrib.humanize`](https://docs.djangoproject.com/en/dev/ref/contrib/humanize/) which provides a set of useful template filters, such as [`intcomma`](https://docs.djangoproject.com/en/dev/ref/contrib/humanize/#intcomma), which converts an integer to a string containing commas every three digits. Pretty close, but we need a dot, not a comma. As an interesting aside, this filter respects format localization if enabled (by `USE_L10N = True`). This means that if the active locale uses a dot as the thousand separator, `intcomma` will use *a dot* when formatting output values.

This point can be illustrated by strategically using [`unlocalize`](https://docs.djangoproject.com/en/dev/topics/i18n/formatting/#unlocalize):

```python
# In settings.py
# Remember the Germans use a dot
LANGUAGE_CODE = 'de'
USE_THOUSAND_SEPARATOR = True
```

{% highlight html %}
{% raw %}

<!-- In our template we load django.contrib.humanize, assuming big_int = 1000 -->
{% load l10n %}

<!-- Renders 1.000 (since format localization is fully enabled) -->
{{ big_int }}

<!-- Renders 1000 (unlocalize forces a single value to be printed without localization) -->
{{ big_int|unlocalize }}

<!-- Renders 1.000 (uses the thousand separator of the active locale, not a comma) -->
{{ big_int|unlocalize|intcomma }}

{% endraw %}
{% endhighlight %}

Quite paradoxical for a template tag named `intcomma`. In case you were wondering, using {% raw %}`{% localize off %}`{% endraw %} is similarly [disregarded](https://docs.djangoproject.com/en/dev/topics/i18n/formatting/#localize).

So we've reached the conclusion that `intcomma` isn't *trully* `intcomma` unless localization is disabled *entirely* by `USE_L10N = False` in `settings.py`. But this is what RTFM is for.

Since the analogous `intdot` is nowhere to be seen (and [not for lack of effort](https://code.djangoproject.com/ticket/11636)), we'll have to do it on our own, while at the same time ignoring localization. Implementing a custom Django template filter is easy, we can just plop something like this into a `templatetags` directory inside our app:

```python
import re
from django import template
from django.template.defaultfilters import stringfilter
from django.utils.encoding import force_text

register = template.Library()

@register.filter(is_safe=True)
@stringfilter
def intdot(value):
    orig = force_text(value)
    new = re.sub("^(-?\d+)(\d{3})", '\g<1>.\g<2>', orig)
    if orig == new:
        return new
    else:
        return intdot(new)
```

Then we can use it in our templates like so:

{% highlight html %}
{% raw %}

{% load intdot %}
<span class="big-int">{{ big_int|intdot }}</span>

{% endraw %}
{% endhighlight %}



## Drilling into format localization settings


Now, say we have a model field that holds a number like `1000000`. We need to display this value in a template as `1.000.000` and the current locale is `en`:

{:.table}
| Django template | Rendered HTML |
| --- |--- |
| {% raw %}`<span>{{ price }}</span>`{% endraw %} | `<span>1000000</span>` |

Ok, so first we need to set `USE_THOUSAND_SEPARATOR = True` in `settings.py`, to enable thousand separators. Remember that since we've instructed Django to be locale-aware and the locale has been set to `en` via `LANGUAGE_CODE`, the thousand separator is locale-specific, hence a comma:

{:.table}
| Django template | Rendered HTML |
| --- | --- |
| {% raw %}`<span>{{ price }}</span>`{% endraw %} | `<span>1,000,000</span>` |

Django provides a way to override number formatting in `settings.py`. Since we've set `USE_THOUSAND_SEPARATOR = True`, now we can also specify these:

```python
THOUSAND_SEPARATOR = '.'
NUMBER_GROUPING = 3
DECIMAL_SEPARATOR = ','
```

But does this work? Nope, because of the [fineprint](https://docs.djangoproject.com/en/dev/ref/settings/#use-thousand-separator):

> When USE_L10N is set to True and if this is also set to True, Django will use the values of THOUSAND_SEPARATOR and NUMBER_GROUPING to format numbers unless the locale already has an existing thousands separator. If there is a thousands separator in the locale format, it will have higher precedence and will be applied instead.

This too seems paradoxical, as I would've expected my settings file to have the highest precedence, even if it meant I would lose the flexibility of supporting number format localization across locales by doing so. We'll talk about the proper way to do it further down, using a custom locale format file on an ad-hoc basis. Anyhow, in our case, the `en` locale format file (located in `django/conf/locale/en/`) of course sets all of these.

Curious about how often a format file *doesn't* set `THOUSAND_SEPARATOR`, I decided to poke into `django/conf/locale/`, where all the locale format files that ship with Django reside. Out of the 70 locales available, only 5 didn't set `THOUSAND_SEPARATOR`:

```
./ta/formats.py
./fy/formats.py
./te/formats.py
./mn/formats.py
./kn/formats.py
```

In other words, only in these locales would one be able to specify a `THOUSAND_SEPARATOR` (and friends) that works if `USE_L10N = True`.

Obviously, if we disable localization entirely, by `USE_L10N = False` these settings do take effect no questions asked, but then we lose everything else, like locale-aware date formatting. In light of the above, it seems that creating a custom format file is the only way to selectively override a subset of locale formatting options.



## Formatting numbers using a custom locale format file

It's actually pretty simple. Just follow the [instructions](https://docs.djangoproject.com/en/dev/topics/i18n/formatting/#creating-custom-format-files). Here we will be overriding a subset of the English format settings. First, we create the directory structure inside our app:

```
my-app/
    formats/
        __init__.py
        en/
            __init__.py
            formats.py
```

These are the contents of `formats.py`:

```python
DECIMAL_SEPARATOR = ','
THOUSAND_SEPARATOR = '.'
NUMBER_GROUPING = 3
```

Then in `settings.py`:

```python
FORMAT_MODULE_PATH = [
    'my-app.formats',
]
```

A bit involved, but it works, as long as the locale stays the same, i.e. if the locale changes, perhaps due to browser autodetection, the overridden settings won't work. Other locales will obey their respective locale format files, unless you override them too, which seems like too much work. But there is a way, if you are so inclined.
