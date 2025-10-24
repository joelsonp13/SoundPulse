#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Remove todos os emojis do app.py para compatibilidade Windows"""

import sys

# Forçar UTF-8 para stdout
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Mapeamento de emojis para texto (usando códigos Unicode)
EMOJI_MAP = {
    "\U0001f510": "[OAuth]",   # lock
    "\U0001f4dd": "[Info]",     # memo
    "\u2705": "[OK]",           # check mark
    "\u274c": "[ERRO]",         # cross mark
    "\u26a0\ufe0f": "[AVISO]",  # warning
    "\u26a0": "[AVISO]",        # warning (sem variant selector)
    "\U0001f3b5": "[Musica]",   # musical note
    "\U0001f504": "[Retry]",    # counterclockwise
    "\U0001f4ca": "[Stats]",    # bar chart
    "\U0001f517": "[Link]",     # link
    "\U0001f4e5": "[Download]", # inbox tray
    "\U0001f5d1\ufe0f": "[Delete]", # wastebasket
    "\U0001f5d1": "[Delete]",   # wastebasket (sem variant selector)
    "\U0001f4be": "[Cache]",    # floppy disk
    "\u26a1": "[Fast]",         # zap
    "\U0001f50d": "[Debug]",    # magnifying glass
    "\U0001f527": "[Tool]",     # wrench
    "\U0001f4e1": "[Network]",  # satellite antenna
    "\U0001f4e6": "[Data]",     # package
    "\U0001f310": "[Web]",      # globe with meridians
    "\U0001f3a4": "[Artist]",   # microphone
    "\U0001f4cb": "[Playlist]", # clipboard
    "\U0001f4bf": "[Album]",    # optical disc
    "\U0001f31f": "[Star]",     # glowing star
    "\U0001f4fa": "[Video]"     # television
}

print("Removendo emojis do app.py...", flush=True)

with open('app.py', 'r', encoding='utf-8') as f:
    content = f.read()

original_len = len(content)
total_replacements = 0

# Substituir cada emoji
for emoji, text in EMOJI_MAP.items():
    count = content.count(emoji)
    if count > 0:
        content = content.replace(emoji, text)
        total_replacements += count
        # Print sem emoji para evitar erro encoding
        print(f"  Substituido: {text} ({count}x)", flush=True)

# Salvar
with open('app.py', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nFeito! Total de substituicoes: {total_replacements}", flush=True)
print(f"Tamanho: {original_len} -> {len(content)} bytes", flush=True)

