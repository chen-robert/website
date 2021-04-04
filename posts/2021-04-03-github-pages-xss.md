---
title: Breaking GitHub Private Pages for $35k
description: Abusing CRLF, cache poisoning, and other misconfigurations for a no-interaction XSS against GitHub Private Pages. 
---

I found and reported this vulnerability with [@ginkoid](https://twitter.com/ginkoid).

This was actually the first report that paid out for me on HackerOne. At $35,000, it's also the highest bounty I've received so far from HackerOne (and I believe the highest GitHub has paid out to date).

A lot of bugs seem to be a mix of both luck and intuition. In this blog post, I'll illustrate my thought processes in approaching such a target. 

<!--more-->

## Background 

COVID hit spring of my junior year in high school. With nothing to do between online classes, I started getting into bug bounty hunting. 

This particular bounty was reported as part of GitHub's private pages private bug bounty. In particular, there were two CTF bonuses:
- $10k: Reading the flag at `flag.private-org.github.io` without user interaction. $5k additional bonus if the flag is read from an account outside the `private-org` organization.
- $5k: Reading the flag at `flag.private-org.github.io` with user interaction.

## Authentication Flow

Because GitHub pages are hosted on the separate `github.io` domain, the `github.com` authentication cookies are not sent to the private pages server. Thus, private page authentication has no way to determine a user's identity without additional integration with `github.com`. Hence, GitHub created a custom authentication flow (introducing the possibility of bugs!)

At the time of the report, GitHub's private page authentication flow was:

![](/blog/gh-xss/auth-flow.jpg)

More verbosely: 

Upon visiting a private page, the server checks for the presence of the `__Host-gh_pages_token` cookie. If this cookie is not or incorrectly set, the private page server will redirect to `https://github.com/login`. This initial redirect also sets a nonce stored in the `__Host-gh_pages_session` cookie. 

Note that this cookie uses the [__Host- cookie prefix](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#attributes), which (in theory) prevents it from being set from JavaScript against a non-host (parent) domain as an additional defense in depth measure.

`/login` will then redirect to `/pages/auth?nonce=&page_id=&path=`. This endpoint then generates a temporary authentication cookie which it passes to `https://pages-auth.github.com/redirect` in the `token` parameter. The `nonce`, `page_id`, and `path` are similarly forwarded.

`/redirect` simply forwards to `https://repo.org.github.io/__/auth`. This final endpoint then sets the authentication cookies on the `repo.org.github.io` domain, `__Host-gh_pages_token` and `__Host-gh_pages_id`. This also validates the `nonce` against the previously set `__Host-gh_pages_session`.

Throughout the authentication flow, information such as the original request path and page id is stored in query parameters - `path` and `page_id`, respectively. The nonce is also passed around in the `nonce` parameter.

Although the authentication flow might have slightly changed, in part due to this report, the overall idea is the same.

## Exploit

### CRLF returns

The first vulnerability was a CRLF injection in the `page_id` parameter on `https://repo.org.github.io/__/auth`.

Perhaps the best way to find vulnerabilities is to play around. As part of my investigation into the authentication flow, I noticed that the `page_id` parsing seemed to ignore whitespace. Interestingly enough, it also rendered the parameter directly into the `Set-Cookie` header.

For example, `page_id=12345%20` would give:

```
Set-Cookie: __Host-gh_pages_id=13212257 ; Secure; HttpOnly; path=/
```

This suggested psuedocode as such:

```
page_id = query.page_id

do_page_lookup(to_int(page_id))
set_page_id_cookie(page_id)
```

In other words, the `page_id` is converted to an integer but also directly rendered into the `Set-Cookie` header.

The issue was we can't render any text directly. Although we had a classic CRLF injection, putting any non-whitespace characters caused the integer parsing to break. We could break the authentication flow by sending `page_id=12345%0d%0a%0d%0a`, but there wasn't any immediate impact other than an interesting response. 

```
; Secure; HttpOnly; path=/
Cache-Control: private
Location: https://83e02b43.near-dimension.github.io/
X-GLB-L
```

As a side-note, because the `Location:` header was appended after the `Set-Cookie` header, our response pushes the Location out of the sent HTTP headers. Even though this is a 302 redirect, the Location header will be ignored and the body content rendered. 

### Zero the Hero

Having looked through GitHub Enterprise a bit (which gave access to source code), I suspected that the private page server was implemented in openresty nginx. Being relatively low-level, perhaps it had issues with null bytes. It can't hurt to try right?

It turns out, appending a null byte causes the integer parsing to end. In other words, we could use a payload such as:
```
"?page_id=" + encodeURIComponent("\r\n\r\n\x00<script>alert(origin)</script>")
```

We get an XSS!

![](/blog/gh-xss/xss.jpg)

Note that the response gets rejected if there is a null byte in the header. Thus, the null byte has to come at the beginning of the body (which means we can't perform a header injection attack).

At this point, we've achieved arbitrary JavaScript execution on a private page domain. The only issue is, we need a way to bypass the nonce. While the `page_id` and `path` parameters are known, the nonce prevents us from sending our victims down the authentication flow with a poisoned `page_id`.

We either need to fixate or predict the nonce.

### Bypassing the Nonce

The first observation is that sibling private pages in the same organization can set cookies on each other. That's because `*.github.io` is not on the [Public Suffix List](https://publicsuffix.org). Thus, cookies set on `private-org.github.io` will get passed down onto `private-page.private-org.github.io`. 

We have an easy nonce bypass if we can somehow bypass the `__Host-` prefix protections... Simply set a fake nonce in a sibling page which will be passed down. Luckily, this prefix isn't enforced on all browsers...

![](/blog/gh-xss/prefixes.jpg)

Well... not *all*. Looks like only IE would be vulnerable to such a bypass. We'll have to do better. 

What about attacking the nonce itself? It seemed securely generated, and to be honest, cryptography isn't exactly my strong suit. It seemed unlikely that we'd find a bypass for the entropy used by the nonce generation regardless. How do we fixate the nonce then?

Back to the source then... or [RFCs](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-05). I eventually came across an interesting idea - how are cookies normalized? Specifically, how should cookies be treated with regard to capitalization. Is `__HOST-` the same as `__Host-`?

On browsers, it's easy to confirm that they are indeed handled differently.

```
document.cookie = "__HOST-Test=1"; // works
document.cookie = "__Host-Test=1"; // fails
```

It turns out, the GitHub private pages server ignores capitalization when parsing cookies. We have our prefix bypass! From here, we can throw together this simple POC for a full XSS!

```html
<script>
const id = location.search.substring("?id=".length)

document.cookie = "__HOST-gh_pages_session=dea8c624-468f-4c5b-a4e6-9a32fe6b9b15; domain=.private-org.github.io";
location = "https://github.com/pages/auth?nonce=dea8c624-468f-4c5b-a4e6-9a32fe6b9b15&page_id=" + id + "%0d%0a%0d%0a%00<script>alert(origin)%3c%2fscript>&path=Lw";
</script>
```

This by itself would be enough for the $5k bonus. But I wanted to see if we could push it further. 

### Cache Poisoning

As an additional design flaw, it appeared the response on the `/__/auth?` endpoint was cached solely on the parsed integer value of `page_id`. This in and of itself is technically harmless; the token set by this endpoint is scoped to the private page and has no other privileges. 

At the same time, it's a somewhat questionable design practice. If additional privileges were granted to tokens later, this could be a potential source of security problems.

Regardless, this caching behavior gave an easy way to escalate the severity of this attack. Because this is done on the parsed integer value, a successful cache poison with an XSS payload could affect other users who have not even interacted with a malicious payload.

<video controls>
  <source src="/blog/gh-xss/cache-xss.mp4">
</video>


As shown above: 

The adversary controls `unprivileged.org.github.io` and wants to access `privileged.org.github.io`. They first poison the authentication flow for `unprivileged.org.github.io`, and the XSS payload gets cached.

Now when a privileged user visits `unprivileged.org.github.io`, they experience an XSS attack on the `unprivileged.org.github.io` domain. Because cookies can be set on the shared parent domain `org.github.io`, the adversary can now perform an attack against `privileged.org.github.io`.

This would allow any attacker with read permissions against a private page to permanently poison the authentication flow for that page. Yikes. 

### Public-Private pages

In order to get the $15000 bonus, we need to perform this attack from a user account that is not in the organization. Luckily, we can abuse another seemingly irrelevant misconfiguration. Enter "public-private pages".

A possible misconfiguration in private pages allows public repositories to also have their own "private" pages. These "private" pages, while going through the normal authentication cycle, are public to everyone. If an organization were to have one of these public-private pages, any user with a GitHub account would have "read access".

An example of how one might be made: 

<video controls>
  <source src="/blog/gh-xss/public-private.mp4">
</video>

This happens when a private page repository is changed to public. This scenario is quite plausible. For example, an organization might initially create a private repository with a corresponding private page. Later on, the organization might decide to open source the project, changing the repository status to public.

Combining this with the above, an unprivileged outside user could pivot from the "public-private" page to compromise internal private pages' authentication flows. 

Putting it all together, we have a nice POC that demonstrates how an external attacker could use an internal employee to pivot to otherwise private pages. 

<video controls>
  <source src="/blog/gh-xss/pivot.mp4">
</video>

Thus, we secure the maximum CTF bonus.

From here, persistence could be possibly be achieved through AppCache or other techniques, although that is left as an exercise to the reader. 

## Closing Thoughts

Vulnerabilities like these feel like one in a million. A number of components have to align in just the right way - like threading a needle. At the same time, I think there's a reasonable amount of intuition and skill required to find something like this.

Regardless, I think it's pretty cool how such a relatively obscure vulnerability - CRLF injection - can show up on GitHub of all places. Although most of the code is written in Ruby, certain components such as private page authentication are not and might be vulnerable to more low-level attacks. In general, wherever there are complex interactions, bugs are waiting to be found :)

Overall, this vulnerability was rated at the high end of the "High" severity, with a $20,000 base payout. With the CTF bonus, we were awarded a total of $35,000.

## Timeline

05/21/2020 - Reported to GitHub Private Program on HackerOne
06/20/2020 - Resolved and payout by GitHub
04/03/2020 - Blog post published

