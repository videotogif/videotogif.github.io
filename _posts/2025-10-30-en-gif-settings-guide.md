---
layout: post
lang: en-US
locale: en_US
ref: settings-guide
title: "GIF Settings Explained: Frame Interval, FPS, Width, and Quality"
date: 2025-10-30 10:00:00 +0900
last_modified_at: 2026-11-09 10:00:00 +0900
category: "Tutorial"
tags: [GIFSettings, FrameInterval, FPS, ReduceGIFSize, GIFQuality]
excerpt: "What the four values in Advanced Settings actually change, compared across 8 GIFs made from the same video. I merged my scattered posts about settings into this one."
description: "How frame interval, FPS, output width, and quality in Video to GIF change playback speed and file size, compared across 8 GIFs made from one video."
image: /assets/img/post1.jpg
permalink: /en/blog/gif-settings-guide/
---

> I've written several posts about settings over time, but when I reread them, they overlapped and some of them were wrong. One even said a lower quality number means higher quality. It's the other way around. Sorry for the confusion. So I rewrote everything into this one post, based on how the code actually works.

## Results first

<div class="gif-compare">
  <figure>
    <img src="/assets/img/post7_1.gif" alt="GIF made with the default settings" loading="lazy">
    <figcaption>Defaults, untouched (15 frames, 1.5s, 4.5MB)</figcaption>
  </figure>
  <figure>
    <img src="/assets/img/post7_2.gif" alt="GIF made after changing the settings" loading="lazy">
    <figcaption>Only two values changed (45 frames, 4.5s, 14MB)</figcaption>
  </figure>
</div>

Both come from the same 4.5-second video. The left one is what you get if you upload and don't touch anything. The right one is what you get after changing just two values in Advanced Settings.

![Advanced Settings panel](/assets/img/post7_3.png)

The two changes were Frame Interval (0.3 → 0.1 seconds) and Quality (90 → 100). Why the left one looks weirdly fast-forwarded is the whole point of this post, so let me go through the settings one at a time.

## Frame Interval: how often to grab a frame from the original

The converter goes through the video from start to finish, skipping ahead by this interval and capturing a frame each time. At 0.3 seconds, that's 0s, 0.3s, 0.6s, and so on. So this setting pretty much decides how many frames end up in your GIF.

```
Frames ≈ video length ÷ frame interval

4.5s video, 0.3s interval → 15 frames
4.5s video, 0.1s interval → 45 frames
```

A shorter interval makes the motion smoother, and the file gets bigger with the extra frames. The shortest interval you can pick in this converter is 0.1 seconds.

## FPS: how many of those frames to show per second

FPS is used when the GIF plays, not when frames are captured. The frame count stays the same; only the speed at which the frames flip by changes. At first I also assumed a lower FPS would make the file smaller, but in this converter it doesn't. These two are the proof.

<div class="gif-compare">
  <figure>
    <img src="/assets/img/post7_4프레임-5.gif" alt="GIF made with a 0.1s interval and FPS 5" loading="lazy">
    <figcaption>0.1s interval + FPS 5 (9s, 14MB)</figcaption>
  </figure>
  <figure>
    <img src="/assets/img/post7_5프레임-20.gif" alt="GIF made with a 0.1s interval and FPS 20" loading="lazy">
    <figcaption>0.1s interval + FPS 20 (2.25s, 14MB)</figcaption>
  </figure>
</div>

Both have 45 frames, and both are exactly 14MB. The only difference is that the left one plays in slow motion and the right one plays at 2x speed.

## Why you need to look at both together: playback speed

Frame interval multiplied by FPS gives you the playback speed. This is where people get confused the most.

```
Playback speed = frame interval × FPS

0.1s × 10fps = 1x (original speed)
0.3s × 10fps = 3x (default)
0.2s × 5fps  = 1x (original speed, but choppier)
```

The defaults play three times faster than the original. For short meme clips that can actually be kind of fun, but when speed matters, like in a screen recording, it's better to match it. To get the original speed, set FPS to `1 ÷ interval`. A 0.1s interval means FPS 10, 0.2s means 5, and 0.5s means 2.

## Comparison table

Every GIF in this post was made from the same 4.5-second video, converted at 900px wide. Here are the frame count, playback length, and file size for each:

