import os
import sys
from bs4 import BeautifulSoup

# --- CONFIGURATION ---
# Define your category keywords and their colors.
# This will be used to color-code your cards based on the *filename* or *tags*.
CATEGORY_MAP = {
    "python": {"name": "Python", "color": "#3572A5"},
    "javascript": {"name": "JavaScript", "color": "#F7DF1E"},
    "statistics": {"name": "Data", "color": "#e74c3c"},
    "data": {"name": "Data", "color": "#e74c3c"},
    "cloud": {"name": "Cloud", "color": "#007acc"},
    "devops": {"name": "Cloud", "color": "#007acc"},
    "css": {"name": "Web", "color": "#563d7c"},
    # Add more keywords and categories as needed
}
DEFAULT_CATEGORY = {"name": "Link", "color": "#66fcf1"} # The default accent color

OUTPUT_FILE_PATH = "raindrop_fragment.html"

# --- SCRIPT ---

def find_category(filename_or_tags):
    """Finds a category based on the file name or bookmark tags."""
    text_lower = filename_or_tags.lower()
    for keyword, category_info in CATEGORY_MAP.items():
        if keyword in text_lower:
            return category_info
    return DEFAULT_CATEGORY

def create_card_item(title, href, description, image_url, category_info):
    """Generates the HTML for a single card item."""
    
    # Create the image tag if an image URL exists
    image_html = ""
    if image_url:
        image_html = f'<img src="{image_url}" class="card-image" alt="Preview" loading="lazy">'
    
    # Use tags as description, or create a placeholder
    desc_text = description if description else f"A link to {title[:50]}..."
    desc_text = desc_text.replace('"', '&quot;').replace("'", "&#39;")
    
    return f"""
<!-- Card Item -->
<div class="card-item" data-category="{category_info['name']}" style="border-left-color: {category_info['color']};">
    {image_html}
    <h3>{title}</h3>
    <p>{desc_text}</p>
    <span class="card-category">{category_info['name']}</span>
    <a href="{href}" target="_blank" rel="noopener noreferrer">Read More &rarr;</a>
</div>
"""

def parse_raindrop_bookmarks(file_path):
    """Parses the Raindrop.io HTML file and generates card items."""
    print(f"Reading Raindrop bookmarks from: {file_path}")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            soup = BeautifulSoup(f, 'html.parser')
    except FileNotFoundError:
        print(f"Error: Could not find '{file_path}'.")
        return [], set()

    all_cards = []
    all_categories = set()
    
    # Get the filename (e.g., "Statistics") to use as the default category
    filename = os.path.splitext(os.path.basename(file_path))[0]
    default_category_info = find_category(filename)
    all_categories.add(default_category_info['name'])
    
    # Raindrop files use <DT><A ...> for links
    links = soup.find_all('a')
    print(f"Found {len(links)} links in the file...")
    
    for link in links:
        title = link.get_text().strip()
        href = link.get('href')
        
        # Get Raindrop-specific data
        image_url = link.get('data-cover', '')
        tags = link.get('tags', '') # Use tags as the description
        
        # Use filename's category as default
        category_info = default_category_info
        
        # But if tags exist, try to find a better category from them
        if tags:
            category_info = find_category(tags)
            all_categories.add(category_info['name'])
            
        if href and not href.startswith('data:'):
            all_cards.append(create_card_item(title, href, tags, image_url, category_info))

    print(f"\nProcessed {len(all_cards)} links.")
    return all_cards, all_categories

def write_output(cards, categories):
    """Writes the final HTML fragment and category list."""
    print(f"Writing {len(cards)} card items to '{OUTPUT_FILE_PATH}'...")
    
    with open(OUTPUT_FILE_PATH, 'w', encoding='utf-8') as f:
        f.write("<!-- Copy and paste these cards into your posts.html file -->\n")
        f.write("\n".join(cards))
        
        f.write("\n\n\n<!-- Copy and paste these options into your <select id='post-category-filter'> in posts.html -->\n")
        f.write('<option value="all">All Categories</option>\n')
        for category in sorted(categories):
            f.write(f'<option value="{category}">{category}</option>\n')
            
    print("\n--- Success! ---")
    print(f"Your HTML fragment is ready in: {OUTPUT_FILE_PATH}")

# --- Run the script ---
if __name__ == "__main__":
    try:
        import bs4
    except ImportError:
        print("Error: 'BeautifulSoup' library not found.")
        print("Please install it by running: pip install beautifulsoup4")
        sys.exit()

    if len(sys.argv) < 2:
        print("\nError: Please provide the path to your Raindrop HTML file.")
        print(f"Usage: python {sys.argv[0]} Statistics.html")
        sys.exit()
    
    bookmarks_file_path = sys.argv[1]
    
    if not os.path.exists(bookmarks_file_path):
        print(f"Error: File not found at '{bookmarks_file_path}'")
        sys.exit()
        
    cards, categories = parse_raindrop_bookmarks(bookmarks_file_path)
    if cards:
        write_output(cards, categories)
