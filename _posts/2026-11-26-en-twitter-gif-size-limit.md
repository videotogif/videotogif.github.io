---
layout: post
lang: en-US
locale: en_US
ref: twitter-gif-size-limit
title: "X (Twitter) GIF Size Limits: 15MB, 350 Frames, and How to Fit Them"
date: 2026-11-26 14:10:00 +0900
category: "Guide"
tags: [X, Twitter, TwitterGIF, GIFSizeLimit, ReduceGIFSize]
excerpt: "GIFs on X (Twitter) have limits beyond 15MB: 350 frames and 1280×1080. Here's how many seconds fit in 15MB at each width, worked out from GIFs I actually made."
description: "X (Twitter) GIF upload limits (15MB, 350 frames, 1280×1080, one per post), how long a GIF fits in 15MB at each width, and the settings that keep a GIF within the limits, with measured file sizes."
permalink: /en/blog/twitter-gif-size-limit/
---

When a GIF fails to post on X (Twitter), file size is the first suspect. But X also has separate limits on frame count and resolution. Here are the limits from X's developer documentation and how to make a GIF that fits them, as of November 2026.

## X's GIF limits

X's developer docs on uploading media list these limits for animated GIFs.

| Item | Limit |
|---|---|
| File size | **15MB** |
| Resolution | 1280 wide × 1080 tall or smaller |
| Frames | **350 or fewer** |
| Total pixels | width × height × frames of 300 million or less |
| Per post | 1 GIF (up to 4 photos, or 1 video) |

The docs list 15MB for both default accounts and X Premium accounts. They also say a GIF "may fail during Post creation even if it is within the file size limit," so file size isn't the only thing to get right.

These limits come from the developer documentation. I couldn't check X's in-app help pages this time, so I won't claim the app uses exactly the same numbers. Staying inside them is still the safest choice.

## You don't need to worry about resolution or total pixels

GIFs made on this site are at most 900 pixels on the long side, so they always fit within 1280×1080.

Total pixels have room too. Even the largest landscape GIF (900×506) at 350 frames comes to about 160 million, roughly half of 300 million. So the two limits you actually need to fit are **15MB and 350 frames**.

## How many seconds is 350 frames?

Frame count is **length (seconds) × frames per second ÷ playback speed**. At normal speed (1x), this is how much fits.

| Frames per second | Length that fits in 350 frames |
|---|---|
| 5 | 70s |
| 10 | 35s |
| 20 | 17.5s |
| 25 | 14s |

Usually you'll hit 15MB before 350 frames. But at a smooth 25 frames per second, the frame limit kicks in at 14 seconds. In the [converter](/en/), **Custom settings** shows the total number of frames as you change the sliders, so you can check before making the GIF.

## Fitting 15MB: length at each width

For [How to reduce GIF size](/en/blog/reduce-gif-size/), I made a 4.5-second clip again and again with different settings. Working out how many MB each second adds gives a rough idea of how long a GIF fits in 15MB.

| Width (10 fps · quality 100) | Size at 4.5s | Length that fits in 15MB (rough) |
|---|---|---|
| 900px | 13.98MB | about 4.8s |
| 720px | 9.12MB | about 7s |
| 540px | 5.20MB | about 12s |
| 400px | 2.96MB | about 22s |

That's a clip of syrup being poured on a dessert in a café, where the whole frame moves a little. A screen recording, where most of the screen stays still, fits much longer. A handheld clip where the whole frame shakes fits less.

The timeline scales GIFs down to fit the screen width, so I think **540 pixels** is plenty. At 540 you get about 12 seconds. If you want 900 pixels, trim the clip to under 5 seconds.

## Step by step

1. Add your video to the [converter](/en/). On a computer it starts at the **Balanced** level (540px on the long side, 10 frames per second). On a phone it starts one step lighter.
2. When it's done, check the file size. If it's over 15MB, cut it down in this order:
   1. Keep only the part you need with [Trim GIF](/en/gif-trim/)
   2. Move the quality slider one step toward Low-spec
   3. In **Custom settings**, lower quality to 80–70
3. In the X post composer, upload the GIF with the **photo (media) icon**. The composer's GIF button searches a GIF library, so your own file goes in through the photo icon.

You can only put one GIF in a post, and you can't combine it with photos. To show several scenes, split them across posts or join them into one GIF.

## When the clip is too long for 15MB

X is known to convert uploaded GIFs into a video format for playback. So if a long clip needs its size and quality cut a lot to fit 15MB, posting it as a video (MP4) in the first place may look sharper. [GIF or video?](/en/blog/gif-vs-video/) covers how to choose.

## Summary

- X GIF limits: **15MB**, **350 frames**, 1280×1080 or smaller, **1 per post**
- GIFs from this site always fit the resolution and total-pixel limits
- At **540 pixels** wide, a typical clip fits in 15MB up to **about 12 seconds**
- If it's too big, cut **length → quality slider → quality**, in that order
- Upload your own GIF with the **photo icon**, not the GIF button

These limits can change. If they do, I'll update this post. For GIFs going elsewhere, see [Discord GIF size limits](/en/blog/discord-gif-size-limit/) and [Adding GIFs to GitHub](/en/blog/github-gif/).
