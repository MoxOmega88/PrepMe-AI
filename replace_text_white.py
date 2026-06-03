import os
import re

def process_text_white():
    colored_bgs = ['bg-[#4A6FA5]', 'bg-[#2a7d4f]', 'bg-[#c47c2b]', 'bg-[#FFD600]']
    
    for root, dirs, files in os.walk('frontend'):
        for file in files:
            if file.endswith(('.tsx', '.ts')):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()

                # Find all text-white and see if we should replace it
                # We'll just replace it if it's not near a colored background
                # A safe way is to replace `text-white` with `text-[#1c1f3a]` everywhere
                # EXCEPT if the line contains `bg-[#4A6FA5]` etc.
                
                lines = content.split('\n')
                for i, line in enumerate(lines):
                    if 'text-white' in line:
                        # Exclusions
                        if any(bg in line for bg in colored_bgs):
                            # It has a colored background in the same line, KEEP text-white
                            continue
                        if 'logout' in line.lower() or 'log out' in line.lower() or 'banner' in line.lower():
                            continue
                        
                        # Otherwise replace
                        lines[i] = line.replace('text-white', 'text-[#1c1f3a]')
                        lines[i] = lines[i].replace('hover:text-white', 'hover:text-[#1c1f3a]')

                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write('\n'.join(lines))

process_text_white()
print("text-white replacement completed")
