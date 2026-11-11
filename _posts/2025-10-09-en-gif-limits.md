---
layout: post
lang: en-US
locale: en_US
ref: gif-limits
title: "1. The Limits of GIF and My Search for a Better Converter"
date: 2025-10-09 09:00:00 +0900
category: "Dev log"
tags: [GIFLimits, GIF256Colors, GIFColor, GIFFormat, FFmpeg, DevJourney]
excerpt: "Why do so many GIF converters give you dull colors? The start of a short journey into the built-in limits of the GIF format and the search for a better way."
description: "A look at the fundamental limits of the GIF file format, why GIF colors look muddy, and the search for a better way to convert video to GIF."
image: /assets/img/post-bunny.jpg
permalink: /en/blog/gif-limits/
---

> git commit -m "Quest for the ultimate GIF, part 1"

## Maybe I could make a better one?

If you blog at all, you probably reach for a video-to-GIF converter now and then. I use them a lot myself, but I never found one I was really happy with.

Sites like ezgif fall short on color and image quality.
The GIF maker in Naver Blog (Naver is Korea's biggest portal) has nice colors, but it limits you to 3 seconds and the image quality is really poor.

Why is that? And so began my short journey into GIFs.

## The limits of GIF

First off, it turns out the GIF format just "has bad color to begin with." Heh.

> 💡 **Note**: [What is a GIF file? GIF file structure and LZW compression](https://blog.naver.com/ghdalswl77/223953976591) (in Korean) - a short overview of GIF

That's because GIF has a technical constraint: it can **only display up to 256 colors**.

You're taking 24-bit video that can hold over 16 million colors and squeezing it into an 8-bit image with only 256. A lot of color gets lost along the way, so it's no surprise a GIF looks muddier than the original.

### The 256-color limit

```
24-bit true color video: 16,777,216 colors
↓ (conversion)
8-bit GIF: only 256 colors available
```

This huge loss of color is the fundamental reason GIFs look muddier than the original.

### Naver Blog's secret

By the way, GIFs made with Naver Blog have pretty nice colors, and there's a good chance they use some GIF technique to correct the tones. That's your hint! In [part 3]({% post_url 2025-10-20-en-gifski-256-colors %}) I open up the GIF files themselves and compare them.

That's where my guessing about GIF colors ended for now. So how do you make a smoother GIF?

## Cloning ezgif

To learn more about smooth-motion GIFs, I tried building a clone of ezgif (just its GIF conversion feature).

If you've used it, you know it takes a while to generate and the quality is a bit disappointing. 😢

### What I found out about ezgif

From what I could tell, ezgif is a server-side service and appears to use **FFmpeg**.

Why do I think so? Because the description at the bottom of the ezgif site includes lines like these:

> "Frame rate (fps)... smoother animation... increasing perceived quality but greatly increases the file size."
>
> "If you want to change the dimensions of the GIF or crop out only part of the video, you can use our resize and crop tools..."

Adjusting the frame rate and handling resizing and cropping as separate tools is a setup you often see in services that process video with FFmpeg. (That's my guess, not something I've confirmed.)

## Aha! So it converts with FFmpeg!

But wait, what's FFmpeg? 🤔

Next up, I dig into FFmpeg. In the [next post]({% post_url 2025-10-18-en-ffmpeg-high-quality-gif %}), I'll go through how to use FFmpeg directly to make high-quality GIFs, step by step!
