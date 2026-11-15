---
layout: post
lang: en-US
locale: en_US
ref: screen-recording-to-gif
title: "How to Turn a Screen Recording into a GIF (Mac and Windows, Nothing to Install)"
date: 2026-11-11 09:00:00 +0900
category: "Guide"
tags: [ScreenRecording, ScreenRecordingToGIF, MacScreenRecording, WindowsScreenRecording, BugReport, MakeGIF]
excerpt: "Record your screen with the tools already built into Mac and Windows, then turn the video into a GIF. Plus how to record so the text stays sharp."
description: "How to turn a screen recording from macOS (⌘+Shift+5) or Windows 11 (Win+Shift+R) into a GIF, and how to keep text sharp and the file small."
permalink: /en/blog/screen-recording-to-gif/
---

The moment I make GIFs most often is when I'm explaining a bug. A three-second GIF gets "the menu flickers when you click the button twice" across much faster than writing it out. So when I built this site, a screen recording was the first kind of video I had in mind.

This post covers recording your screen with nothing but what Mac and Windows already come with, and turning that recording into a GIF.

## 1. Record your screen

### Mac: ⌘ + Shift + 5

1. Press **⌘ + Shift + 5** and a toolbar appears at the bottom of the screen.
2. The two buttons on the right are for recording: **Record Entire Screen** and **Record Selected Portion**. For a GIF, pick **Record Selected Portion** almost every time.
3. Drag to choose the area, then click **Record**.
4. To stop, click the stop button (■) in the menu bar at the top right, or press **⌘ + Control + Esc**.

The recording is saved to your desktop as a `.mov` file by default. Under **Options** in the same toolbar you can change where it's saved, or turn on **Show Mouse Clicks**, which draws a circle wherever you click. For bug reports I'd turn that on, because it shows exactly where you clicked.

### Windows 11: Win + Shift + R

1. Press **Win + Shift + R** to open Snipping Tool in recording mode. (Win + Shift + **S** is the screenshot shortcut, which is easy to mix up.)
2. Drag to choose the area and click **Start**.
3. When you're done, click stop and save it from the Snipping Tool window.

It's saved as an `.mp4`, usually in **Videos > Screen Recordings**. If the shortcut doesn't work, try updating Snipping Tool from the Microsoft Store. Sometimes another app that remaps keys is already using the same shortcut.

For a game or a single app window, **Win + Alt + R** (Xbox Game Bar) also works. It records per app window, though, so it doesn't pick up the desktop or File Explorer well. For GIFs, Snipping Tool is easier because you choose the area yourself.

## 2. Turn the video into a GIF

Drag the `.mov` or `.mp4` into the [Video to GIF converter](/en/). The conversion happens inside the browser you're using right now, so the file isn't uploaded anywhere. That turns out to matter more than you'd think when you've recorded a work screen or something that isn't public yet.

Once you add the video, the settings are picked automatically from its length and resolution, and you can adjust everything at once with the quality slider (Low-spec to High-spec). For screen recordings the defaults are usually fine, and the tips below make the result a lot better.

If your browser can't open the format, you'll see a message. Recordings from the Mac's built-in tool (.mov) and Windows Snipping Tool (.mp4) usually open right away in Chrome, Edge, and Safari.

## 3. Keep text from getting blurry

The most annoying thing about screen recording GIFs is blurry text. Most of the time it happens because **the GIF ends up smaller than what you recorded.**

On a Mac's Retina display, the actual pixels are twice the size you see. If you record an area that looks about 600 wide on screen, the video is saved at 1200 pixels wide. But this converter makes GIFs at most 900 pixels on the long side (I explain why in [this post](/en/blog/why-900px/)). So 1200 gets scaled down to 900, and the text gets a little mushy.

Here's how I record:

- **Keep the area small.** If you only record the part where the bug happens, there's less to scale down. I almost never record the full screen.
- **Zoom in the browser.** For web pages, press ⌘ (Ctrl) + `+` to go to 125–150% before recording. The text stays readable even after the GIF is scaled down.
- **In Custom settings, match the size to the original.** If your recording is narrower than 900 pixels, keeping the same size as the original gives the sharpest result. Making it bigger only makes it blurrier.

## 4. Keep the file small

Screen recordings are great material for GIFs. They have fewer colors and most of the screen stays still, so they usually come out smaller than regular video of the same length. Still, three things are worth doing:

- **Keep it under 5–10 seconds.** Length multiplies the file size directly. If there's time spent hunting for the mouse at the start or end, cut it in [Trim GIF](/en/gif-trim/).
- **10 frames per second is plenty.** Clicks and menus opening look natural at 10 frames per second. Only go higher for scenes where the whole screen moves, like scrolling.
- **Tidy the screen before you record.** Notifications, a clock with seconds, animated ads: anything that keeps changing adds to the file size.

Depending on where it's going, there's a size you can't go over. If you're attaching it to a GitHub issue, see the [GitHub GIF post](/en/blog/github-gif/). For the general order of shrinking a GIF, see [How to reduce GIF file size](/en/blog/reduce-gif-size/).

## Summary

1. On Mac press **⌘ + Shift + 5**, on Windows 11 press **Win + Shift + R**, and record only the area you need
2. Drop the recording into the [converter](/en/) (the file never leaves your browser)
3. If the text is blurry, record a smaller area or zoom in and record again
4. If it's long, trim the start and end in [Trim GIF](/en/gif-trim/)

Once you start attaching GIFs to bug reports, you get asked "how do I reproduce this?" a lot less. Try it once and you'll see why I ended up building this site.
