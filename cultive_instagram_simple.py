#!/usr/bin/env python3
"""
CULTIVE Instagram Event Extractor (Simple Version)
Extracts event details from Instagram post text (copy-paste)
No API needed - just paste the caption text

Usage: python3 cultive_instagram_simple.py
"""

import re
import json
from datetime import datetime

def extract_event_from_text(text, source_url=""):
    """Extract event details from Instagram caption text"""
    
    text_upper = text.upper()
    text_lower = text.lower()
    
    # Date extraction patterns
    date_patterns = [
        # JUN 22, JUNE 22, JUN. 22
        r'(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\.?\s*(\d{1,2})',
        # 22 JUN, 22 JUNE
        r'(\d{1,2})\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*',
        # SAT JUN 22
        r'(MON|TUE|WED|THU|FRI|SAT|SUN)[A-Z]*\.?\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\.?\s*(\d{1,2})',
    ]
    
    # Time extraction patterns
    time_patterns = [
        # 11PM-LATE, 4-6PM, 11:30PM-12:30AM
        r'(\d{1,2}):?(\d{2})?\s*(AM|PM)\s*-\s*(\d{1,2}):?(\d{2})?\s*(AM|PM)',
        # 6-8PM, 4-6 PM
        r'(\d{1,2})\s*-\s*(\d{1,2})\s*(AM|PM)',
        # 11PM, 4PM
        r'(\d{1,2}):?(\d{2})?\s*(AM|PM)',
    ]
    
    # Extract date
    extracted_date = None
    for pattern in date_patterns:
        match = re.search(pattern, text_upper)
        if match:
            extracted_date = match.group(0)
            break
    
    # Extract time
    extracted_time = None
    for pattern in time_patterns:
        match = re.search(pattern, text_upper)
        if match:
            extracted_time = match.group(0)
            break
    
    # Extract location keywords
    locations = {
        'TST': 'Tsim Sha Tsui',
        'TSIM SHA TSUI': 'Tsim Sha Tsui',
        'CENTRAL': 'Central',
        'WAN CHAI': 'Wan Chai',
        'CAUSEWAY BAY': 'Causeway Bay',
        'CWB': 'Causeway Bay',
        'MONG KOK': 'Mong Kok',
        'MK': 'Mong Kok',
        'SHEUNG WAN': 'Sheung Wan',
        'TAI HANG': 'Tai Hang',
        'ADMIRALTY': 'Admiralty',
        'PENG CHAU': 'Peng Chau',
        'KOWLOON': 'Kowloon',
    }
    
    extracted_district = None
    for keyword, district in locations.items():
        if keyword in text_upper:
            extracted_district = district
            break
    
    # Extract venue (look for "at VENUE" or "@ VENUE")
    venue_pattern = r'at\s+([A-Z][A-Za-z0-9\s]+(?:HK|HONG\s+KONG)?)'
    venue_match = re.search(venue_pattern, text)
    extracted_venue = venue_match.group(1).strip() if venue_match else None
    
    # If no venue found, look for TST EAST, KIOSKY, etc.
    if not extracted_venue:
        venue_keywords = ['KIOSKY', 'OMA', 'MIHN', '宀 CLUB', 'SOCIAL ROOM']
        for keyword in venue_keywords:
            if keyword in text_upper:
                extracted_venue = keyword.title()
                break
    
    # Extract Instagram handles (DJs, artists, organizers)
    handles = re.findall(r'@([a-zA-Z0-9._]+)', text)
    
    # Determine category
    category = 'Music'
    if any(k in text_lower for k in ['food', 'bakery', 'roast', 'brunch', 'lunch', 'dinner', 'popup', 'tasting']):
        category = 'Food'
    elif any(k in text_lower for k in ['art', 'exhibition', 'gallery', 'workshop', 'paint']):
        category = 'Arts'
    elif any(k in text_lower for k in ['yoga', 'wellness', 'meditation', 'fitness', 'run']):
        category = 'Wellness'
    elif any(k in text_lower for k in ['drink', 'wine', 'cocktail', 'bar', 'speakeasy']):
        category = 'Nightlife'
    
    # Extract hashtags
    hashtags = re.findall(r'#([a-zA-Z0-9_]+)', text)
    
    # Check if free
    price = 'Free' if 'free' in text_lower else 'TBD'
    
    # Create title
    # Use first line or combine handles
    first_line = text.split('\n')[0].strip()
    if len(first_line) > 10 and len(first_line) < 80:
        title = first_line
    elif handles:
        title = f"{handles[0].replace('.', ' ').title()} event"
    else:
        title = f"{category} event"
    
    # Clean up title
    title = re.sub(r'@\w+', '', title).strip()
    if len(title) > 80:
        title = title[:77] + '...'
    
    result = {
        'extracted': {
            'title': title,
            'category': category,
            'date': extracted_date or 'TBD',
            'time': extracted_time or 'TBD',
            'venue': extracted_venue or 'TBD',
            'district': extracted_district or 'TBD',
            'price': price,
            'handles': handles,
            'hashtags': hashtags[:5],
        },
        'for_admin_panel': {
            'Title': title,
            'Category': category,
            'Date': extracted_date or 'TBD',
            'Time': extracted_time or 'TBD',
            'Venue': extracted_venue or ('Secret Location' if 'secret' in text_lower else 'TBD'),
            'Price': price,
            'District': extracted_district or 'TBD',
            'Description': text[:300] + ('...' if len(text) > 300 else ''),
        },
        'source_url': source_url,
        'extracted_at': datetime.now().isoformat(),
    }
    
    return result

def main():
    print("🎭 CULTIVE Instagram Event Extractor\n")
    print("Paste the Instagram caption text below (then press Ctrl+D or type 'DONE'):\n")
    
    lines = []
    try:
        while True:
            line = input()
            if line.strip().upper() == 'DONE':
                break
            lines.append(line)
    except EOFError:
        pass
    
    text = '\n'.join(lines)
    
    if not text.strip():
        print("❌ No text provided")
        return
    
    print("\n" + "="*60)
    print("🔍 EXTRACTING EVENT...\n")
    
    result = extract_event_from_text(text)
    
    print("✅ EXTRACTED DATA:\n")
    print(json.dumps(result['extracted'], indent=2))
    
    print("\n" + "="*60)
    print("🎯 READY FOR ADMIN PANEL:\n")
    
    for key, value in result['for_admin_panel'].items():
        print(f"{key}: {value}")
    
    print("\n" + "="*60)
    print("📋 QUICK COPY:\n")
    print(json.dumps(result['for_admin_panel'], indent=2))
    
    # Save to file
    filename = f"/tmp/cultive_event_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(filename, 'w') as f:
        json.dump(result, f, indent=2)
    print(f"\n💾 Saved to: {filename}")

if __name__ == '__main__':
    main()
