---
layout: post
lang: en-US
locale: en_US
ref: phone-video-to-gif
title: "How to Make a GIF from a Video on iPhone or Android (No App Needed)"
date: 2026-11-16 09:00:00 +0900
category: "Guide"
tags: [MakeGIF, iPhoneGIF, AndroidGIF, SamsungGIF, VideoToGIF, PhoneGIF]
excerpt: "Turn a video from your phone into a GIF in the browser, without installing an app. Where the GIF ends up on iPhone and Galaxy, and how long the clip can be before it starts to look choppy."
description: "How to convert a video to a GIF and save it on iPhone (Safari) or Android (Chrome, Samsung Internet) without installing an app, how long a clip should be on a phone, and how this compares to Shortcuts and Samsung's AI Select."
permalink: /en/blog/phone-video-to-gif/
---

Sometimes you want to share a clip from your phone as a GIF in a group chat or forum. You used to need a GIF app for that. Now the browser on your phone is enough.

This post walks through turning a video into a GIF and saving it on iPhone and Android (I use a Samsung Galaxy as the example) without installing anything. It also covers the things that work differently on a phone.

## 1. Trim the video first

On a phone, this is the step that matters most. This site converts using your device's memory, and phones have less of it than computers, so the converter starts one level lighter there. That makes the length of the clip matter a lot.

Here's what the site picks at first for a 1080×1920 vertical video, the usual phone format. I got these numbers by running the site's own auto-settings code.

| Video length | Phone (starts at Lighter) | Computer (starts at Balanced) |
|---|---|---|
| 3–10 s | 226×402, 10 fps | 304×540, 10 fps |
| 15 s | 226×402, **5 fps** | 304×540, 10 fps |
| 20 s | 226×402, **5 fps** | 304×540, 10 fps |
| 30 s | **184×328**, 5 fps | 274×488, 10 fps |

On a phone, once a video goes past about 11 seconds, the frame rate drops from 10 to 5 frames per second. It still plays at the original speed, but the motion looks choppy. At around 30 seconds the size shrinks too. Horizontal videos work the same way, just turned sideways (400×226 on a phone, 540×304 on a computer).

A GIF moment rarely needs more than a few seconds, so **trim it to 3–6 seconds** before converting. Your phone can already do that.

- **iPhone:** Open the video in Photos, tap **Edit**, and drag the ends of the timeline at the bottom. Tap **Done** and choose **Save Video as New Clip** to keep the original.
- **Samsung Galaxy:** Open the video in Gallery and tap **Edit** (the pencil icon) to trim it. To keep the original, choose **Save as copy** when saving. Menu names vary a little between One UI versions.

## 2. Convert it in the browser

1. Open [videotogif.github.io/en/](/en/) in **Safari** on iPhone, or **Chrome** or **Samsung Internet** on Android.
2. Tap the box at the top to choose a video. On iPhone pick **Photo Library**; on Android pick the clip from your gallery or files.
3. The GIF is made right away. The video never leaves your phone; it's converted inside the browser.

When it's done, a line under the GIF shows its size, length and file size (for example, 226×402px · 5.0s · file size).

If you want it sharper, move the quality slider to the right, but High-spec at the far end can make a phone browser slow down or freeze. Go up one step at a time. To add a caption, use the **Text** tab, then drag the text on the GIF with your finger to move it.

## 3. Save it

### iPhone (Safari)

1. Tap **Download GIF**. Safari asks whether to download it; tap **Download**.
2. The file goes to the **Downloads** folder in the **Files** app. You can change where downloads go under **Downloads** in the Safari section of Settings.
3. To put it in Photos, open the GIF in Files, tap the **Share** button and choose **Save Image**. It stays animated in Photos.

### Android (Chrome, Samsung Internet)

1. Tap **Download GIF**. It saves, and a download notice appears at the bottom of the screen.
2. The file goes to the **Download** folder. On a Galaxy, you'll find it in **My Files** under **Downloads**, and in the Gallery app's **Download** album.

## 4. How is this different from the built-in options?

Your phone has its own ways to make a GIF without an extra app.

- **iPhone: Shortcuts.** The Shortcuts app has a **Make GIF** action, so you can build a shortcut that picks a video, turns it into a GIF and saves it to Photos. You can also add a ready-made GIF shortcut from the Gallery tab.
- **Samsung Galaxy: AI Select (formerly Smart Select), or Create GIF in the video player.** Where these live depends on the model and One UI version, and some versions have dropped the button.

For a quick one-off, those are handy. What they don't make easy is choosing the GIF's size or frame rate, or checking the file size and adjusting it.

This site changes size and smoothness together with one slider and shows the new file size right away. It encodes with gifski, which keeps colors as smooth as it can within GIF's 256-color limit. I wrote about why I chose it in [this post](/en/blog/gifski-256-colors/).

## 5. Tips for making GIFs on a phone

- **Keep it to 3–6 seconds.** As the table shows, past about 11 seconds it drops to 5 frames per second.
- **If it freezes or crawls, move the slider left.** Low-spec at the far left is 320px on the long side and 5 frames per second, the lightest setting. Closing other apps helps too.
- **If an iPhone video won't open on your computer, convert it on the iPhone.** With the default camera setting (High Efficiency), iPhones record HEVC (H.265), which may not open on a PC depending on the device and browser. Safari on the iPhone that recorded it can open it. To change future recordings, go to **Settings > Camera > Formats** and pick **Most Compatible**.
- **If the file is too big,** see [how to reduce GIF size](/en/blog/reduce-gif-size/). If it's going to Discord, check [Discord's GIF size limits](/en/blog/discord-gif-size-limit/) too.

## Summary

1. Trim the video to 3–6 seconds in Photos or Gallery
2. Open the [converter](/en/) in Safari (iPhone) or Chrome / Samsung Internet (Android) and pick the clip
3. Tap **Download GIF**: on iPhone it goes to Files > Downloads, on Android to the Download folder
4. On iPhone, use Share > Save Image in Files to add it to Photos

There's nothing to install and the video never leaves your phone, so it's an easy way to make a quick GIF.
