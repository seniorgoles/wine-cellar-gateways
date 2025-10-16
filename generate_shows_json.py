import json
import os
from pyexcel_ods3 import get_data

# --- CONFIGURATION ---
ODS_FILE_PATH = r'/home/ed/Videos/Wine Project/website3/control_panel.ods'
WEBSITE_FOLDER_PATH = r'/home/ed/Videos/Wine Project/website3'

# Names of your special system control sheets
WORLDS_SHEET = 'worlds'
SITE_CONFIG_SHEET = 'site_config'
SITE_LINKS_SHEET = 'site_links'
# --- END CONFIGURATION ---

def convert_sheet_to_dict_list(sheet_data):
    """Generic function to convert sheet data into a list of dictionaries."""
    if not sheet_data or len(sheet_data) < 2:
        return []
    header = sheet_data[0]
    dict_list = []
    for row in sheet_data[1:]:
        if len(row) < len(header):
            row.extend([''] * (len(header) - len(row)))
        dict_list.append(dict(zip(header, row)))
    return dict_list

def main():
    """Main function to read the modular ODS file and generate the master shows.json."""
    print("--- Starting Whispers of Aurorachrome Website Data Generation v3.0 ---")
    
    try:
        all_sheets_data = get_data(ODS_FILE_PATH)
        print(f"Successfully read spreadsheet: {ODS_FILE_PATH}")
    except FileNotFoundError:
        print(f"--- FATAL ERROR: Spreadsheet file not found at '{ODS_FILE_PATH}'")
        return

    # --- 1. Process System Sheets (Config and Links) ---
    print("\nProcessing System Sheets...")
    site_config = {}
    if SITE_CONFIG_SHEET in all_sheets_data:
        config_list = convert_sheet_to_dict_list(all_sheets_data[SITE_CONFIG_SHEET])
        for item in config_list:
            if item.get('key') and item.get('value'):
                site_config[item['key']] = item['value']
        print(f" -> '{SITE_CONFIG_SHEET}' loaded.")
    else:
        print(f"--- WARNING: '{SITE_CONFIG_SHEET}' not found.")

    site_links = []
    if SITE_LINKS_SHEET in all_sheets_data:
        site_links = convert_sheet_to_dict_list(all_sheets_data[SITE_LINKS_SHEET])
        print(f" -> '{SITE_LINKS_SHEET}' loaded with {len(site_links)} links.")
    else:
        print(f"--- WARNING: '{SITE_LINKS_SHEET}' not found.")

    # --- 2. Process the 'worlds' Sheet to see what exists ---
    print(f"\nProcessing '{WORLDS_SHEET}' to discover worlds...")
    if WORLDS_SHEET not in all_sheets_data:
        print(f"--- FATAL ERROR: Master worlds sheet '{WORLDS_SHEET}' not found!")
        return
        
    worlds_list = convert_sheet_to_dict_list(all_sheets_data[WORLDS_SHEET])
    print(f" -> Discovered {len(worlds_list)} worlds.")

    # --- 3. Process Each World's Data Dynamically ---
    all_content_items = {}
    print("\nProcessing data for each world...")
    for world in worlds_list:
        world_id = world.get('worldId')
        if not world_id:
            print("--- WARNING: Found a world in 'worlds' sheet with no worldId. Skipping.")
            continue
        
        print(f"\n--- Processing World: {world.get('title', world_id)} ---")
        items_sheet_name = f"{world_id}_items"
        playlist_sheet_name = f"{world_id}_playlist"

        world_items = {}
        world_playlists = {}

        # A) Process the playlist sheet for this world first
        if playlist_sheet_name in all_sheets_data:
            playlist_items_list = convert_sheet_to_dict_list(all_sheets_data[playlist_sheet_name])
            # Group playlist videos by their contentId
            for video in playlist_items_list:
                content_id = video.get('contentId')
                if content_id:
                    if content_id not in world_playlists:
                        world_playlists[content_id] = []
                    world_playlists[content_id].append(video)
            print(f" -> Found playlists for {len(world_playlists)} items in '{playlist_sheet_name}'.")
        else:
            print(f"--- WARNING: Playlist sheet '{playlist_sheet_name}' not found for this world.")

        # B) Process the items sheet for this world
        # B) Process the items sheet for this world
        if items_sheet_name in all_sheets_data:
            items_list = convert_sheet_to_dict_list(all_sheets_data[items_sheet_name])
            for item in items_list:
                
                # --- THIS IS YOUR NEW LOGIC ---
                is_item_visible_str = str(item.get('isVisible', 'FALSE')).upper()
                if is_item_visible_str != 'TRUE':
                    continue # Skip this item and go to the next one
                # --- END OF NEW LOGIC ---

                content_id = item.get('contentId')
                if content_id:
                    # Attach the pre-processed playlist to this item
                    item['playlist'] = world_playlists.get(content_id, [])
                    world_items[content_id] = item
            print(f" -> Found {len(world_items)} content items in '{items_sheet_name}'.")
        else:
            print(f"--- WARNING: Items sheet '{items_sheet_name}' not found for this world.")
        
        if world_items:
            all_content_items.update(world_items)

    # --- 4. Assemble the Final JSON Structure ---
    final_json_structure = {
        "siteConfig": site_config,
        "siteLinks": site_links,
        "worlds": {world.get('worldId'): world for world in worlds_list if world.get('worldId')},
        "content": all_content_items
    }

    output_file_path = os.path.join(WEBSITE_FOLDER_PATH, 'shows.json')
    
    print(f"\nWriting final shows.json file to: {output_file_path}")
    
    with open(output_file_path, 'w') as f:
        json.dump(final_json_structure, f, indent=2)
        
    print("\n--- SUCCESS! Your modular website data has been generated. ---")


if __name__ == "__main__":
    main()
