---
layout: post
lang: en-US
locale: en_US
ref: gif-vs-video
title: "GIF or Video? How I Decide"
date: 2025-11-26 10:00:00 +0900
last_modified_at: 2026-11-09 10:00:00 +0900
category: "Guide"
tags: [GIF, MP4, WebP, FormatComparison, VideoToGIF]
excerpt: "When you need to show something moving, should it be a GIF or an MP4? Here's how I pick, based on file size, compatibility, and autoplay."
description: "How I choose between GIF and MP4 video, based on file size, compatibility, autoplay, and image quality."
image: /assets/img/og-image.png
permalink: /en/blog/gif-vs-video/
---

When you're writing a blog post or a doc, sometimes you need to show something in motion. Every time, I end up going back and forth on whether to make a GIF or just upload the video. This is roughly how I decide.

## The short version

- **If it's short (under 10 seconds), doesn't need sound, and has to drop in anywhere like an image** → GIF
- **If it's long, needs sound, or the colors and image quality matter** → video (MP4)

The rest of this post explains where those rules come from.

## Why GIFs are so big

GIF is an image format from 1987. Each frame can use at most 256 colors, and there's almost none of the clever compression that stores only what changed from one frame to the next. Video formats like MP4, on the other hand, are built around exactly that "only store what changed" idea, so for the same footage, MP4 is usually much smaller.

That's also why, in the [FFmpeg post]({% post_url 2025-10-18-en-ffmpeg-high-quality-gif %}), converting to GIF without any options gave me 83.6MB. Getting the palette right shrinks it a lot, but once the clip gets long, it's just too much.

## Why I still use GIFs

### They go anywhere an image goes

A GIF is just an image, so it works almost anywhere an image does. Paste it into a GitHub README or issue, Notion, a company wiki, a Markdown doc, or a messaging app, and you're done. A video only plays where there's a player that supports it, and in Markdown you often have to link to it separately.

### They play and loop on their own

Nobody has to click anything. It starts moving right away and loops back to the beginning when it ends. For "please look at this" moments, like the steps of pressing a button or the moment an error shows up, nothing is easier.

### Most email clients show them

Videos almost never play inside an email, so if you want something moving, GIF is pretty much the only option. One catch: some desktop versions of Outlook only show the first frame of a GIF, so it's a good idea to make sure the first frame gets the point across on its own.

## When video is the better choice

- **Long clips, over 30 seconds**: the GIF would get way too big.
- **When you need sound**: GIFs can't carry audio.
- **Live-action footage with lots of gradients, like sunsets, skin, or shadows**: cutting it down to 256 colors tends to cause banding.
- **Video-first services like Instagram and YouTube**: Instagram's feed doesn't take GIF uploads, so you'd have to post a video anyway.

## If you're putting it on your own site

If you can edit the HTML yourself, like on your own blog or homepage, you can also use a video as if it were a GIF.

```html
<video autoplay loop muted playsinline>
  <source src="demo.mp4" type="video/mp4">
</video>
```

Most browsers will only autoplay it if `muted` is there. This way it loops on its own like a GIF, but the file is much smaller. The trade-off is that you can't use it in the places I mentioned above, like READMEs, email, or messaging apps.

## What about WebP and AVIF?

Animated WebP and AVIF files are smaller than GIF and don't have the 256-color limit. Browser support has gotten a lot better, too. But messaging apps, email, and all sorts of upload forms still don't accept them as universally as GIF, so when I don't know where something will end up, I still go with GIF.

## Summary

| Situation | What I'd use |
| --- | --- |
| Short screen clips for bug reports, READMEs, or Notion | GIF |
| Memes to send in a messaging app | GIF |
| Email newsletters | GIF (pay attention to the first frame) |
| Tutorials over 30 seconds, videos with sound | MP4 |
| Instagram, YouTube | MP4 |
| Background video embedded on your own site | MP4 (`autoplay loop muted`) |

If you've decided on GIF, I've written up the settings that keep the file size down in the [settings guide]({% post_url 2025-10-30-en-gif-settings-guide %}).
