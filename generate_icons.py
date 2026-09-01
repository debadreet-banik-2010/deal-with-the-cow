import zlib
import struct
import os

def create_png(width, height, get_pixel):
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0) # Filter type 0 (None)
        for x in range(width):
            r, g, b, a = get_pixel(x, y, width, height)
            raw_data.extend([r, g, b, a])
    
    compressed = zlib.compress(raw_data, 9)
    
    png = bytearray(b'\x89PNG\r\n\x1a\n')
    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr_crc = struct.pack('>I', zlib.crc32(b'IHDR' + ihdr_data) & 0xffffffff)
    png.extend(struct.pack('>I', len(ihdr_data)) + b'IHDR' + ihdr_data + ihdr_crc)
    
    # IDAT chunk
    idat_crc = struct.pack('>I', zlib.crc32(b'IDAT' + compressed) & 0xffffffff)
    png.extend(struct.pack('>I', len(compressed)) + b'IDAT' + compressed + idat_crc)
    
    # IEND chunk
    iend_crc = struct.pack('>I', zlib.crc32(b'IEND') & 0xffffffff)
    png.extend(struct.pack('>I', 0) + b'IEND' + iend_crc)
    
    return bytes(png)

def cow_pixel(x, y, w, h):
    nx = (x / (w - 1)) * 2 - 1 if w > 1 else 0
    ny = (y / (h - 1)) * 2 - 1 if h > 1 else 0
    
    dist_sq = nx * nx + ny * ny
    
    if dist_sq > 0.95:
        return 0, 0, 0, 0
    if dist_sq > 0.85:
        return 20, 20, 20, 255
        
    bg_r, bg_g, bg_b = 255, 50, 50
    
    face_dx = nx / 0.65
    face_dy = (ny - 0.05) / 0.65
    if (face_dx**2 + face_dy**2) < 0.8:
        if (nx < -0.1 and ny < -0.1) or (nx > 0.2 and ny < -0.2):
            return 30, 30, 30, 255
        
        snout_dx = nx / 0.45
        snout_dy = (ny - 0.3) / 0.3
        if (snout_dx**2 + snout_dy**2) < 0.8:
            if abs(nx) > 0.12 and abs(nx) < 0.25 and abs(ny - 0.3) < 0.12:
                return 40, 20, 20, 255
            return 255, 170, 190, 255
        
        if abs(nx - 0.25) < 0.1 and abs(ny + 0.1) < 0.12:
            return 20, 20, 20, 255
        if abs(nx + 0.25) < 0.1 and abs(ny + 0.1) < 0.12:
            return 20, 20, 20, 255
            
        return 245, 245, 245, 255
    
    if nx < -0.35 and nx > -0.65 and ny < -0.3 and ny > -0.7:
        return 230, 180, 50, 255
    if nx > 0.35 and nx < 0.65 and ny < -0.3 and ny > -0.7:
        return 230, 180, 50, 255
        
    return bg_r, bg_g, bg_b, 255

def main():
    icons_dir = r"C:\Users\debab\.gemini\antigravity\scratch\DealWithTheCow\icons"
    os.makedirs(icons_dir, exist_ok=True)
    
    for size in [16, 48, 128]:
        png_data = create_png(size, size, cow_pixel)
        filepath = os.path.join(icons_dir, f"icon-{size}.png")
        with open(filepath, "wb") as f:
            f.write(png_data)
        print(f"Generated {filepath} ({size}x{size})")

if __name__ == "__main__":
    main()
