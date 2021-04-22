This was a very interesting challenge. 

## Analysis

The libc version is 2.29. This implies the use of tcache bins, as well as additional protections against double-free. 

As usual, the first thing we do is run `checksec`. 

```
$ checksec shattered
[*] '/home/robert/writeups/binexp/hsctf20/shattered/shattered'
    Arch:     amd64-64-little
    RELRO:    Full RELRO
    Stack:    Canary found
    NX:       NX enabled
    PIE:      PIE enabled
```

All protections enabled - it's a typical heap exploit challenge. Then again, this is to be expected. The challenge author, `poortho`, is notorious for only writing glibc heap problems. 

The exploit path will probably involve getting a libc leak, and then overwriting one of the hooks - `__malloc_hook` or `__free_hook`. 

<!--more-->

### Vulnerabilities

Looking through the binary, there are two key vulnerabilities to exploit. 

First, note the struct of the object is as follows. 

<img src="data:image/png;base64,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" />

However, the object is created with `malloc`. Any leftover data in the chunk won't be zeroed. 

```c
  obj = (astruct *)malloc(0x38);
  obj->left = (astruct *)0x0;
  obj->right = (astruct *)0x0;
  pcVar1 = (char *)malloc(size & 0xffffffff);
  obj->data = pcVar1;
  obj->size = size & 0xffffffff;
  force_get_data(obj->data,size & 0xffffffff,size & 0xffffffff);
  SHA1((uchar *)obj->data,size & 0xffffffff,(uchar *)obj);
```

The search function prints out the hash with a call to `puts`, as opposed to say a bounded `write` call. That means if the hash has no null bytes, and the original chunk was also filled with non-null bytes, the puts call could leak the `->left`, or a heap address. 

```c
puts((char *)param_1);
```

This vulnerability allows us to get a heap leak. 

The second vulnerability arises in an uninitialized variable in the allocation. 

This was hinted at, with the very suspicious function at **0x100a9f** which reads 100 bytes to the stack for seemingly no reason. 

In **0x100b0c**, the `local_10` node pointer is uninitialized if there is a sha1 collision. 

```c
      if ((to_add->size == curr_node->size) &&
         (iVar1 = memcmp(to_add->data,curr_node->data,to_add->size), iVar1 == 0)) {
```

If this check fails, the code jumps to 

```c
add_obj(to_add,local_10);
```

However, `local_10` is never assigned up to this point, meaning that it takes on the value of some unintialized stack variable. How convenient that the previous function lets us read 100 bytes to the stack. It's almost as if it was intentionally left in there...

At this point, you're probably wondering why there's cryptography in a binary exploitation challenge. Luckily, I had some members in my team who were far better than me at crypto, and one of them easily found a sha1 collision. You can also use the strings in [this writeup](https://shattered.io/). For the files I used, refer to [1.txt and 2.txt](https://github.com/chen-robert/writeups/tree/master/binexp/hsctf20/shattered).  

## Exploitation

The second vulnerability gives us a limited write primitive. More formally, we get to control the 2nd parameter to **0x100b0c**, the add_node function. 

However, closer analysis reveals that this is actually quite limited. We are only able to overwrite null pointers, due to the additional checks before every assignment. 

```c
      if (curr_node->left == (astruct *)0x0) {
        curr_node->left = to_add;
        return;
      }
```

The crucial observation to make here is that we can overwrite the fd pointer of a freed tcache chunk. If there is only one chunk in a tcache bin, the fd pointer will be null. This allows us to append the `to_add` node variable, or a `malloc(0x38)` chunk, onto any tcache bin. 

By appending this 0x40 (`malloc(0x38)` results in a chunk of size 0x40) chunk onto a tcache bin of larger size, say 0x270, we are able to get a heap overflow. When we malloc for a chunk of size 0x270, the actual size of the chunk returned will be 0x40, allowing us to overflow the chunk and modify subsequent chunks. 

Getting a libc leak is still quite difficult at this point however, mainly due to the rather contrived construction of chunks and hashes. The general idea is to malloc and free a large enough chunk such that the chunk avoids the tcache and goes into the unsorted bin. Then, by overflowing into the hash of a chunk, we can extend the hash to include the fd pointer of the unsortedbin chunk. 

![](/imgs/blog/ctf/hsctf20/heap.jpg)


Note that the show function only checks the first 20 bytes. Thus, we are able to leak a libc address through puts.


```c
iVar1 = memcmp(to_add,curr_node,0x14);
```

In order to avoid breaking the heap after the libc leak however, we need to do some additional manipulations. For one, I chose hashes such that the structure of the binary search tree was as simple as possible. This allowed me to immediately delete the root after leaking the libc address to avoid any additional complications. 

In addition, I overwrote the size header of another free chunk concurrently with the libc leak. This allowed me to malloc into it after freeing to get another heap overflow. With this heap overflow and a libc leak, I could easily modify a fd pointer of an existing free chunk to point to `__free_hook`. 

One neat trick to save time, especially with tcache exploits, is to overwrite to `__free_hook - 8` with `"/bin/sh\x00" + p64(system)`. This allows you to immediately free the chunk, getting a shell without having to worry about the rest of the heap. 