| Frame Interval | FPS | Frames | Playback Length | File Size |
| :---: | :---: | :---: | :---: | :---: |
| 0.1s | 5 | 45 | 9.0s (0.5x speed) | 14.0MB |
| 0.1s | 10 | 45 | 4.5s (original speed) | 14.0MB |
| 0.1s | 20 | 45 | 2.25s (2x speed) | 14.0MB |
| 0.2s | 5 | 23 | 4.6s (original speed) | 7.5MB |
| 0.3s | 3 | 15 | 5.0s (original speed) | 5.0MB |
| 0.5s | 10 | 9 | 0.9s (5x speed) | 3.0MB |
| 1s | 10 | 5 | 0.5s (10x speed) | 1.7MB |

As you can see, file size follows the frame count no matter what the FPS is. Going from a 0.1s interval to 0.2s cut both the frame count and the file size almost in half.

Here's what happens if you keep the original speed and only stretch the interval. You can see the motion getting choppier.

<div class="gif-compare">
  <figure>
    <img src="/assets/img/post7_2.gif" alt="0.1s interval, FPS 10" loading="lazy">
    <figcaption>0.1s + FPS 10 (14MB)</figcaption>
  </figure>
  <figure>
    <img src="/assets/img/post7_7_fps2.gif" alt="0.2s interval, FPS 5" loading="lazy">
    <figcaption>0.2s + FPS 5 (7.5MB)</figcaption>
  </figure>
  <figure>
    <img src="/assets/img/post7_7_fps3.gif" alt="0.3s interval, FPS 3" loading="lazy">
    <figcaption>0.3s + FPS 3 (5.0MB)</figcaption>
  </figure>
</div>

## Output Width

This is the setting that affects file size the most. When you reduce the width, the height shrinks proportionally too, so the pixel count drops with the square. Going from 800px to 400px leaves you with a quarter of the pixels.

When you upload, the width is set to the original video's width automatically, and the maximum is 900px. I wrote [a separate post]({% post_url 2025-10-28-en-why-900px %}) about why it stops at 900px. Making it bigger than the original doesn't really do anything, since it can't add detail that wasn't there.

## Quality (1~100)

Higher means better quality, and the default is 90. This value is passed straight to the GIF encoder (gifski). Lowering it makes the encoder cut colors more aggressively and use more noise, and in exchange the file gets smaller.

Screen recordings with simple colors usually don't show much difference when you lower the quality, but videos with lots of gradients, like sunsets or skin, show it right away. That's why quality is best left for last.

## What to cut first when the file is too big

1. **Shorten it first.** The frame count goes up with the length, so this works the most reliably. You can also put the finished GIF into [Trim GIF](/en/gif-trim/) and keep only the part you need.
2. **Reduce the width.** The effect is squared.
3. **Increase the frame interval.** Changing 0.1s to 0.2s halves the frame count. If you want to keep the same speed, cut FPS in half too.
4. **If it's still too big, lower the quality.**

FPS doesn't help with file size, so only use it to adjust the speed.

## Starting values for different uses

There isn't one right answer, so here are just some values that work well as a starting point.

| Use | Frame Interval | FPS | Width |
| --- | :---: | :---: | :---: |
| Bug reports, screen recordings | 0.2s | 5 | Original (the text has to be readable) |
| Memes, reactions | 0.1s | 10 | 400~480px |
| As smooth as possible | 0.1s | 10 | Trim the video short and reduce the width |
| Fast, timelapse-style | 0.5s | 10 | Whatever you like |

At original speed, 0.1s + FPS 10 is the smoothest setting this converter can do. I'm hoping to add a way to capture frames more densely later on.

Upload limits are different for every social network and messaging app, and they change often, so I didn't list numbers here. Check the service's help page once before you upload.

## Adding text

If you type something into Text Settings and generate the GIF again, you can drag the text around on the finished GIF to move it. The defaults (white text, black background, 0.6 opacity) look fine in most cases. For font size, I recommend around 30~50px so the text is still readable when the GIF is displayed smaller.

## In short

- Frames = length ÷ interval, playback speed = interval × FPS
- To shrink the file: length → width → interval, in that order
- Higher quality is better; touch it last

I covered why GIF colors come out duller than the original, and why this converter uses gifski, in my dev log series.

- [1. The Limits of GIF and My Search for a Better Converter]({% post_url 2025-10-09-en-gif-limits %})
- [2. How to Turn Videos into High-Quality GIFs with FFmpeg]({% post_url 2025-10-18-en-ffmpeg-high-quality-gif %})
- [3. gifski: Getting Past GIF's 256-Color Limit]({% post_url 2025-10-20-en-gifski-256-colors %})
