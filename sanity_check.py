"""Sanity check for publications.json: duplicate detection and a short summary.

Duplicates are grouped into clusters (entries linked by an equal name or an equal
ISSN) and printed as a single merged JSON object per cluster, ready to be pasted
into publications.json in place of the entries it replaces.
"""

import json
from collections import Counter, defaultdict
from pathlib import Path

PUBLICATIONS = Path(__file__).parent / "old.json"

# Same filters the UI offers (see app.js)
FILTERS = [
    ("AIS Senior Scholar Basket", lambda p: bool(p.get("isISSeniorScholarBasket"))),
    ("AIS SIG Categories", lambda p: bool(p.get("AIS SIG Categories"))),
    ("VHB-2024-WI A+", lambda p: p.get("VHB-2024-WI-rank") == "A+"),
    ("VHB-2024-WI A", lambda p: p.get("VHB-2024-WI-rank") == "A"),
    ("VHB-2024-WI B", lambda p: p.get("VHB-2024-WI-rank") == "B"),
    ("VHB-2024-WI conference A", lambda p: p.get("VHB-2024-WI-conference-rank") == "A"),
    ("VHB-2024-WI conference B", lambda p: p.get("VHB-2024-WI-conference-rank") == "B"),
    ("VHB-2024-WI interface A+", lambda p: p.get("VHB-2024-WI-interface-rank") == "A+"),
    ("VHB-2024-WI interface A", lambda p: p.get("VHB-2024-WI-interface-rank") == "A"),
    ("VHB-2024-WI interface B", lambda p: p.get("VHB-2024-WI-interface-rank") == "B"),
]

RANK_KEYS = ["VHB-2024-WI-rank", "VHB-2024-WI-conference-rank", "VHB-2024-WI-interface-rank"]
RANK_ORDER = {"A+": 0, "A": 1, "B": 2}
# Only for stable output; the app picks a database via the user's preference list, not this order
DATABASE_ORDER = ["scopus", "ebscohost", "proquest", "acm", "aisel"]


def normalize_name(name):
    return " ".join(name.split()).lower()


def normalize_issn(issn):
    return issn.replace("-", "").strip().lower()


def databases(pub):
    """The database field is usually a list, but sometimes the string "None"."""
    db = pub.get("database")
    return db if isinstance(db, list) else [str(db)]


def duplicate_clusters(pubs):
    """Group entries that share a name or an ISSN (transitively) into clusters."""
    parent = list(range(len(pubs)))

    def root(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    keys = defaultdict(list)
    for i, pub in enumerate(pubs):
        keys["name:" + normalize_name(pub["name"])].append(i)
        if pub.get("ISSN"):
            keys["issn:" + normalize_issn(pub["ISSN"])].append(i)

    for members in keys.values():
        for i in members[1:]:
            parent[root(i)] = root(members[0])

    clusters = defaultdict(list)
    for i in range(len(pubs)):
        clusters[root(i)].append(i)
    return [sorted(c) for c in clusters.values() if len(c) > 1]


def merge(group, warn):
    """Merge a cluster of duplicate entries into one; report conflicts via warn()."""
    merged = {"name": group[0]["name"].strip()}

    names = {p["name"].strip() for p in group}
    if len(names) > 1:
        warn(f"kept name {merged['name']!r}, dropped {sorted(names - {merged['name']})}")

    dbs = [db for pub in group for db in databases(pub) if db != "None"]
    merged["database"] = sorted(set(dbs), key=lambda d: (DATABASE_ORDER + [d]).index(d)) or "None"

    issns = list(dict.fromkeys(p["ISSN"].strip() for p in group if p.get("ISSN")))
    if issns:
        merged["ISSN"] = issns[0]
        if len(issns) > 1:
            warn(f"kept ISSN {issns[0]!r}, dropped {issns[1:]} (only one ISSN is used)")

    for key in ["search_term", "conference_name"]:
        values = list(dict.fromkeys(p[key] for p in group if p.get(key)))
        if values:
            merged[key] = values[0]
            if len(values) > 1:
                warn(f"kept {key} {values[0]!r}, dropped {values[1:]}")

    if any("isISSeniorScholarBasket" in p for p in group):
        merged["isISSeniorScholarBasket"] = any(p.get("isISSeniorScholarBasket") for p in group)

    for key in RANK_KEYS:
        ranks = {p[key] for p in group if p.get(key)}
        if ranks:
            merged[key] = min(ranks, key=lambda r: RANK_ORDER.get(r, len(RANK_ORDER)))
            if len(ranks) > 1:
                warn(f"conflicting {key} {sorted(ranks)}, kept best: {merged[key]}")

    categories = sorted({c for p in group for c in p.get("AIS SIG Categories", [])})
    if categories:
        merged["AIS SIG Categories"] = categories

    return merged


def print_clusters(pubs, clusters):
    print(f"{len(clusters)} duplicate clusters covering "
          f"{sum(len(c) for c in clusters)} entries.\n")
    for indices in clusters:
        group = [pubs[i] for i in indices]
        warnings = []
        merged = merge(group, warnings.append)
        print("// replaces: " + " | ".join(f"#{i + 1} {pubs[i]['name']}" for i in indices))
        for warning in warnings:
            print(f"// check: {warning}")
        block = json.dumps(merged, indent=2, ensure_ascii=False)
        print("\n".join("  " + line for line in block.splitlines()) + ",\n")


def main():
    pubs = json.loads(PUBLICATIONS.read_text(encoding="utf-8"))
    print(f"{len(pubs)} publications in {PUBLICATIONS.name}\n")

    clusters = duplicate_clusters(pubs)
    if clusters:
        print_clusters(pubs, clusters)
    else:
        print("No duplicate names or ISSNs.\n")

    print("Publications per filter:")
    for label, matches in FILTERS:
        print(f"  {label}: {sum(1 for p in pubs if matches(p))}")
    print(f"  (matching no filter: {sum(1 for p in pubs if not any(m(p) for _, m in FILTERS))})")
    print()

    print("Publications per database:")
    counts = Counter(db for pub in pubs for db in databases(pub))
    for db, count in counts.most_common():
        print(f"  {db}: {count}")
    print()

    print("Publications per AIS SIG category:")
    categories = Counter(c for pub in pubs for c in pub.get("AIS SIG Categories", []))
    for category, count in categories.most_common():
        print(f"  {category}: {count}")
    print(f"  total: {sum(categories.values())} assignments across {len(categories)} categories")


if __name__ == "__main__":
    main()
