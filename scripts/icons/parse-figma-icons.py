#!/usr/bin/env python3
"""Parse Figma metadata pseudo-XML and produce a complete extraction plan.

Reads the saved get_metadata tool output (a JSON wrapper around an XML dump)
and emits a JSON plan with per-icon node IDs and deduped extraction batches.
"""

import json
import os
import re
import subprocess
import sys
from collections import defaultdict, OrderedDict

META_FILE = sys.argv[1] if len(sys.argv) > 1 else None
OUT_FILE = sys.argv[2] if len(sys.argv) > 2 else "scripts/icons/figma-extraction-plan.json"

if not META_FILE or not os.path.exists(META_FILE):
    print(f"usage: parse-figma-icons.py <metadata-json-file> [<output-file>]", file=sys.stderr)
    sys.exit(2)

xml = subprocess.check_output(["jq", "-r", ".[0].text", META_FILE]).decode("utf-8", errors="replace")

RE_FRAME_OPEN = re.compile(r'^(\s*)<frame\s+id="([^"]+)"\s+name="([^"]*)"')
RE_FRAME_CLOSE = re.compile(r'^(\s*)</frame>')
RE_SYMBOL = re.compile(r'^(\s*)<symbol\s+id="([^"]+)"\s+name="([^"]+)"')

frame_stack = []
symbols = []  # (ancestor_chain_ids, symbol_id, symbol_name)
frame_names = {}

for line in xml.split("\n"):
    if not line.strip():
        continue

    m = RE_FRAME_OPEN.match(line)
    if m:
        indent = len(m.group(1))
        while frame_stack and frame_stack[-1][0] >= indent:
            frame_stack.pop()
        fid = m.group(2)
        fname = m.group(3)
        frame_names[fid] = fname
        is_self_close = line.rstrip().endswith("/>")
        if not is_self_close:
            frame_stack.append((indent, fid, fname))
        continue

    m = RE_FRAME_CLOSE.match(line)
    if m:
        indent = len(m.group(1))
        while frame_stack and frame_stack[-1][0] >= indent:
            frame_stack.pop()
        continue

    m = RE_SYMBOL.match(line)
    if m:
        sid = m.group(2)
        sname = m.group(3)
        if "/" not in sname:
            continue
        # Capture ALL ancestor frames (deepest to shallowest) for this symbol
        ancestors = [fid for _, fid, _ in reversed(frame_stack)]
        symbols.append((ancestors, sid, sname))
        continue


def split_name(name):
    size_str, rest = name.split("/", 1)
    try:
        size = int(size_str)
    except ValueError:
        return None, None, False
    is_filled = False
    base = rest
    for suffix in ("-filled", "-fill", "-solid"):
        if rest.endswith(suffix):
            is_filled = True
            base = rest[: -len(suffix)]
            break
    return size, base, is_filled


icons_by_name = {}
for ancestors, sid, name in symbols:
    size, base, is_filled = split_name(name)
    if size is None:
        continue
    entry = icons_by_name.setdefault(base, {
        "sizes_outlined": set(),
        "sizes_filled": set(),
        "nodeId_outlined": {},
        "nodeId_filled": {},
        "fullName_outlined": {},
        "fullName_filled": {},
    })
    if is_filled:
        entry["sizes_filled"].add(size)
        entry["nodeId_filled"].setdefault(size, sid)
        entry["fullName_filled"].setdefault(size, name)
    else:
        entry["sizes_outlined"].add(size)
        entry["nodeId_outlined"].setdefault(size, sid)
        entry["fullName_outlined"].setdefault(size, name)

# For batching: for each frame, count the unique full-names of symbols that descend from it.
frame_descendant_symbols = defaultdict(set)  # frame_id -> set of (sid, name) tuples
for ancestors, sid, name in symbols:
    for aid in ancestors:
        frame_descendant_symbols[aid].add((sid, name))

# Greedy: at each step, pick the frame that covers the largest number of NEW unique icon names
# while keeping iconCount <= MAX_BATCH_SIZE. Repeat until all covered.
MAX_BATCH_SIZE = 12
covered_names = set()
batches = []

while True:
    best_frame = None
    best_new_names = set()
    best_new_pairs = set()

    for fid, pairs in frame_descendant_symbols.items():
        # Filter to NEW unique-by-name pairs
        new_pairs = []
        seen_names = set()
        for sid, name in pairs:
            if name in covered_names or name in seen_names:
                continue
            seen_names.add(name)
            new_pairs.append((sid, name))

        if len(new_pairs) == 0:
            continue
        if len(new_pairs) > MAX_BATCH_SIZE:
            continue

        if len(new_pairs) > len(best_new_pairs):
            best_frame = fid
            best_new_pairs = set(new_pairs)
            best_new_names = seen_names

    if not best_frame:
        break

    sorted_new_pairs = sorted(best_new_pairs, key=lambda p: p[1])
    batches.append({
        "containerNodeId": best_frame,
        "containerName": frame_names.get(best_frame, ""),
        "iconCount": len(sorted_new_pairs),
        "iconNames": [n for _, n in sorted_new_pairs],
        "iconNodeIds": {n: sid for sid, n in sorted_new_pairs},
    })
    covered_names |= best_new_names

all_names = {name for _, _, name in symbols}
uncovered = all_names - covered_names


def serialize_entry(e):
    return {
        "sizes_outlined": sorted(e["sizes_outlined"]),
        "sizes_filled": sorted(e["sizes_filled"]),
        "nodeId_outlined": {str(k): v for k, v in e["nodeId_outlined"].items()},
        "nodeId_filled": {str(k): v for k, v in e["nodeId_filled"].items()},
        "fullName_outlined": {str(k): v for k, v in e["fullName_outlined"].items()},
        "fullName_filled": {str(k): v for k, v in e["fullName_filled"].items()},
    }


sorted_icons = OrderedDict()
for base in sorted(icons_by_name.keys()):
    sorted_icons[base] = serialize_entry(icons_by_name[base])

per_size_outlined = defaultdict(set)
per_size_filled = defaultdict(set)
for base, e in icons_by_name.items():
    for s in e["sizes_outlined"]:
        per_size_outlined[s].add(base)
    for s in e["sizes_filled"]:
        per_size_filled[s].add(base)

output = {
    "summary": {
        "totalSymbolElements": len(symbols),
        "totalUniqueFullNames": len(all_names),
        "totalUniqueBaseNames": len(icons_by_name),
        "perSize_outlined": {str(s): len(per_size_outlined[s]) for s in sorted(per_size_outlined.keys())},
        "perSize_filled": {str(s): len(per_size_filled[s]) for s in sorted(per_size_filled.keys())},
        "batchesNeeded": len(batches),
        "coveredFullNames": len(covered_names),
        "uncoveredFullNames": len(uncovered),
        "uncoveredExamples": sorted(uncovered)[:20],
    },
    "iconsByBase": sorted_icons,
    "extractionBatches": batches,
}

os.makedirs(os.path.dirname(OUT_FILE) or ".", exist_ok=True)
with open(OUT_FILE, "w") as f:
    json.dump(output, f, indent=2)

print(json.dumps(output["summary"], indent=2))
