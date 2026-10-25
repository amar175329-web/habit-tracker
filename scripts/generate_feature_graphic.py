#!/usr/bin/env python3
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_feature_graphic(out_path):
    width, height = 1024, 500
    im = Image.new("RGB", (width, height), (9, 9, 13))
    draw = ImageDraw.Draw(im)

    # Gradient background with emerald/teal subtle glow
    glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    
    # Left ambient orb
    glow_draw.ellipse([(-100, -100), (450, 450)], fill=(16, 185, 129, 45))
    # Right ambient orb
    glow_draw.ellipse([(600, 150), (1150, 650)], fill=(20, 184, 166, 40))
    # Center subtle warmth
    glow_draw.ellipse([(350, 50), (750, 450)], fill=(5, 150, 105, 30))
    
    glow = glow.filter(ImageFilter.GaussianBlur(80))
    im.paste(glow, (0, 0), glow)

    # Load logo
    logo_path = "/home/ubuntu/habit-tracker/public/icon-512.png"
    if os.path.exists(logo_path):
        logo = Image.open(logo_path).convert("RGBA")
        logo = logo.resize((140, 140), Image.Resampling.LANCZOS)
        
        # Rounded corners for logo
        mask = Image.new("L", (140, 140), 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.rounded_rectangle([(0, 0), (140, 140)], radius=32, fill=255)
        
        # Shadow for logo
        shadow = Image.new("RGBA", (180, 180), (0, 0, 0, 0))
        shadow_draw = ImageDraw.Draw(shadow)
        shadow_draw.rounded_rectangle([(15, 15), (165, 165)], radius=34, fill=(0, 0, 0, 140))
        shadow = shadow.filter(ImageFilter.GaussianBlur(12))
        
        im.paste(shadow, (70, 160), shadow)
        im.paste(logo, (90, 180), mask)

    # Load system font
    try:
        font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 52)
        font_sub = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
        font_badge = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 15)
        font_pill = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 18)
    except:
        font_large = ImageFont.load_default()
        font_sub = ImageFont.load_default()
        font_badge = ImageFont.load_default()
        font_pill = ImageFont.load_default()

    draw = ImageDraw.Draw(im)

    # Text content on right of icon
    text_x = 270
    
    # Category badge
    badge_text = "CALM • LOCAL-FIRST • ZERO ADS"
    draw.rounded_rectangle([(text_x, 140), (text_x + 310, 172)], radius=16, fill=(16, 185, 129, 40), outline=(52, 211, 153, 90))
    draw.text((text_x + 16, 148), badge_text, fill=(52, 211, 153), font=font_badge)

    # Main Title
    draw.text((text_x, 186), "DailyOS", fill=(255, 255, 255), font=font_large)

    # Tagline
    draw.text((text_x, 254), "Own Your Every Day", fill=(209, 213, 219), font=font_sub)
    draw.text((text_x, 292), "Private habits, sleep dial & reflection journal.", fill=(156, 163, 175), font=font_pill)

    # Feature pills along bottom
    pills = ["Triple-Ring Momentum", "24h Sleep Dial", "Mood Orbs", "Offline Dexie DB"]
    px = text_x
    py = 345
    for pill in pills:
        bbox = draw.textbbox((0, 0), pill, font=font_pill)
        pw = bbox[2] - bbox[0] + 24
        draw.rounded_rectangle([(px, py), (px + pw, py + 34)], radius=10, fill=(255, 255, 255, 15), outline=(255, 255, 255, 40))
        draw.text((px + 12, py + 8), pill, fill=(229, 231, 235), font=font_pill)
        px += pw + 12

    # Save as 24-bit RGB PNG
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    im.save(out_path, format="PNG")
    print(f"Feature graphic generated: {out_path} ({width}x{height})")

if __name__ == "__main__":
    create_feature_graphic("/home/ubuntu/habit-tracker/store-assets/feature-graphic-1024x500.png")
