#!/usr/bin/env python3
"""Properly fix the broken imports from the refactor script.

The pattern we need to fix:
  import {
  import { api } from '@/lib/api-client'
  import { MilestoneWithMeta } from '@/lib/api-client'
  import { useEffect, useState, useTransition } from 'react'
    Loader2, Plus, ...,
  } from 'lucide-react'

What we want:
  import { api, MilestoneWithMeta } from '@/lib/api-client'
  import { useEffect, useState, useTransition } from 'react'
  import {
    Loader2, Plus, ...,
  } from 'lucide-react'

Strategy: scan the file, find all `import {` openings that are followed by
other `import { ... }` lines (instead of name lines). For each, collect the
"interrupting" import lines, fix the import block, and add the interrupting
imports back at the proper location.
"""
import re
from pathlib import Path

COMPONENTS_DIR = Path('/home/z/my-project/src/components/app')

def fix_file(path: Path):
    src = path.read_text()
    original = src
    
    lines = src.split('\n')
    out_lines = []
    i = 0
    interrupted_imports = []  # imports that got inserted inside other import blocks
    
    while i < len(lines):
        line = lines[i]
        # Look for `import {` at end of line (start of multi-line import block)
        if re.match(r'^import\s*\{$', line.strip()):
            # Start of a multi-line import block — collect everything until `} from '...'`
            block_lines = [line]
            i += 1
            while i < len(lines) and not re.match(r"^\s*\}\s*from\s+'", lines[i]):
                cur = lines[i]
                # If this line is itself an `import { ... } from '...'` line, it's an interrupted import
                if re.match(r"^\s*import\s*\{.*\}\s*from\s+'", cur):
                    interrupted_imports.append(cur.strip())
                else:
                    block_lines.append(cur)
                i += 1
            if i < len(lines):
                block_lines.append(lines[i])  # the `} from '...'` line
                i += 1
            
            # Re-emit the multi-line import block cleanly
            # Find the indentation of the first name line
            indent = '  '
            for bl in block_lines[1:-1]:
                if bl.strip():
                    indent = bl[:len(bl) - len(bl.lstrip())]
                    break
            
            out_lines.append(block_lines[0])  # `import {`
            for bl in block_lines[1:-1]:
                if bl.strip():
                    out_lines.append(bl)
            out_lines.append(block_lines[-1])  # `} from '...'`
        else:
            out_lines.append(line)
            i += 1
    
    # Now insert the interrupted imports at the right place
    # Strategy: find the first `import` line and insert before it
    # (or after 'use client' if present)
    if interrupted_imports:
        new_lines = []
        inserted = False
        for line in out_lines:
            # Insert before the first import line, OR after the 'use client' + blank line
            if not inserted and (line.startswith('import ') or (line.strip() == '' and any(l.startswith('import ') for l in out_lines[out_lines.index(line):]))):
                # Skip blank line and check next
                if line.strip() == '':
                    new_lines.append(line)
                    continue
                # Insert all interrupted imports here
                for imp in interrupted_imports:
                    new_lines.append(imp)
                inserted = True
            new_lines.append(line)
        
        if not inserted:
            # Append at the end
            for imp in interrupted_imports:
                new_lines.append(imp)
        
        out_lines = new_lines
    
    new_src = '\n'.join(out_lines)
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
