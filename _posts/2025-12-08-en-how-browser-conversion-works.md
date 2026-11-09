---
layout: post
lang: en-US
locale: en_US
ref: how-it-works
title: "How Your Browser Makes a GIF Without Uploading Anything (Plus How to Check)"
date: 2025-12-08 20:00:00 +0900
last_modified_at: 2026-11-09 10:00:00 +0900
category: "Tech"
tags: [WebAssembly, gifski, Browser, Privacy, Development]
excerpt: "If nothing gets uploaded, how does a GIF come out? I wrote down what this site's code actually does, step by step, along with how to check for yourself that nothing is uploaded."
description: "How Video to GIF converts videos to GIFs inside your browser with no server upload, and how to confirm there's no upload yourself using DevTools."
image: /assets/img/og-default.jpg
permalink: /en/blog/how-browser-conversion-works/
---

This is the question I get the most:

> "Does my file really not go to a server? Then where does the conversion happen?"

The conversion happens inside the browser you're reading this page in right now. That's hard to believe just because I say so, so I'll walk through what this site's code actually does, in order, and at the end I'll show you how to check it yourself.

## Step by step

### 1. Opening the video

When you pick a file, the browser creates a temporary URL that points to it (one that starts with `blob:`) and connects it to a `<video>` tag hidden in the page. That URL only works inside your browser, so if someone else opened it, they wouldn't get anything.

### 2. Grabbing frames

The video is jumped forward by the frame interval each time (0.04 to 0.2 seconds, depending on the quality level), the frame at that point is drawn onto a `<canvas>`, and then it's saved as a PNG image. For example, a 4.5-second video at the Balanced level (a 0.1-second interval) gives you 45 frames. The interval and size are picked automatically from the video's length and resolution and the level you chose, and resizing happens here too. Each frame is just drawn onto the canvas at the size you want, so there's no separate resize step.

### 3. Adding text (only if you entered some)

If you use Text Settings, each frame gets redrawn on the canvas, with the text and its background box drawn on top. That means the text is baked right into the GIF's pixels.

### 4. Encoding the GIF

This is the heaviest part. The frames are turned into pixel data and handed to the GIF encoder, which is **gifski**. gifski was originally written in Rust, and this site uses a version compiled to WebAssembly (gifski-wasm).

To put it simply, WebAssembly is a format close to machine code that browsers can run. It runs much faster than the same math written in JavaScript, so work that used to need a server or an installed program is now doable in the browser. I wrote at length about why gifski's colors look so good in the [gifski post]({% post_url 2025-10-20-en-gifski-256-colors %}).

### 5. Saving

The finished GIF also gets its own `blob:` URL, which is used to show it on the page and is connected to the download link. The download button just saves whatever is at that URL as a file on your computer.

When you close or refresh the page, the temporary URLs and frames from the steps above are all gone.

## How to check that nothing gets uploaded

### With DevTools

1. Open this site in Chrome on your computer and press `F12` (on a Mac, `Cmd + Option + I`).
2. Open the **Network** tab.
3. Pick a video and convert it.
4. Look through the list of requests.

The first time you convert, you'll see it download one file called `gifski_wasm_bg.wasm`. That's the encoder program being downloaded from this site. You might also see a few requests for ads and visitor statistics (Google Analytics). But you won't see any request the size of your video **going out** to a server. Sort the list by the Size column and you can confirm it in a few seconds.

### By turning off the internet

1. Convert one video first. (This downloads the encoder and loads it into memory.)
2. Turn off Wi-Fi.
3. Pick a different video and convert it.

The conversion still finishes with no internet. If it worked by sending your file to a server, it would have stopped right there. The one exception: if you cut the internet as soon as you first open the page, the encoder hasn't been downloaded yet, so the conversion can fail.

By the way, this site's code is public on [GitHub](https://github.com/videotogif/videotogif.github.io), so feel free to look through it yourself.

## The downsides

It's not all upside, so I want to be upfront about these.

- **It uses your device's power.** There's no server doing the work for you, so it's slow on older laptops and phones. That's also why your fan kicks on while it converts.
- **It uses quite a bit of memory.** During encoding, the frames are laid out as uncompressed pixels. At 900×506, one frame is about 1.8MB, so 45 frames take up more than 80MB on their own. That's why the browser can get sluggish with long, large videos. It's also why I [capped the longer side at 900px]({% post_url 2025-10-28-en-why-900px %}).
- **The encoder has to be downloaded once.** So the first conversion takes a little longer.

Still, when I'm dealing with files I'd rather not upload to someone else's server, like personal videos or screen recordings from work, this approach just feels better to me. That's the reason I built this site in the first place.
