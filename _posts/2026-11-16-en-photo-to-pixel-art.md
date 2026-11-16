---
layout: post
lang: en-US
locale: en_US
ref: photo-to-pixel-art
title: "How to Turn a Photo into Pixel Art (Not a Blurry Mosaic)"
date: 2026-11-16 20:00:00 +0900
category: "Guide"
tags: [PixelArt, PhotoToPixelArt, PixelArtMaker, 8bit, Divoom]
excerpt: "Shrinking a photo gives you a blurry mosaic, not pixel art. Why that happens, what has to change to make it look hand-drawn, and the steps to turn a photo into 16×16, 32×32 or 64×64 pixel art."
description: "How to convert a photo into 16×16, 32×32 or 64×64 pixel art for free. Why a plain resize turns into a blurry mosaic, the pixel art rules that fix it (lock the palette first, one color per pixel), and how to pick a photo that works."
permalink: /en/blog/photo-to-pixel-art/
---

Sometimes you want a profile picture or a photo of your pet as pixel art. But if you just shrink the photo, you don't get pixel art. You get a smeared, blurry mosaic.

This post explains where that difference comes from, and how to turn a photo into pixel art with this site's [Pixel GIF Maker](/en/pixel-gif/). It all runs in your browser, and the photo is never uploaded.

## 1. Why a plain resize looks like a blurry mosaic

When you shrink a photo to 16×16, a large area of the original becomes a single pixel. A normal resize paints that pixel with the **average** color of the area.

Take one pixel that sits on the edge between sky and cloud. Say 40 of the 64 points inside it are sky blue (90, 180, 240) and 24 are white cloud (250, 250, 250).

| How the pixel is painted | Color | Result |
|---|---|---|
| Average | (150, 206, 244), a pale blue | A new color that is neither sky nor cloud |
| The single most common color | (90, 180, 240), sky blue | The edge changes cleanly in one pixel |

Every pixel on an edge gets one of these in-between colors, so outlines smear and the number of colors climbs into the hundreds. A real photo is full of slightly different colors to begin with, so averaging can also sink the whole picture into gray. Pixel art drawn by hand works the other way around. The artist settles on a handful of colors first, then picks one of them for each pixel.

## 2. The rules that make it look like pixel art

This site doesn't just shrink the photo. It follows the rules you would use when drawing pixel art, in order.

1. **Pick the colors first.** Similar colors in the area you're converting are grouped into 8, 16 or 32 representative colors, whichever you choose. How different two colors are is measured by how different they look to the eye, not by the gap between RGB numbers.
2. **Paint each pixel with its most common color.** The photo is scaled to 8 times the grid size, so each pixel covers 8×8 = 64 points. Each point votes for one of the representative colors, and the pixel takes the winner, the same as the second row of the table above.
3. **Shift the hues slightly.** Light colors move up to 18° toward warm yellow, and dark colors up to 16° toward cool blue. If the darkest color is close to black, it becomes a deep navy instead. A picture whose shading only changes brightness looks flat, and this brings the light and shadow back to life.
4. **Clean up lone pixels.** A pixel whose top, bottom, left and right neighbors are all a different color reads as noise, not as part of the picture. Those pixels take the most common neighboring color.

**Vivid colors**, which is on by default, also raises saturation 1.35× and contrast 1.12× before the colors are grouped. On a tiny screen, colors that feel a bit strong actually read more clearly.

## 3. Turning a photo into pixel art, step by step

1. Open the [Pixel GIF Maker](/en/pixel-gif/) and drop a photo on the box at the top, or click it to choose one. JPG, PNG and iPhone HEIC photos all work as they are.
2. Pick a **Size**. See the table below.
3. Drag the bright square on the original to choose the part to convert. The preview updates right away.
4. Pick the number of **Colors**. 8 gives bold, simple pixel art, 16 is the default, and 32 keeps more of the photo's feel.
5. If a color in the palette doesn't look right, click it to change it. **Reset colors** brings the originals back.
6. Press **Make** and save the PNG.

| Size | Pixels | Works well for | Save large |
|---|---|---|---|
| 16×16 | 256 | One simple, icon-like shape | 256×256px |
| 32×32 | 1,024 | Pets, characters, a face from the front | 256×256px |
| 64×64 | 4,096 | A person from the chest up, landscapes | 512×512px |

**Fit** starts on **Fill (crop)**, which crops the photo to a square. **Show all** keeps the photo's own shape without cropping. A 3:4 portrait photo from a phone at 64 comes out as 48×64, for example.

## 4. How to pick a photo that works

- **One subject that clearly stands out from the background** works best, like a cat in front of a white wall or a yellow flower under a blue sky.
- **Faces are hard to make out at 16×16.** An eye is often smaller than one pixel. Start at 32×32 for faces, and use 64×64 if you want the expression to show.
- **Dark or backlit photos** end up with a palette that is almost all dark colors. Brighten the photo first, or leave Vivid colors on.
- **Text is barely readable even at 64×64.** If you want lettering, it's easier to add it by hand after converting.
- Move the square around a little while watching the preview. The same photo can come out very differently depending on where you crop.

## 5. Why there's a separate "Save large"

16×16 pixel art is a tiny file, 16 pixels wide. When you post it in a chat app or on social media, the app enlarges it to fit the screen and smooths it as it stretches, so the pixel edges blur again.

**Save large** scales each pixel up to an exact whole-number square in advance. At 16×16, each pixel becomes 16×16 real pixels, for 256×256 in total, and 32×32 and 64×64 are scaled 8 times. Every pixel is exactly the same size, so it stays crisp wherever you post it.

- **For a pixel display like Divoom:** the original-size file
- **For chats, social media or a profile picture:** the large file

## 6. Videos work the same way

Drop a video on the same page and you get an animated pixel art GIF. It looks at 12 frames from the part you picked and settles on one palette, so every frame uses the same colors and nothing shimmers as the scene changes. Pixels that barely change keep the previous frame's color, which cuts down on flicker too.

12 frames per second is usually enough for pixel animation. Start with 2 to 4 seconds. If you need a regular GIF rather than pixel art, use the [video to GIF converter](/en/).

## Summary

1. Add a photo (JPG, PNG, HEIC) to the [Pixel GIF Maker](/en/pixel-gif/)
2. Pick a size: 16 for simple shapes, 32 for pets and characters, 64 for people and landscapes
3. Move the square so the subject fills it, then adjust the number of colors and the palette
4. Use the original size for a device and Save large for social media

The difference between a shrunken mosaic and pixel art comes down to this: choose the colors first, then give each pixel a single color. Try it on a photo you like and compare.
