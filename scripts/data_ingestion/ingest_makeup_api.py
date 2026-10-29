import os
import requests
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
# ==========================================
# 1. SETUP & CONFIGURATION
# ==========================================
# Use your SUPABASE_SERVICE_ROLE_KEY to bypass RLS policies during ingestion
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SECRET_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

MAKEUP_API_URL = "http://makeup-api.herokuapp.com/api/v1/products.json"

# Scope restricted to eyes and lips for the MVP
TARGET_CATEGORIES = [
    "lipstick", "lip_liner", 
    "eyeliner", "eyeshadow", "mascara", "eyebrow"
]

# ==========================================
# 2. COLOR MATH (HEX -> RGB -> CIELAB)
# ==========================================
def hex_to_lab(hex_color: str):
    """Converts a hex color string to CIELAB (L*, a*, b*) coordinates."""
    hex_color = hex_color.lstrip('#')
    if len(hex_color) != 6:
        return None, None, None

    # Hex to RGB (0 - 255)
    try:
        r = int(hex_color[0:2], 16) / 255.0
        g = int(hex_color[2:4], 16) / 255.0
        b = int(hex_color[4:6], 16) / 255.0
    except ValueError:
        return None, None, None

    # RGB to XYZ (sRGB D65)
    def gamma_correct(c):
        return ((c + 0.055) / 1.055) ** 2.4 if c > 0.04045 else c / 12.92

    r, g, b = gamma_correct(r), gamma_correct(g), gamma_correct(b)
    
    x = (r * 0.4124 + g * 0.3576 + b * 0.1805) * 100
    y = (r * 0.2126 + g * 0.7152 + b * 0.0722) * 100
    z = (r * 0.0193 + g * 0.1192 + b * 0.9505) * 100

    # XYZ to CIELAB
    def f(t):
        return t ** (1/3) if t > 0.008856 else (7.787 * t) + (16 / 116)

    # D65 Reference White
    x = x / 95.047
    y = y / 100.000
    z = z / 108.883

    fx, fy, fz = f(x), f(y), f(z)

    l = (116 * fy) - 16
    a = 500 * (fx - fy)
    b_val = 200 * (fy - fz)

    return round(l, 3), round(a, 3), round(b_val, 3)

# ==========================================
# 3. INGESTION PIPELINE
# ==========================================
def run_ingestion():
    print("Fetching data from Makeup API...")
    response = requests.get(MAKEUP_API_URL)
    if response.status_code != 200:
        print("Failed to fetch data.")
        return

    products = response.json()
    print(f"Total products fetched: {len(products)}")

    inserted_count = 0

    for product in products:
        prod_type = product.get("product_type")
        
        # Filter for MVP scope
        if prod_type not in TARGET_CATEGORIES:
            continue

        colors = product.get("product_colors", [])
        if not colors:
            continue # Skip products with no exact color data

        # Flatten the product array by shade
        for color in colors:
            hex_val = color.get("hex_value")
            shade_name = color.get("colour_name")
            
            if not hex_val or not isinstance(hex_val, str):
                continue
                
            l, a, b = hex_to_lab(hex_val)
            if l is None:
                continue

            # Handle missing prices gracefully
            price = product.get("price")
            try:
                price_usd = float(price) if price else 0.0
            except ValueError:
                price_usd = 0.0

            # Construct the database row
            row = {
                "parent_api_id": product.get("id"),
                "brand": product.get("brand", "Unknown"),
                "product_name": product.get("name", "Unknown"),
                "shade_name": shade_name if shade_name else "Standard",
                "hex_value": hex_val,
                "category": prod_type,
                "image_url": product.get("api_featured_image") or product.get("image_link"),
                "price_usd": price_usd,
                "cielab_l": l,
                "cielab_a": a,
                "cielab_b": b
            }

            # Insert into Supabase
            try:
                supabase.table("products").insert(row).execute()
                inserted_count += 1
            except Exception as e:
                print(f"Failed to insert {row['product_name']} - {shade_name}: {e}")

    print(f"Ingestion complete! Successfully mapped {inserted_count} individual cosmetic shades to CIELAB coordinates.")

if __name__ == "__main__":
    run_ingestion()