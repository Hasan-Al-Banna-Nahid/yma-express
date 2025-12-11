
import os
import re
from pathlib import Path

def convert_import_path(import_path, current_file_path):
    # If the import path is already an absolute path (e.g., 'express', '@app/...')
    if not import_path.startswith('.') and not import_path.startswith('/'):
        return import_path

    # Resolve the absolute path of the imported module
    current_file_dir = Path(current_file_path).parent
    absolute_imported_path_unresolved = current_file_dir / import_path
    
    # Check if the file exists before resolving, otherwise resolve might fail
    # or resolve to a non-existent path
    if not absolute_imported_path_unresolved.exists() and not (absolute_imported_path_unresolved.with_suffix('.ts').exists() or absolute_imported_path_unresolved.with_suffix('.js').exists()):
        # If the direct path doesn't exist, it might be a module within a directory
        # e.g., import from './module' might mean './module/index.ts' or './module.ts'
        # For simplicity for now, if it doesn't exist as a file, we'll keep the original path
        # This will need refinement for cases like 'import { x } from "./someDir"' where 'someDir' contains 'index.ts'
        return import_path
        
    absolute_imported_path = absolute_imported_path_unresolved.resolve()

    # Define the project root and src/app path
    project_root = Path(os.getcwd()) # Assuming script is run from project root
    src_app_path = project_root / 'src' / 'app'

    # Try to make the imported path relative to src/app
    try:
        relative_to_src_app = absolute_imported_path.relative_to(src_app_path)
        # Construct the @app alias path
        # Remove .ts or .js extension if present, as TypeScript handles this
        new_path = str(relative_to_src_app.as_posix())
        if new_path.endswith('.ts'):
            new_path = new_path[:-3]
        elif new_path.endswith('.js'): # In case of compiled JS or d.ts files
            new_path = new_path[:-3]
        
        # Check if the original import path included the extension. If it did, preserve it.
        # This is a heuristic and might need to be more robust.
        if import_path.endswith('.ts') and not new_path.endswith('.ts'):
            return f"@app/{new_path}.ts"
        elif import_path.endswith('.js') and not new_path.endswith('.js'):
            return f"@app/{new_path}.js"
        
        return f"@app/{new_path}"
    except ValueError:
        # If the path is not within src/app, it means it's either in 'src' but outside 'app'
        # or it's a sibling of 'src' or completely outside the project.
        # For now, if it's not in src/app, we'll keep the original relative path
        # This decision keeps 'src/app' specific aliases and leaves other relative paths as is.
        # This can be refined later if 'src' also needs an alias.
        pass
    
    return import_path


def refactor_imports_in_file(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    # Regex to find import statements
    # It captures the module path from `from "module_path"` or `require("module_path")`
    # Handles multiline imports by using re.DOTALL
    import_regex = re.compile(r"""
        (                                   # Group 1: entire import/require prefix
            (?:import(?:[\s\S]*?)from\s+)   # ES Module: import ... from
            |                               # OR
            (?:(?:const|var|let)\s+\w+\s*=\s*require\s*\() # CommonJS: const x = require(
        )
        (?P<quote>["'])                     # Group <quote>: The opening quote (") or (')
        (?P<import_path>[^"']+)             # Group <import_path>: The actual import path
        (?P=quote)                          # Match the closing quote
        (\)?)                               # Optional closing parenthesis for require
    """, re.VERBOSE | re.DOTALL)


    modified_content = content
    # Find all matches first to avoid issues with `replace` changing indices
    matches = list(import_regex.finditer(content))
    
    # Process matches in reverse order to keep indices valid if replacements change length
    for match in reversed(matches):
        old_import_path = match.group('import_path')
        
        new_import_path = convert_import_path(old_import_path, file_path)

        if old_import_path != new_import_path:
            start, end = match.span('import_path')
            modified_content = modified_content[:start] + new_import_path + modified_content[end:]

    return modified_content

if __name__ == "__main__":
    # Assuming script is run from the project root
    project_root = Path(os.getcwd())
    src_dir = project_root / 'src'
    
    # Find all .ts files, excluding .d.ts (declaration files) and files in src/app/types
    ts_files = [
        f for f in src_dir.rglob('*.ts') 
        if not f.name.endswith('.d.ts') and 'src/app/types' not in str(f)
    ]

    for ts_file in ts_files:
        print(f"Processing {ts_file.relative_to(project_root)}...")
        original_content = ts_file.read_text()
        modified_content = refactor_imports_in_file(ts_file)
        
        if original_content != modified_content:
            ts_file.write_text(modified_content)
            print(f"  Modified {ts_file.relative_to(project_root)}")
        else:
            print(f"  No changes for {ts_file.relative_to(project_root)}")

