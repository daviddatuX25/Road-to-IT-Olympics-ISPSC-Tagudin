#!/usr/bin/env python3
"""Refactor all components to use api-client instead of direct server action imports."""
import re
import os
from pathlib import Path

COMPONENTS_DIR = Path('/home/z/my-project/src/components/app')
PAGE_FILE = Path('/home/z/my-project/src/app/page.tsx')

# All action function names exported from actions.ts
ACTIONS = [
    'loginAction', 'logoutAction', 'getCurrentUser', 'updateProfileAction',
    'listUsersAction', 'createUserAction', 'updateUserRoleAction', 'deleteUserAction',
    'assignCaptainAction', 'removeCaptainAction',
    'listDomainsAction',
    'listMilestoneMetaAction', 'getMilestoneAction', 'createMilestoneAction',
    'versionMilestoneAction', 'archiveMilestoneAction', 'activateMilestoneAction',
    'submitGuidedFormAction', 'submitJsonAction',
    'listMySubmissionsAction', 'listDomainSubmissionsAction',
    'getStreakBreakdownAction', 'getLeaderboardAction',
    'listProctoredMocksAction', 'createProctoredMockAction', 'deleteProctoredMockAction',
    'listTeamSelectionsAction', 'selectTeamMemberAction', 'removeTeamSelectionAction',
    'createSpotlightAction', 'listAppEventsAction',
    'getStudentDashboardDataAction', 'getInstructorDashboardDataAction', 'getAdminDashboardDataAction',
]

# Types that are also exported
TYPES = ['LeaderboardEntry', 'MilestoneWithMeta']

def refactor_file(path: Path):
    src = path.read_text()
    original = src
    
    # Find the import block from '@/lib/actions'
    # Handle: import { A, B, type C, type D } from '@/lib/actions'
    # And:    import type { C, D } from '@/lib/actions'
    
    # Step 1: extract all imported names from `from '@/lib/actions'` imports
    actions_imported = []
    types_imported = []
    
    # Match: import { ... } from '@/lib/actions'
    for m in re.finditer(r"import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+'@/lib/actions'", src):
        names_text = m.group(1)
        for name in names_text.split(','):
            name = name.strip()
            if not name: continue
            # Handle "type X" syntax
            if name.startswith('type '):
                name = name[5:].strip()
                if name in TYPES:
                    types_imported.append(name)
            elif name in TYPES:
                types_imported.append(name)
            else:
                actions_imported.append(name)
    
    if not actions_imported and not types_imported:
        return False  # nothing to refactor
    
    # Step 2: remove the import lines for @/lib/actions
    src = re.sub(
        r"import\s+(?:type\s+)?\{[^}]+\}\s+from\s+'@/lib/actions'\n",
        '',
        src,
    )
    
    # Step 3: add new imports — `api` plus any types
    new_imports = []
    if actions_imported:
        new_imports.append("import { api } from '@/lib/api-client'")
    if types_imported:
        new_imports.append(f"import {{ {' '.join(types_imported)} }} from '@/lib/api-client'")
    if new_imports:
        # Insert at the top after the 'use client' or first comment block
        # Find a good place to insert — after the last existing import in the top block
        lines = src.split('\n')
        insert_idx = 0
        for i, line in enumerate(lines):
            if line.startswith('import ') or line.startswith("'use client'") or line.startswith('"use client"') or line.startswith('//') or not line.strip():
                insert_idx = i + 1
            else:
                break
        # Actually, insert after the last 'import' line in the top section
        # Find last import line before any other code
        last_import = -1
        for i, line in enumerate(lines):
            if line.startswith('import '):
                last_import = i
            elif line.strip() and not line.startswith('//') and not line.startswith("'use client'") and not line.startswith('"use client"'):
                if last_import >= 0:
                    break
        if last_import >= 0:
            insert_idx = last_import + 1
        else:
            # Find 'use client' line
            for i, line in enumerate(lines):
                if line.startswith("'use client'") or line.startswith('"use client"'):
                    insert_idx = i + 1
                    break
        
        for imp in reversed(new_imports):
            lines.insert(insert_idx, imp)
        src = '\n'.join(lines)
    
    # Step 4: replace direct action calls with api.X calls
    # Pattern: `loginAction(...)` → `api.loginAction(...)`
    # But only when not preceded by `.` or `api.`
    for action in actions_imported:
        # Match action name as a function call, not preceded by . or _
        # Use word boundary and lookbehind for not . and not _
        src = re.sub(
            rf"(?<![.\w]){re.escape(action)}\s*\(",
            f'api.{action}(',
            src,
        )
    
    # Special handling for page.tsx which dynamically imports logoutAction
    if 'logoutAction' in src and "import(" in src and "@/lib/actions" in src:
        # Skip — page.tsx has its own pattern
        pass
    
    # Save
    path.write_text(src)
    return src != original


def refactor_page_tsx(path: Path):
    """Special handling for page.tsx which dynamically imports logoutAction."""
    src = path.read_text()
    # Replace dynamic import
    src = src.replace(
        "const { logoutAction } = await import('@/lib/actions')\n        await logoutAction()",
        "await api.logoutAction()",
    )
    # Update imports — add api import, remove getCurrentUser from actions
    src = src.replace(
        "import { getCurrentUser } from '@/lib/actions'",
        "import { api } from '@/lib/api-client'",
    )
    src = src.replace("getCurrentUser()", "api.getCurrentUser()")
    path.write_text(src)


def main():
    # Refactor all components
    for path in sorted(COMPONENTS_DIR.glob('*.tsx')):
        changed = refactor_file(path)
        print(f"  {'✓' if changed else '·'} {path.name}")
    
    # Refactor page.tsx
    print("  ✓ page.tsx (special)")
    refactor_page_tsx(PAGE_FILE)


if __name__ == '__main__':
    main()
