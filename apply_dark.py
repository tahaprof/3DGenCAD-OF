import os
import re

directories = ['f:/Vibe Coding/FRL/frontend/src/pages', 'f:/Vibe Coding/FRL/frontend/src/components']

replacements = {
    # Backgrounds
    r'\bbg-white\b(?!\s*dark:)': 'bg-white dark:bg-slate-900',
    r'\bbg-slate-50\b(?!\s*dark:)': 'bg-slate-50 dark:bg-slate-900',
    r'\bbg-slate-100\b(?!\s*dark:)': 'bg-slate-100 dark:bg-slate-800',
    r'\bbg-slate-200\b(?!\s*dark:)': 'bg-slate-200 dark:bg-slate-700',
    
    # Texts
    r'\btext-slate-900\b(?!\s*dark:)': 'text-slate-900 dark:text-white',
    r'\btext-slate-800\b(?!\s*dark:)': 'text-slate-800 dark:text-slate-200',
    r'\btext-slate-700\b(?!\s*dark:)': 'text-slate-700 dark:text-slate-300',
    r'\btext-slate-600\b(?!\s*dark:)': 'text-slate-600 dark:text-slate-400',
    r'\btext-slate-500\b(?!\s*dark:)': 'text-slate-500 dark:text-slate-400',
    r'\btext-slate-400\b(?!\s*dark:)': 'text-slate-400 dark:text-slate-500',
    
    # Borders
    r'\bborder-slate-100\b(?!\s*dark:)': 'border-slate-100 dark:border-slate-800',
    r'\bborder-slate-200\b(?!\s*dark:)': 'border-slate-200 dark:border-slate-700',
    r'\bborder-slate-300\b(?!\s*dark:)': 'border-slate-300 dark:border-slate-600',
    
    # Buttons/Accents (Already dark, so in dark mode they should become primary blue, or stay dark with a lighter hover)
    r'\bbg-slate-900 hover:bg-slate-800\b(?!\s*dark:)': 'bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700',
    r'\btext-white\b(?!\s*dark:)': 'text-white dark:text-slate-100',
    
    # Colors (KPI backgrounds)
    r'\bbg-blue-50\b(?!\s*dark:)': 'bg-blue-50 dark:bg-blue-900/30',
    r'\bbg-orange-50\b(?!\s*dark:)': 'bg-orange-50 dark:bg-orange-900/30',
    r'\bbg-purple-50\b(?!\s*dark:)': 'bg-purple-50 dark:bg-purple-900/30',
    r'\bbg-red-50\b(?!\s*dark:)': 'bg-red-50 dark:bg-red-900/30',
    r'\bbg-green-50\b(?!\s*dark:)': 'bg-green-50 dark:bg-green-900/30',
    r'\bbg-yellow-50\b(?!\s*dark:)': 'bg-yellow-50 dark:bg-yellow-900/30',
    
    # Color texts for badges
    r'\btext-blue-700\b(?!\s*dark:)': 'text-blue-700 dark:text-blue-400',
    r'\btext-green-700\b(?!\s*dark:)': 'text-green-700 dark:text-green-400',
    r'\btext-red-700\b(?!\s*dark:)': 'text-red-700 dark:text-red-400',
    r'\btext-orange-700\b(?!\s*dark:)': 'text-orange-700 dark:text-orange-400',
    r'\btext-yellow-700\b(?!\s*dark:)': 'text-yellow-700 dark:text-yellow-400',
    
    r'\bborder-blue-200\b(?!\s*dark:)': 'border-blue-200 dark:border-blue-800',
    r'\bborder-green-200\b(?!\s*dark:)': 'border-green-200 dark:border-green-800',
    r'\bborder-red-200\b(?!\s*dark:)': 'border-red-200 dark:border-red-800',
    r'\bborder-orange-200\b(?!\s*dark:)': 'border-orange-200 dark:border-orange-800',
    r'\bborder-yellow-200\b(?!\s*dark:)': 'border-yellow-200 dark:border-yellow-800',
}

for directory in directories:
    if not os.path.exists(directory):
        continue
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                original_content = content
                for pattern, replacement in replacements.items():
                    content = re.sub(pattern, replacement, content)
                
                if content != original_content:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(content)
                    print(f'Updated {file}')
