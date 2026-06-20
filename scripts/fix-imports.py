#!/usr/bin/env python3
"""Fix the broken imports from the refactor script."""
import re
from pathlib import Path

COMPONENTS_DIR = Path('/home/z/my-project/src/components/app')

def fix_file(path: Path):
    src = path.read_text()
    original = src
    
    # Pattern to fix: lines that start with `import {` followed by 
    # `import { api } from '@/lib/api-client'` and possibly `import { TYPE } from '@/lib/api-client'`
    # inside another import block
    
    # Find and extract the api-client imports that got inserted inside other imports
    # They look like:
    #   import {
    #   import { api } from '@/lib/api-client'
    #   import { MilestoneWithMeta } from '@/lib/api-client'
    
    # Extract the api-client import lines
    api_imports = []
    new_src = src
    
    # Find all `import { ... } from '@/lib/api-client'` lines
    api_pattern = r"import\s+\{[^}]+\}\s+from\s+'@/lib/api-client'\n"
    for m in re.finditer(api_pattern, src):
        api_imports.append(m.group(0).strip())
    
    # Remove all api-client import lines
    new_src = re.sub(api_pattern, '', new_src)
    
    # Find broken multi-line imports that have a trailing `import {` with nothing after
    # Pattern: `import {\n` at end of an import line (i.e., broken)
    # Actually, the broken pattern is just: lines that say `import {` followed by newline
    # but were supposed to be part of a multi-line import block
    
    # Look for the pattern:
    # `import {\n\n  ...other names...\n} from '...'`
    # The refactor script removed the api-client imports, leaving empty space
    
    # Actually, after removing api-client lines, the import block looks normal again:
    # `import {\n  Loader2, ...,\n} from 'lucide-react'`
    
    # Now add the api-client imports at the very top, after 'use client' if present
    if api_imports:
        lines = new_src.split('\n')
        insert_idx = 0
        # Skip 'use client' directive and any blank lines/comments at the top
        for i, line in enumerate(lines):
            if line.startswith("'use client'") or line.startswith('"use client"'):
                insert_idx = i + 1
                # Skip blank line after
                while insert_idx < len(lines) and not lines[insert_idx].strip():
                    insert_idx += 1
                break
            elif line.startswith('import ') or line.startswith('//'):
                insert_idx = i
                break
            elif not line.strip():
                continue
            else:
                insert_idx = i
                break
        
        # Insert the api-client imports before any other imports
        for imp in reversed(api_imports):
            lines.insert(insert_idx, imp)
        new_src = '\n'.join(lines)
    
    if new_src != original:
        path.write_text(new_src)
        return True
    return False


def main():
    for path in sorted(COMPONENTS_DIR.glob('*.tsx')):
        changed = fix_file(path)
        print(f"  {'✓' if changed else '·'} {path.name}")


if __name__ == '__main__':
    main()
