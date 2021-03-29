### House of Red

This is an author writeup for `house-of-red` and its sibling problem `zero-the-hero`, both of which appeared in the [2020 redpwnCTF](https://ctftime.org/event/995). Their respective challenge repositories are [also open sourced](https://github.com/redpwn/redpwnctf-2020-challenges/tree/master/pwn). 

This writeup presents a relatively novel exploitation technique, that can be applied to a wide range of challenges. 

#### Implications

There are two prerequisites to execute this attack. 
1. Libc address leak
2. Constrained write in libc

The most common scenario for the second constraint is mallocing a chunk, and then providing a negative size value. If we are able to perform such a write, we can almost always overwrite some part of `_IO_2_1_stdin_` to escalate to shell. A similar attack scenario appeared in [justCTF 2019's ATM Service](https://ctftime.org/task/10060). Although FSOP wasn't the intended scenario, the relative overwrite in libc allowed me to bypass the buffer overflow. 

<!--more-->

#### Zero the Hero

With a name inspired by picoCTF 2019's Zero To Hero, `zero-the-hero` similarly consists of escalating a single byte overwrite into RCE. In this case however, the overwrite consists of a literal `'0'`, or 0x30. 

```c
  buffer = malloc(size);
  printf("I put a bunch of zeroes here: %p\n", buffer);

  puts("How much do you want to read?");
  scanf("%ld", &size);
  
 // if(size > 0 && size < 0x1000) read(0, buffer, size);
  buffer[size] = '0';
  
  puts("How badly do you want to be a hero?");
  scanf("%ms", &size);
```
*zero-the-hero.c*

Extremely large malloced chunks will be mmaped. These can be placed at consistent offsets from the libc address space. Because this address is printed out, we also get a libc leak. In effect, this vulnerability allows us to perform a relative write into libc. The question then becomes, how do you escalate from a relative overwrite into shell? 

One extremely useful function is `_IO_new_file_underflow`. This is called in (almost?) all file stream operations. In other words, if a program does not read data with the `read` syscall, it's probably using this function. This gives it an extremely wide scope for exploitation. For reference, the source for this function can be found [here](https://code.woboq.org/userspace/glibc/libio/fileops.c.html#468). 

Most of the function is irrelevant. The crucial part is where it read data. 

```c
  fp->_IO_read_base = fp->_IO_read_ptr = fp->_IO_buf_base;
  fp->_IO_read_end = fp->_IO_buf_base;
  fp->_IO_write_base = fp->_IO_write_ptr = fp->_IO_write_end
    = fp->_IO_buf_base;
  count = _IO_SYSREAD (fp, fp->_IO_buf_base,
                       fp->_IO_buf_end - fp->_IO_buf_base);
```

Something interesting to note is that it fixes the remaining pointers, `->_IO_read_base`, `->_IO_read_ptr`, etc. This means even if you're given a wide uncontrolled write (ie, writing some string "Hello World" to a controlled address in libc), you could still use partial overwrites to apply this technique. 

By attacking `_IO_2_1_stdin_` and overwriting `->_IO_buf_base` or `->_IO_buf_end`, we are given an arbitrary write! 

For reference, the file struct is defined as such, taken from [here](https://www.geeksforgeeks.org/data-type-file-c/)
```
struct _IO_FILE {
  int _flags;       /* High-order word is _IO_MAGIC; rest is flags. */
#define _IO_file_flags _flags

  /* The following pointers correspond to the C++ streambuf protocol. */
  /* Note:  Tk uses the _IO_read_ptr and _IO_read_end fields directly. */
  char* _IO_read_ptr;   /* Current read pointer */
  char* _IO_read_end;   /* End of get area. */
  char* _IO_read_base;  /* Start of putback+get area. */
  char* _IO_write_base; /* Start of put area. */
  char* _IO_write_ptr;  /* Current put pointer. */
  char* _IO_write_end;  /* End of put area. */
  char* _IO_buf_base;   /* Start of reserve area. */
  char* _IO_buf_end;    /* End of reserve area. */
  /* The following fields are used to support backing up and undo. */
  char *_IO_save_base; /* Pointer to start of non-current get area. */
  char *_IO_backup_base;  /* Pointer to first valid character of backup area */
  char *_IO_save_end; /* Pointer to end of non-current get area. */

  struct _IO_marker *_markers;

  struct _IO_FILE *_chain;
  ...
};
```

Note that the `scanf("%ms")` guarantees heap activity, meaning that if we simply overwrote one of the hooks with one_gadget, we would get a shell. My exploit involved overwriting the 2nd LSB of `->_IO_buf_end` to write onto `__free_hook`. 

#### House of Red

House of Red was meant to be a continuation of `zero-the-hero`. It was a C++ web server with a similar relative write vulnerability. 

```c
long size;

inline void resize(long len) {
  if(len >= size) {
    free(buffer);
    buffer = (char*) malloc(len);
  }
  size = len;
}
...

    if(buffer != NULL) {
      for(int i = 0; i < size; i++) {
        buffer[i] = 0;
      }
      buffer[size] = 0;
    }
    
    int x;
    cin >> x;
```
*house-of-red.cpp*

By defining a negative `size`, we are able to perform the exact same attack as in `zero-the-hero`. There are three primary differences here. 
1. We're reading an int from C++ stdio functions. The competitor needs to make the observation that C++ uses the same file structs as in C. The grouping of the two problems was intended to hint towards this behavior. 
2. The overwrite is a null byte as opposed to `\x30`. This means we are unable to perform an extension attack on `->_IO_buf_end`. Instead, we must overwrite `->_IO_buf_base`. 
3. The program immediately runs `_Exit(0)` (syscall exit) after reading in the int. Thus, we must find some self-contained way to trigger heap activity. 

Diving deeper into file structs, the internal macro for reading characters looks as such. 

```c
#define __getc_unlocked_body(_fp)                                        \
  (__glibc_unlikely ((_fp)->_IO_read_ptr >= (_fp)->_IO_read_end)        \
   ? __uflow (_fp) : *(unsigned char *) (_fp)->_IO_read_ptr++)
```

It checks if `->_IO_read_ptr` is greater than or equal to `->_IO_read_end`. Intuitively, this represents if the pointer for the data that it's reading has passed the end of the buffer. If so, it triggers the underflow operation which we looked at previously. Otherwise, it increments the read pointer, and returns. 

The intended solution was to use `cin >> x` to trigger three consecutive reads. An important thing to note is that the C++ read int will immediately exit if it does not encounter a valid integer character. Thus, we need to be careful to adjust `->_IO_read_ptr` such that it always points to a valid place. 

`_IO_new_file_underflow` will also adjust `->_IO_read_end`. However, this is by a predictable amount, which allows us to easily subtract this number from what we want `->_IO_read_end` to be. 

```c
  count = _IO_SYSREAD (fp, fp->_IO_buf_base,
                       fp->_IO_buf_end - fp->_IO_buf_base);
   ...
  fp->_IO_read_end += count;
```

Overwriting the lowest byte of `->_IO_buf_base` will allow us to control all of the pointers. The first read overwrites all of the file pointers. At the same time, it points `->_IO_read_ptr` to a "1" char, as well as setting `->_IO_read_end` to be equal to `->_IO_read_ptr` after adjustments. This allows us to trigger another read in the same `cin >> x` code. We also adjust the `->_IO_buf_end` pointer such that our second read overlaps with `__free_hook`. 

The second read overwrites `__free_hook` with system, and primes the file struct for heap activity on the third read. 

In order to trigger heap activity, I used the following code in `_IO_new_file_underflow`. 

```c
  if (fp->_IO_buf_base == NULL)
    {
      /* Maybe we already have a push back pointer.  */
      if (fp->_IO_save_base != NULL)
        {
          free (fp->_IO_save_base);
          fp->_flags &= ~_IO_IN_BACKUP;
        }
      _IO_doallocbuf (fp);
    }
```

By setting `->_IO_buf_base` to NULL and pointing `->_IO_save_base` to "/bin/sh", we are able to free something with `"/bin/sh"`. Note that previously we overwrote `__free_hook` with system, completing the exploit and allowing us to pop a shell. 

The third time `_IO_new_file_underflow` is called, it will free our fake `->_IO_save_base`, popping a shell. 

#### Trivia

The flags for this challenge were chosen to hint at their sibling nature. The flavortext for `zero-the-hero` was as follows. 

```
  One null to rule them all, one null to find them.
  One null to bring them all,
```

However, the flag for `zero-the-hero` is `flag{that_wa5nt_a_r3a1_nul1_4185b11c}`. Only when you solve `house-of-red` do you get the end of the poem. 

```
flag{and_1n_th3_darkn3s5_b1nd_th3m_732e7a2e3c33}
```
