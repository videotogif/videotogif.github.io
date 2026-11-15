---
layout: post
lang: en-US
locale: en_US
ref: discord-gif-size-limit
title: "Discord GIF Size Limits (20MB Free Since August 2026) and How to Fit Them"
date: 2026-11-11 11:00:00 +0900
category: "Guide"
tags: [Discord, DiscordGIF, DiscordFileSizeLimit, DiscordEmoji, ReduceGIFSize]
excerpt: "Discord raised its free upload limit from 10MB to 20MB in August 2026. Here's how to fit GIFs for chat and animated emoji within their limits, with numbers from GIFs I actually made."
description: "Discord's GIF upload limits (20MB free, 50MB with Nitro Basic), emoji GIF sizes, and the settings that fit a GIF under each limit, with measured file sizes."
permalink: /en/blog/discord-gif-size-limit/
---

When you try to post a GIF on Discord and get "file too large," the first confusing part is figuring out how small it needs to be. Search for it and you'll find 8MB, 10MB, and 25MB, because the limit has changed over the years. I went through it again as of November 2026.

## Current limits (as of November 2026)

| Where | Limit |
|---|---|
| Chat attachment (free) | **20MB** |
| Chat attachment (Nitro Basic) | 50MB |
| Chat attachment (Nitro) | Much higher |
| Server sticker | 512KB, 320×320px |
| Server emoji | Most sources say 256KB |

Starting **August 14, 2026**, Discord raised the upload limit for free users from 10MB to 20MB. Discord's help center article on attachments says so too. So the 10MB you'll see in older posts no longer applies.

One more thing changed at the same time: on mobile, the limit is now reportedly checked against the **original file size before compression.** Before, phones checked the size after compressing, so results differed from desktop. Now, if a file won't upload on your computer, assume it won't upload on your phone either.

Most guides list 256KB for emoji, but some say servers with higher boost levels accept larger ones, so I can't say for sure. Below, I used 256KB as the target. If the upload window shows a limit, trust that.

## GIFs for chat: fitting under 20MB

In [How to reduce GIF file size](/en/blog/reduce-gif-size/) I made a 4.5-second clip over and over with different settings. From those results you can work out how many MB each second adds, and roughly how long a GIF fits under 20MB.

| Width (10 fps · quality 100) | Size at 4.5s | Length that fits in 20MB (rough) |
|---|---|---|
| 900px | 13.98MB | about 6s |
| 720px | 9.12MB | about 9s |
| 540px | 5.20MB | about 17s |
| 400px | 2.96MB | about 30s |

That's for a clip of syrup being poured over a dessert at a café, where the whole frame moves a little. Videos where most of the screen stays still, like screen recordings, fit a lot longer. Handheld footage where the whole frame shakes fits less.

With the free limit at 20MB, a 900-pixel-wide GIF of 5–6 seconds now goes through as is. Back when the limit was 10MB, the same GIF wouldn't upload, so that's a big change.

Discord shrinks GIFs to fit the width of the chat window, so I think 540 pixels is plenty. At 540 you have room for about 17 seconds.

In the [converter](/en/), the settings are picked automatically when you add a video, and the file size appears once the GIF is made. If it's over 20MB, try these in order:

1. Keep only the part you need with [Trim GIF](/en/gif-trim/)
2. Move the quality slider one step toward Low-spec (the width goes down with it)
3. In Custom settings, lower quality to 80–70

## Animated emoji: fitting under 256KB

Emoji need to be dramatically smaller than chat GIFs, so I made them separately. I cropped the same clip to a square and made it **128×128 pixels.**

| Settings (128×128px) | Size | Under 256KB? |
|---|---|---|
| 2s · 10 fps · quality 90 | 164KB | Yes |
| 2s · 10 fps · quality 70 | 116KB | Yes |
| 4.5s · 5 fps · quality 70 | 190KB | Yes |
| 4.5s · 10 fps · quality 90 | 414KB | No |

At 128 pixels, **around 2 seconds** fits without lowering quality much. To fit 4.5 seconds, I had to drop to 5 frames per second and quality 70. Emoji show up tiny in chat anyway, so a short, simple looping motion looks better too.

Here's how I make them:

1. In your phone's photo editor, **crop the video to 1:1** and keep just 1–2 seconds of it
2. Add it to the [converter](/en/), open **Custom settings**, and set the size to 128, frames per second to 10, and quality to 80–90
3. Check that the GIF is under 256KB, then upload it under Emoji in your server settings

A video that isn't square will still work, but it gets shrunk to fit the emoji slot and looks even smaller. Cropping to 1:1 first gives a cleaner result.

## Animated profile pictures need Nitro

Animated avatars are a Nitro-only feature. If your profile GIF doesn't move on a free account, it's not a file size problem, so shrinking the GIF won't fix it.

## Summary

- Chat attachments: **20MB** free (since August 14, 2026; 10MB before that)
- At 540 pixels wide, a typical video fits **about 17 seconds**
- Make emoji **128×128, around 2 seconds** to stay under 256KB
- If it's over, shrink in this order: **length → width → quality**

These limits may change again. If they do, I'll update this post.
