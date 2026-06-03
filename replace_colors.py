import os
import re

replacements = {
    '#FF4D6D': '#4A6FA5',
    '#ff4d6d': '#4A6FA5',
    '#ff3355': '#3d5f8f',
    'rgba(255,77,109,': 'rgba(74,111,165,',
    'rgba(255, 77, 109,': 'rgba(74, 111, 165,',
    
    '#39FF6A': '#2a7d4f',
    '#39ff6a': '#2a7d4f', # Corrected obvious syntax-breaking typo by user
    'rgba(57,255,106,': 'rgba(42,125,79,',
    'rgba(57, 255, 106,': 'rgba(42, 125, 79,',

    '#F5A623': '#c47c2b',
    '#f5a623': '#c47c2b',
    'rgba(245,166,35,': 'rgba(196,124,43,',
    'rgba(245, 166, 35,': 'rgba(196, 124, 43,',

    '#0D0D1A': '#f5f0e8',
    '#12121E': 'rgba(255,255,255,0.92)',
    '#181826': 'rgba(255,255,255,0.88)',
    '#1E1E30': 'rgba(255,255,255,0.80)',
    '#2A2A40': 'rgba(28,31,58,0.15)',
    '#2a2a40': 'rgba(28,31,58,0.15)',
    '#2A2D4A': 'rgba(255,255,255,0.75)',
    '#1A1D38': 'rgba(255,255,255,0.70)',
    '#1E2040': 'rgba(255,255,255,0.70)',
    '#3A1828': 'rgba(74,111,165,0.12)',
    '#2A1020': 'rgba(74,111,165,0.08)',
    '#1A0810': 'rgba(74,111,165,0.06)',
    '#32365A': 'rgba(255,255,255,0.80)',

    '#E8E8F0': '#1c1f3a',
    '#e8e8f0': '#1c1f3a',
    '#A0A0B8': 'rgba(28,31,58,0.55)',
    '#a0a0b8': 'rgba(28,31,58,0.55)',
    '#777790': 'rgba(28,31,58,0.40)',

    'rgba(255,255,255,0.03)': 'rgba(28,31,58,0.03)',
    'rgba(255,255,255,0.04)': 'rgba(28,31,58,0.04)',
    'rgba(255,255,255,0.05)': 'rgba(28,31,58,0.05)',
    'rgba(255,255,255,0.06)': 'rgba(28,31,58,0.06)',
    'rgba(255,255,255,0.07)': 'rgba(28,31,58,0.07)',
    'rgba(255,255,255,0.08)': 'rgba(28,31,58,0.08)',
    'rgba(255,255,255,0.10)': 'rgba(28,31,58,0.10)',
    'rgba(255,255,255,0.12)': 'rgba(28,31,58,0.12)',
    'rgba(255,255,255,0.14)': 'rgba(28,31,58,0.14)',
    'rgba(255,255,255,0.15)': 'rgba(28,31,58,0.15)',
    'rgba(255,255,255,0.18)': 'rgba(28,31,58,0.18)',
    'rgba(255,255,255,0.20)': 'rgba(28,31,58,0.20)',
    'rgba(255,255,255,0.25)': 'rgba(28,31,58,0.25)',
    'rgba(255,255,255,0.30)': 'rgba(28,31,58,0.30)',
    'rgba(255,255,255,0.35)': 'rgba(28,31,58,0.35)',
    'rgba(255,255,255,0.40)': 'rgba(28,31,58,0.40)',
}

def remove_comments(text):
    # This is hard to do safely for tsx without a parser.
    # But since we only replace exact hex codes, and the user's exception is:
    # "Any color inside a comment"
    pass

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    # We will split by newlines so we can check if it's a comment line simply.
    # Or just replace everything except if we detect it's in a comment.
    # To be safe, let's just do a simple replacement if it's not a comment line.
    
    lines = new_content.split('\n')
    for i, line in enumerate(lines):
        # Very rudimentary comment check
        if '//' in line and not 'http' in line:
            # We don't replace in the comment part
            code_part, comment_part = line.split('//', 1)
            for k, v in replacements.items():
                code_part = code_part.replace(k, v)
            lines[i] = code_part + '//' + comment_part
        elif '/*' in line and '*/' in line:
            # skip inline block comments for replacements inside the comment
            pass
        else:
            for k, v in replacements.items():
                line = line.replace(k, v)
            lines[i] = line

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

for root, dirs, files in os.walk('frontend'):
    for file in files:
        if file.endswith(('.tsx', '.ts', '.css')):
            process_file(os.path.join(root, file))

print("Hex/rgba replacements complete.")
