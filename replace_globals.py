import re

with open('frontend/app/globals.css', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update :root block
root_pattern = re.compile(r':root\s*\{.*?\n  \}', re.DOTALL)
new_root = """:root {
    --background: 35 25% 95%;
    --foreground: 230 25% 15%;
    --card: 0 0% 100%;
    --card-foreground: 230 25% 15%;
    --popover: 0 0% 100%;
    --popover-foreground: 230 25% 15%;
    --primary: 14 78% 56%;
    --primary-foreground: 0 0% 100%;
    --secondary: 35 20% 90%;
    --secondary-foreground: 230 25% 15%;
    --muted: 35 20% 90%;
    --muted-foreground: 230 15% 45%;
    --accent: 35 20% 88%;
    --accent-foreground: 230 25% 15%;
    --destructive: 14 78% 56%;
    --destructive-foreground: 0 0% 100%;
    --border: 230 15% 82%;
    --input: 230 15% 82%;
    --ring: 14 78% 56%;
    --radius: 0rem;

    --surface-0: #f5f0e8;
    --surface-1: rgba(255,255,255,0.90);
    --surface-2: rgba(255,255,255,0.85);
    --surface-3: rgba(255,255,255,0.75);
    --surface-border: rgba(28,31,58,0.12);
    --surface-border-strong: rgba(28,31,58,0.22);

    --ink: #1c1f3a;
    --paper: #f5f0e8;
    --accent-red: #e8533a;
    --accent-green: #2a7d4f;
    --accent-amber: #c47c2b;
    --desk:   #e8e3d9;
    --rule:   #d4cfc4;
    --spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  }"""
content = root_pattern.sub(new_root, content)

# 2. Block replacements
# .brut-btn
brut_btn_pattern = re.compile(r'\.brut-btn\s*\{[^\}]+\}', re.DOTALL)
new_brut_btn = """.brut-btn {
  background: rgba(28,31,58,0.06);
  border: 1px solid rgba(28,31,58,0.18);
  box-shadow: 4px 4px 0px rgba(28,31,58,0.18);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  font-family: 'JetBrains Mono', monospace;
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #1c1f3a;
  border-radius: 0;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}"""
content = brut_btn_pattern.sub(new_brut_btn, content)

# .brut-btn:hover
brut_btn_hover_pattern = re.compile(r'\.brut-btn:hover\s*(?!\s*::)[^{]*\{[^\}]+\}', re.DOTALL)
new_brut_btn_hover = """.brut-btn:hover {
  background: rgba(28,31,58,0.10);
  border-color: rgba(28,31,58,0.35);
  box-shadow: 6px 6px 0px rgba(28,31,58,0.22);
  transform: translate(-2px, -2px);
}"""
content = brut_btn_hover_pattern.sub(new_brut_btn_hover, content)

# neo-card
neo_card_pattern = re.compile(r'\.neo-card\s*\{[^\}]+\}', re.DOTALL)
new_neo_card = """.neo-card {
  background: rgba(255,255,255,0.82);
  backdrop-filter: blur(24px) saturate(1.1);
  -webkit-backdrop-filter: blur(24px) saturate(1.1);
  border: 1px solid rgba(28,31,58,0.14);
  border-radius: 0;
  position: relative;
  z-index: 2;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  animation: popIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  box-shadow: 4px 4px 0px rgba(28,31,58,0.18);
  color: #1c1f3a;
}"""
content = neo_card_pattern.sub(new_neo_card, content)

# neo-card:hover
neo_card_hover_pattern = re.compile(r'\.neo-card:hover\s*\{[^\}]+\}', re.DOTALL)
new_neo_card_hover = """.neo-card:hover {
  box-shadow: 8px 8px 0px rgba(28,31,58,0.18);
  transform: translate(-4px, -4px) scale(1.01);
  background: rgba(255,255,255,0.92);
}"""
content = neo_card_hover_pattern.sub(new_neo_card_hover, content)

# retro-titlebar
retro_titlebar_pattern = re.compile(r'\.retro-titlebar\s*\{[^\}]+\}', re.DOTALL)
new_retro_titlebar = """.retro-titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(28,31,58,0.04);
  border-bottom: 1px solid rgba(28,31,58,0.10);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: rgba(28,31,58,0.45);
}"""
content = retro_titlebar_pattern.sub(new_retro_titlebar, content)

# section-label
section_label_pattern = re.compile(r'\.section-label\s*\{[^\}]+\}', re.DOTALL)
new_section_label = """.section-label {
  display: inline-block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 2px 6px;
  border: 1px solid rgba(28,31,58,0.18);
  background: rgba(28,31,58,0.05);
  color: rgba(28,31,58,0.60);
  box-shadow: none;
}"""
content = section_label_pattern.sub(new_section_label, content)

# utility classes
content = re.sub(r'\.pink\s*\{[^}]+\}', '.red { color: #e8533a; }', content)
content = re.sub(r'\.green\s*\{[^}]+\}', '.green { color: #2a7d4f; }', content)
content = re.sub(r'\.amber\s*\{[^}]+\}', '.amber { color: #c47c2b; }', content)

# replace brut-btn-pink with brut-btn-red
content = content.replace('.brut-btn-pink', '.brut-btn-red')
brut_btn_red_pattern = re.compile(r'\.brut-btn-red\s*\{[^\}]+\}', re.DOTALL)
new_brut_btn_red = """.brut-btn-red {
  background: #e8533a;
  border-color: #e8533a;
  color: #ffffff;
  box-shadow: 4px 4px 0px rgba(232,83,58,0.4);
}"""
content = brut_btn_red_pattern.sub(new_brut_btn_red, content)

# Update body
body_pattern = re.compile(r'body\s*\{[^\}]+\}', re.DOTALL)
new_body = """body {
    background-color: #f5f0e8;
    background-image: url('/prepme-bg.png');
    background-size: cover;
    background-position: center;
    background-attachment: fixed;
    background-repeat: no-repeat;
    color: #1c1f3a;
    font-family: 'Inter', system-ui, sans-serif;
    min-height: 100vh;
    position: relative;
    overflow-x: hidden;
  }"""
content = body_pattern.sub(new_body, content)

# Global string replacements
replacements = {
    '#0D0D1A': '#f5f0e8',
    '#12121E': 'rgba(255,255,255,0.90)',
    '#181826': 'rgba(255,255,255,0.85)',
    '#1E1E30': 'rgba(255,255,255,0.75)',
    '#2A2A40': 'rgba(28,31,58,0.18)',
    '#FF4D6D': '#e8533a',
    '#39FF6A': '#2a7d4f',
    '#F5A623': '#c47c2b',
    '#E8E8F0': '#1c1f3a',
    '#A0A0B8': 'rgba(28,31,58,0.55)',
    'rgba(255,255,255,0.10)': 'rgba(28,31,58,0.10)',
    'rgba(255,255,255,0.12)': 'rgba(28,31,58,0.12)',
    'rgba(255,255,255,0.18)': 'rgba(28,31,58,0.18)',
}
for k, v in replacements.items():
    content = content.replace(k, v)

with open('frontend/app/globals.css', 'w', encoding='utf-8') as f:
    f.write(content)
