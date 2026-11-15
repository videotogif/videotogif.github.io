---
layout: post
lang: en-US
locale: en_US
ref: github-gif
title: "How to Add GIFs to GitHub Issues and READMEs (and Fit the 10MB Limit)"
date: 2026-11-11 10:00:00 +0900
category: "Guide"
tags: [GitHub, README, GIFAttachment, BugReport, Issues, PullRequests]
excerpt: "How to attach GIFs to GitHub issues and pull requests, two ways to put a demo GIF in a README, and the order to shrink a GIF when it hits the 10MB limit."
description: "How to add GIFs to GitHub issues, pull requests, and READMEs, the 10MB attachment limit for images and GIFs, and how to shrink a GIF that goes over it."
permalink: /en/blog/github-gif/
---

About half the places I attach GIFs are on GitHub: filing a bug, showing "here's what changed" in a pull request, putting a demo at the top of a README. Early on, a few times I dragged a GIF in and nothing happened, or it uploaded but loaded painfully slowly in the README. Here's what I learned from that.

## Attaching to issues, pull requests, and comments

Just **drag and drop or paste** the GIF into the text box of an issue or pull request. When the upload finishes, a line like this is added automatically:

```markdown
![Screen recording](https://github.com/user-attachments/assets/...)
```

Click the Preview tab and you'll see the GIF playing right away. There's nothing else to set up.

## Size limit: 10MB for images and GIFs

According to GitHub's docs, the attachment limits are:

| Type | Limit |
|---|---|
| Images and GIFs | 10MB |
| Videos | 10MB (100MB on paid plans or organization repositories) |
| Other files | 25MB |

A GIF over 10MB won't upload, and that happens sooner than you'd think. A 4.5-second GIF I made for comparison (900px wide, 45 frames) came out at 14MB. Screen recordings are smaller than regular video, but a full-screen recording longer than 10 seconds goes past 10MB easily.

## What to cut when you're over 10MB

In [How to reduce GIF file size](/en/blog/reduce-gif-size/) I made the same clip 14 times with different settings. This is the order I settled on:

1. **Cut the length.** The size drops in proportion to the frame count, with no quality loss. Trim the time spent hunting for the mouse at the start and end with [Trim GIF](/en/gif-trim/). Reproducing a bug usually takes 3–5 seconds.
2. **Reduce the width.** This has the biggest effect. Going from 900 to 720 pixels wide saved 35%, and 540 saved 63%. Issue bodies aren't very wide, so a GIF rarely gets shown at the full 900 pixels anyway.
3. **Lower quality to 80–70.** Going from 100 to 70 saved 32%, and I only saw the difference when I enlarged it 2×.
4. **Lower frames per second.** For clicks and menus opening, 10 frames per second is enough. Going lower makes motion look choppy, so save this for last.

In the [converter](/en/), the settings are picked automatically from your video's length and resolution, and the file size shows up under the result. If it's over 10MB, move the quality slider down one step, or reduce the size in Custom settings and make it again.

## Putting a demo GIF in a README

There are two ways to do it.

### Option 1: Commit the GIF to the repository

Commit the file somewhere like `docs/demo.gif` and reference it with a relative path.

```markdown
![Demo](docs/demo.gif)
```

The file moves with the repository, so the link won't break. The downside is that every time you replace the GIF, another large file piles up in the repository history. I only do this for one main demo that doesn't change often.

### Option 2: Use the address from an issue upload

Drag the GIF into the text box of any issue or pull request, copy the `user-attachments` address it creates, and paste that into your README. You don't even have to save the issue, since the upload is already done and the address works. The upside is that your repository doesn't get heavier.

One catch: attachments uploaded in a private repository can only be seen by people with access. If it's going in a public README, upload it from a public repository to be safe.

### Changing the display size

Markdown's `![]()` can't set a size, so use an HTML tag if you want to change how big it shows:

```html
<img src="docs/demo.gif" alt="Demo" width="600">
```

This only changes **how big it looks.** The file size stays the same, so if your README loads slowly, you need to remake the GIF smaller. The README is the first thing people see in your repository, so I try to keep demo GIFs under 3–5MB.

## When a video works better than a GIF

GitHub also lets you upload videos like MP4 straight into issues and pull requests, and they play on the page. If it's long or needs sound, a video is better. If you want a short action to loop automatically, a GIF is better, because a video needs a click to play while a GIF moves as soon as the page opens. I go into more detail on choosing between them in [GIF or Video? How I Decide](/en/blog/gif-vs-video/).

## Summary

- For issues and pull requests, just **drag and drop**. Images and GIFs can be **up to 10MB**
- If it's over, shrink in this order: **length → width → frames per second**
- For READMEs, either **commit the file** or **use the address from an issue upload**
- `width` only changes how big it looks, so if it's slow, remake the GIF smaller

If you need to record your screen as a GIF first, start with [How to turn a screen recording into a GIF](/en/blog/screen-recording-to-gif/).
