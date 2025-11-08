import os
from bs4 import BeautifulSoup

# --- CONFIGURATION ---

# 1. Define your category keywords and their colors.
#    The script will check if a folder name contains these keywords.
CATEGORY_MAP = {
    "python": {"name": "Python", "color": "#3572A5"},
    "javascript": {"name": "JavaScript", "color": "#F7DF1E"},
    "js": {"name": "JavaScript", "color": "#F7DF1E"},
    "data": {"name": "Data", "color": "#e74c3c"},
    "powerbi": {"name": "Data", "color": "#e74c3c"},
    "cloud": {"name": "Cloud", "color": "#007acc"},
    "devops": {"name": "Cloud", "color": "#007acc"},
    "aws": {"name": "Cloud", "color": "#007acc"},
    "css": {"name": "Web", "color": "#563d7c"},
    # Add more keywords and categories as needed
}
DEFAULT_CATEGORY = {"name": "Link", "color": "#66fcf1"} # The default accent color

# 2. Define input and output file names
BOOKMARKS_FILE_PATH = "bookmarks.html" # The file exported from your browser
OUTPUT_FILE_PATH = "new_posts_fragment.html"

# --- SCRIPT ---

def find_category(folder_name):
    """Finds a category based on the bookmark folder name."""
    folder_name_lower = folder_name.lower()
    for keyword, category_info in CATEGORY_MAP.items():
        if keyword in folder_name_lower:
            return category_info
    return DEFAULT_CATEGORY

def create_card_item(title, href, description, category_info):
    """Generates the HTML for a single card item."""
    # Simple description: use the title if no description is found
    desc_text = description if description else f"A link to {title[:50]}..."
    
    # Escape quotes in the description
    desc_text = desc_text.replace('"', '&quot;').replace("'", "&#39;")
    
    return f"""
<div class="card-item" data-category="{category_info['name']}" style="border-left-color: {category_info['color']};">
    <h3>{title}</h3>
    <p>{desc_text}</p>
    <span class="card-category">{category_info['name']}</span>
    <a href="{href}" target="_blank" rel="noopener noreferrer">Read More &rarr;</a>
</div>
"""

def parse_bookmarks(file_path):
    """Parses the bookmarks.html file and generates card items."""
    print(f"Reading bookmarks from: {file_path}")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            soup = BeautifulSoup(f, 'html.parser')
    except FileNotFoundError:
        print(f"Error: Could not find '{file_path}'.")
        print("Please export your bookmarks from your browser and save as 'bookmarks.html' in the same directory.")
        return [], set()

    all_cards = []
    all_categories = set()
    
    # Bookmarks are usually in a <DL> list. Folders are <H3> tags.
    # We find all H3 tags (folders) and process links within them.
    folders = soup.find_all('h3')
    
    if not folders:
        # Fallback for simple bookmark files with no folders
        print("No folders found. Parsing all links directly.")
        links = soup.find_all('a')
        for link in links:
            title = link.get_text().strip()
            href = link.get('href')
            if href and not href.startswith('data:'):
                category_info = DEFAULT_CATEGORY
                all_cards.append(create_card_item(title, href, "", category_info))
                all_categories.add(category_info['name'])
    else:
        print(f"Found {len(folders)} bookmark folders. Processing...")
        for folder in folders:
            folder_name = folder.get_text().strip()
            category_info = find_category(folder_name)
            all_categories.add(category_info['name'])
            
            # Find the list of links (<dl>) that follows this folder
            list_container = folder.find_next_sibling('dl')
            if list_container:
                links = list_container.find_all('a')
                for link in links:
                    title = link.get_text().strip()
                    href = link.get('href')
                    # Get description (if it exists, often in a <dd>)
                    dd = link.find_next_sibling('dd')
                    description = dd.get_text().strip() if dd else ""

                    if href and not href.startswith('data:'): # Ignore internal data links
                        all_cards.append(create_card_item(title, href, description, category_info))

    print(f"\nProcessed {len(all_cards)} links.")
    return all_cards, all_categories

def write_output(cards, categories):
    """Writes the final HTML fragment and category list."""
    print(f"Writing {len(cards)} card items to '{OUTPUT_FILE_PATH}'...")
    
    with open(OUTPUT_FILE_PATH, 'w', encoding='utf-8') as f:
        f.write("\n")
        f.write("\n".join(cards))
        
        f.write("\n\n\n\n")
        f.write('<option value="all">All Categories</option>\n')
        for category in sorted(categories):
            f.write(f'<option value="{category}">{category}</option>\n')
            
    print("\n--- Success! ---")
    print(f"Your HTML fragment is ready in: {OUTPUT_FILE_PATH}")
    print(f"Open this file, copy the content, and paste it into your 'posts.html' page.")

# --- Run the script ---
if __name__ == "__main__":
    # Check for dependencies
    try:
        import bs4
    except ImportError:
        print("Error: 'BeautifulSoup' library not found.")
        print("Please install it by running: pip install beautifulsoup4")
        exit()

    cards, categories = parse_bookmarks(BOOKMARKS_FILE_PATH)
    if cards:
        write_output(cards, categories)
