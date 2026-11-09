---
layout: post
lang: en-US
locale: en_US
ref: why-i-made
title: "Why I Built My Own GIF Converter"
date: 2025-10-22 21:00:00 +0900
last_modified_at: 2026-11-09 10:00:00 +0900
category: "About"
tags: [GIFConverter, DevStory, BrowserBased, VideoToGIF, SideProject]
excerpt: "\"I could make a better one.\" How the hassles I ran into every time I turned a video into a GIF led me to build a converter that runs in the browser."
description: "Why I built Video to GIF, a browser-based converter, after getting fed up with the hassles of turning videos into GIFs."
image: /assets/img/why-i-made-pixel.png
image_alt: "Pixel art of a guinea pig wearing glasses, holding up one finger"
permalink: /en/blog/why-i-built-video-to-gif/
---

## It started with a few annoyances

Hi, I'm the developer who made this site.

Between work and side projects, I end up turning videos into GIFs pretty often. Writing a bug report, putting together a tutorial, writing a blog post... there are more moments that call for a GIF than you'd think.

## What bugged me about the existing services

At first I just used online GIF converter sites, of course. But the more I used them, the more little problems I noticed.

### That uneasy feeling of uploading my videos to some unknown server

Most services worked by uploading your file to a server somewhere overseas. Every time I converted a personal video or a recording of my work screen, I'd think, "Where is this file being stored?" and "Is it actually getting deleted?"

### Slower than you'd expect

Upload the file, wait for the server to process it, download it again... even a short clip took a while. On a slow connection it got downright frustrating. And plenty of times, after all that waiting, I wasn't even happy with what I got.

### Disappointing quality

Free services had pretty limited quality settings. Getting high quality meant either paying or digging through overly complicated options. I just wanted something with "good enough" quality, made quickly, and that turned out to be surprisingly hard.

### Free, until it isn't

A lot of sites were free at first, but as soon as you tried to use them for anything real, they asked you to pay. Honestly, a monthly subscription just to make a few GIFs felt like a waste of money.

## So I decided to build my own

"Wait, couldn't a browser handle this just fine?"

These days you can do some pretty heavy work with nothing but a browser. After poking around for a while, I thought, "Okay, I'll just build it myself."

So here's how I built this site:

- **Your files are never uploaded to a server.** All the conversion happens inside the browser you're using right now. Work files or personal videos, nothing leaves your computer.
- **No waiting on uploads or downloads.** Pick a file and conversion starts right away. The trade-off is that it runs on your own device, so it can be slow on older hardware.
- **Only the settings you actually need.** There are four: frame interval, size, quality, and FPS. The defaults work fine on their own, and you can adjust them yourself if you want.
- **It's free.** Since there's no server-side conversion, it costs almost nothing to run. There are ads to help keep the site going, but I won't be locking any features away.

## How does it work under the hood?

At first I was planning to use ffmpeg.wasm, which is ffmpeg compiled to WebAssembly. But after trying several approaches side by side, I ended up using a GIF encoder called **gifski**. The difference in color was pretty big. I wrote up the whole process in my dev log:

- [1. The Limits of GIF and My Search for a Better Converter]({% post_url 2025-10-09-en-gif-limits %})
- [2. How to Turn Videos into High-Quality GIFs with FFmpeg]({% post_url 2025-10-18-en-ffmpeg-high-quality-gif %})
- [3. gifski: Getting Past GIF's 256-Color Limit]({% post_url 2025-10-20-en-gifski-256-colors %})

## What's next

When I first wrote this post I listed a few plans, and two of them are done.

- ~~Trimming GIFs~~ → added as the [GIF Trim](/en/gif-trim/) page
- ~~Adding text~~ → available in "Text Settings" after conversion
- Aspect ratio presets like square and vertical
- Converting multiple files at once
- Merging GIFs

Try the rest of the site too, and if there's a feature you feel is missing, let me know. I'll work through them one at a time, starting with whatever gets asked for most.

## Wrapping up

In the end, this project started with wanting to build **"a tool I'd actually want to use."** I figured other people probably had the same frustrations, so I made it public. It would honestly make me really happy if a lot of people found it useful.

If something's inconvenient or there's a feature you'd like added, feel free to tell me anytime through the [contact page](/en/contact/).
