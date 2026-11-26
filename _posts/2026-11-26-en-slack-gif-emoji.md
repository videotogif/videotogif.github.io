---
layout: post
lang: en-US
locale: en_US
ref: slack-gif-emoji
title: "Slack GIF Emoji: How to Fit 128KB and 50 Frames"
date: 2026-11-26 14:00:00 +0900
category: "Guide"
tags: [Slack, SlackEmoji, SlackGIF, AnimatedEmoji, ReduceGIFSize]
excerpt: "An animated Slack emoji has to fit two numbers: 128KB and 50 frames. Here's how to work out how many seconds 50 frames is, and how far a 128×128 GIF actually fits, using GIFs I made."
description: "Slack custom emoji GIF requirements (under 128KB recommended, up to 50 frames), the settings for turning a video into an animated emoji, how to upload it, and what to check when the emoji doesn't move."
permalink: /en/blog/slack-gif-emoji/
---

When an animated emoji won't go into Slack, it's usually one of two things: the file is too big, or it has too many frames. Here are the requirements from Slack's help center and how to make a video into an emoji that fits them, as of November 2026.

## What Slack asks for

Slack's help article on adding custom emoji says this.

| Item | Requirement |
|---|---|
| Formats | JPG, PNG, GIF |
| File size | Under 128KB "works best" |
| GIF frames | **Up to 50 frames** |
| Shape | Square, with a transparent background recommended |
| Where you can add them | Desktop app, iOS app (not yet possible in the Android app) |

For file size, the article only says images under 128KB work best. I couldn't confirm from the docs whether anything over 128KB is always rejected. Staying under 128KB removes the question, so that's the target in this post.

The frame count is stated plainly as "up to 50 frames," so get that right first.

## How many seconds is 50 frames?

A GIF's frame count works out like this.

**Frames = length (seconds) × frames per second ÷ playback speed**

At normal speed (1x), this is how long a clip fits in 50 frames.

| Frames per second | Length that fits in 50 frames |
|---|---|
| 5 | 10s |
| 10 | 5s |
| 20 | 2.5s |
| 25 | 2s |

An emoji shows up at about the size of a letter inside a message, so 10 frames per second looks smooth enough and gives you up to 5 seconds.

You can also speed it up. A 4-second clip at 10 frames per second and 2x speed is 20 frames and plays in 2 seconds. That works well for slow movements.

In the [converter](/en/), **Custom settings** shows the total number of frames right under the sliders as you change them, so you can check against 50 before making the GIF.

## Fitting 128KB: sizes from GIFs I made

When I made [Discord emoji](/en/blog/discord-gif-size-limit/), I cropped a video to a square and made it at **128×128 pixels**. It's a clip of syrup being poured on a dessert in a café, where the whole frame moves a little. Here's how those results compare with Slack's number.

| Settings (128×128px) | Frames | Size | Under 128KB? |
|---|---|---|---|
| 2s · 10 fps · quality 70 | 20 | 116KB | Yes |
| 2s · 10 fps · quality 90 | 20 | 164KB | No |
| 4.5s · 5 fps · quality 70 | 23 | 190KB | No |
| 4.5s · 10 fps · quality 90 | 45 | 414KB | No |

Only **2s · 10 fps · quality 70** fit under 128KB. The 4.5-second setting that fit Discord's 256KB emoji limit was too big for Slack. Slack's number is half of Discord's, so keeping the clip **around 2 seconds** is the safest bet.

These numbers are for a clip where the whole frame moves. If only a small part moves, like a face changing expression in front of a plain background, the same settings give a much smaller file.

## Step by step

1. In your phone's photo editor, **crop the video to 1:1** and keep only the 1–2 seconds you want.
2. Add it to the [converter](/en/), open **Custom settings**, and set size to 128, frames per second to 10, and quality to 70.
3. Check that the frame count shown below is 50 or less, then press **Remake with these settings**.
4. When it's done, check that the size shown is under 128KB, and save it.

A video that isn't square still works, but it gets shrunk to fit the emoji box and looks smaller. Cropping to 1:1 first looks cleaner.

A GIF made from video doesn't have a transparent background. A transparent background is only a recommendation, and Slack accepts JPGs, which can't be transparent, so a background is fine for uploading.

## How to add it to Slack

These are the steps from Slack's help center.

- **Desktop:** smiley face icon in the message field → **Add Emoji** → **Upload Image** and pick the file → enter a name → **Save**
- **iOS:** tap the smiley face icon in the message field → enter a name and choose to add a custom emoji → upload the image → tap **Add** in the top right
- **Android:** you can't add custom emoji from the Android app yet, so do it from a computer or an iPhone.

If you don't see Add Emoji, the workspace owner has probably limited who can add custom emoji. Ask an admin.

## When the emoji doesn't move

If your GIF sits still, it may be your own Slack settings rather than the file. Slack has a setting that turns animations off.

- **Desktop:** profile picture → **Preferences** → **Accessibility** → under Other display options, **Automatically play animations in Slack**
- **iOS:** profile picture → **Preferences** → under Accessibility, **Animation & Haptics** → **Allow Animated Images** (with Sync with iOS on, it follows your iPhone's setting)
- **Android:** profile picture → **Preferences** → **Allow animated images & emoji**

If it moves for other people but not for you, check this setting first.

## Summary

- Slack emoji GIFs can have **up to 50 frames**, and **under 128KB** is recommended
- 50 frames is **5 seconds** at 10 fps, or **2 seconds** at 25 fps
- At 128×128, **2s · 10 fps · quality 70** fit under 128KB
- If it's too big, cut **length → quality → frames per second**, in that order
- If it doesn't move, check the animation setting under Slack's **Preferences → Accessibility**

If Slack changes these numbers, I'll update this post. For Discord emoji, see [Discord GIF size limits](/en/blog/discord-gif-size-limit/), and for how GIF size works, see [How to reduce GIF size](/en/blog/reduce-gif-size/).
