#!/usr/bin/env python3
"""
Generate enriched data.json for History Learnings app.

Sources:
  - Jira export: _System/_Data/jira_export_2026-02-25.json (53,737 tickets)
  - Coda Services: _Rohdaten/Coda/2026-01-25/Services Übersicht.csv (58 services)
  - Coda Sales: _Rohdaten/Coda/2026-01-25/Sales Übersicht.csv (market domains)
  - Coda Staff: _Rohdaten/Coda/2026-01-25/Staff.csv (59 people)
  - Coda Units: _Rohdaten/Coda/2026-01-25/Units.csv (10 units)

Output: public/data.json
"""
import json
import csv
import re
from collections import Counter, defaultdict
from pathlib import Path
from datetime import date

VAULT = Path(__file__).resolve().parents[3]  # Kultur/
APP = Path(__file__).resolve().parents[1]     # history-learnings/
CODA = VAULT / "_Rohdaten" / "Coda" / "2026-01-25"
DATA = VAULT / "_System" / "_Data"

# ── Load Sources ──

def load_jira():
    with open(DATA / "jira_export_2026-02-25.json") as f:
        raw = json.load(f)
    tickets = []
    for proj, data in raw.items():
        for issue in data["issues"]:
            issue["project"] = proj
            tickets.append(issue)
    return tickets

def load_services():
    """Load services from Coda CSV + hardcoded catalog for services missing from CSV."""
    services = {}
    with open(CODA / "Services Übersicht.csv") as f:
        for row in csv.DictReader(f):
            name = row["Name"].strip()
            services[name] = {
                "kategorie": row["Servicekategorie"].strip(),
                "status": row["Status"].strip(),
                "type": row["Service Type"].strip(),
                "unit": row.get("Unit", "").strip(),
                "owner": row.get("Service Owner", "").strip(),
            }
    # Services known from Coda but not in the CSV export (14 missing)
    extra = {
        "1Password operating": {"kategorie": "IT-Systeme und Netzwerke", "status": "Live", "type": "Managed Service", "unit": "Managed Services", "owner": "Dominik Deuschle"},
        "Checkmk operating": {"kategorie": "IT-Systeme und Netzwerke", "status": "Live", "type": "Operation Service", "unit": "Managed Services", "owner": "Jonathan Demmerle"},
        "Cyber Risiko Check (nach DIN Spec 27076)": {"kategorie": "Organisation und Sensibilisierung", "status": "Entwicklung", "type": "Assessment Service", "unit": "Engineering & Consulting", "owner": "Carsten Strozyk"},
        "Housing": {"kategorie": "IT-Systeme und Netzwerke", "status": "Live", "type": "Managed Service", "unit": "Cloud Platform Services", "owner": "Benjamin Stier"},
        "Managed Bizzdesign Horizzon": {"kategorie": "IT-Systeme und Netzwerke", "status": "Live", "type": "Customized Service", "unit": "Managed Services", "owner": "Jonathan Demmerle"},
        "Managed Monitoring": {"kategorie": "IT-Systeme und Netzwerke", "status": "Live", "type": "Managed Service", "unit": "Managed Services", "owner": "Dominik Deuschle"},
        "Managed Openshift": {"kategorie": "PaaS", "status": "Live", "type": "Managed Service", "unit": "Cloud Platform Services", "owner": "Benjamin Stier"},
        "Secure Remote Browsing": {"kategorie": "PaaS", "status": "Live", "type": "Managed Service", "unit": "Cloud Platform Services", "owner": "Benjamin Stier"},
        "Shared Firewall": {"kategorie": "IT-Systeme und Netzwerke", "status": "Maintenance / EoS", "type": "Managed Service", "unit": "Managed Services", "owner": "Peter Sturm"},
        "TaRZ": {"kategorie": "PaaS", "status": "Maintenance / EoS", "type": "Managed Service", "unit": "Cloud Platform Services", "owner": "Jonathan Demmerle"},
        "levigo/matrix Mail Server": {"kategorie": "", "status": "Live", "type": "Managed Service", "unit": "", "owner": "Klaus Rein"},
        "managed Atlassian": {"kategorie": "IT-Systeme und Netzwerke", "status": "Live", "type": "Customized Service", "unit": "Managed Services", "owner": "Michael Levec"},
        "managed.wireguard": {"kategorie": "IT-Systeme und Netzwerke", "status": "Live", "type": "Managed Service", "unit": "Cloud Platform Services", "owner": "Benjamin Stier"},
        "vCIO": {"kategorie": "Organisation und Sensibilisierung", "status": "GTM Ready", "type": "Assessment Service", "unit": "Engineering & Consulting", "owner": "Vincenzo Biasi"},
    }
    for name, meta in extra.items():
        if name not in services:
            services[name] = meta
    return services

def load_sales():
    sales = {}
    with open(CODA / "Sales Übersicht.csv") as f:
        for row in csv.DictReader(f):
            name = row["Name"].strip()
            sales[name] = {
                "marktDomain": row.get("Markt IT-Domäne", "").strip(),
                "portfolioSegment": row.get("levigo Portfolio Segment", "").strip(),
                "sizing": row.get("Service Sizing", "").strip(),
            }
    return sales

def load_staff():
    staff = []
    with open(CODA / "Staff.csv") as f:
        for row in csv.DictReader(f):
            name = row["Name"].strip()
            if not name:
                continue
            staff.append({
                "name": name,
                "unit": row.get("Unit", "").strip(),
                "wochenstunden": row.get("Wochenstunden", "").strip(),
                "fte": row.get("verfügbare FTE", "").strip(),
                "rollen": row.get("Rollen", "").strip(),
                "zuweisungPct": row.get("% Zuweisung", "").strip(),
            })
    return staff

def load_units():
    units = []
    with open(CODA / "Units.csv") as f:
        for row in csv.DictReader(f):
            unit = row["Unit"].strip()
            if not unit:
                continue
            units.append({
                "name": unit,
                "kuerzel": row.get("Kürzel", "").strip(),
                "status": row.get("Status", "").strip(),
                "fte": row.get("FTE Staffing", "").strip(),
                "kategorie": row.get("Kategorie", "").strip(),
                "beschreibung": row.get("Beschreibung / Typische Aufgaben", "").strip(),
            })
    return units

# ── Matching ──

def build_matchers(services):
    """Build regex matchers for service names with aliases."""
    # Aliases: additional patterns that match to a service
    ALIASES = {
        "Managed Infrastruktur": [r"infrastruktur", r"infra\b"],
        "Managed Backup & DR": [r"backup", r"veeam", r"\bDR\b", r"disaster.?recovery"],
        "Managed Monitoring": [r"monitoring", r"checkmk.*monitor", r"monitor.*check"],
        "Managed MS Exchange Server": [r"exchange", r"exchange.?server"],
        "Managed Microsoft 365": [r"microsoft\s*365", r"\bM365\b", r"office\s*365", r"\bO365\b"],
        "Managed Cryptshare": [r"cryptshare"],
        "Shared Firewall": [r"shared.*firewall", r"firewall.*shared", r"SFW\b"],
        "Managed Citrix": [r"citrix"],
        "managed Atlassian": [r"atlassian", r"jira.*managed", r"confluence.*managed"],
        "Managed Networking (WLAN)": [r"wlan", r"wifi", r"wireless"],
        "Managed Networking (LAN)": [r"\bLAN\b.*managed", r"managed.*\bLAN\b"],
        "Managed Baramundi": [r"baramundi"],
        "levigo cloud.drive": [r"cloud\.?drive", r"clouddrive"],
        "Kaspersky aaS": [r"kaspersky"],
        "Managed Windows Server & AD": [r"windows.?server", r"active.?directory", r"\bAD\b.*managed"],
        "levigo managed.archive": [r"managed\.?archive", r"archiv"],
        "Managed MS SQL Server": [r"sql.?server", r"mssql"],
        "Patchmanagement (Windows)": [r"patch.*windows", r"windows.*patch"],
        "Patchmanagement (Linux)": [r"patch.*linux", r"linux.*patch"],
        "levigo AntiSpam": [r"antispam", r"anti.?spam", r"spam.*filter"],
        "Managed Endpointsecurity": [r"endpoint.*security", r"endpoint.*protection"],
        "Managed Linux Server": [r"linux.?server"],
        "Managed Bizzdesign Horizzon": [r"bizzdesign", r"horizzon"],
        "Managed MDM": [r"\bMDM\b", r"mobile.?device"],
        "levigo Webhosting": [r"webhosting", r"web.?hosting"],
        "levigo/matrix Mail Server": [r"mail.?server", r"mailserver", r"matrix.*mail"],
        "managed.wireguard": [r"wireguard"],
        "Housing": [r"\bhousing\b", r"colocation", r"coloc"],
        "Managed KEMP": [r"\bKEMP\b", r"loadbalancer", r"load.?balancer"],
        "Managed Openshift": [r"openshift"],
        "Service Desk": [r"service.?desk"],
        "TaRZ": [r"\bTaRZ\b"],
        "S3 aaS": [r"\bS3\b.*aaS", r"object.?storage"],
        "Kubernetes aaS on VDC (Addon zu CCP)": [r"kubernetes", r"\bk8s\b"],
        "Stundenkontingent": [r"stundenkontingent", r"kontingent"],
        "Projektmanagement": [r"projektmanagement"],
        "levigo managed.conference": [r"managed\.?conference", r"konferenz"],
        "Externer ISB": [r"externer.*ISB", r"\bISB\b"],
        "1Password operating": [r"1password", r"1Password"],
        "Managed Mattermost": [r"mattermost"],
        "Managed Firewall": [r"managed.*firewall"],
        "Secure Remote Browsing": [r"remote.?browsing"],
        "Checkmk operating": [r"checkmk", r"check_mk"],
        "levigo CCP": [r"\bCCP\b", r"cloud.?computing.?platform"],
        "levigo vDC": [r"\bvDC\b", r"virtual.?data.?center"],
        "managed.backup (VCC)": [r"backup.*VCC", r"VCC.*backup"],
        "managed.backup für M365": [r"backup.*M365", r"M365.*backup", r"backup.*microsoft.*365"],
        "Cyber Risiko Check (nach DIN Spec 27076)": [r"cyber.*risiko", r"DIN.*27076"],
        "vCIO": [r"\bvCIO\b"],
    }

    matchers = []
    for name in services:
        # Primary: exact service name
        escaped = re.escape(name)
        matchers.append((name, re.compile(escaped, re.IGNORECASE)))
        # Secondary: aliases
        for alias in ALIASES.get(name, []):
            matchers.append((name, re.compile(alias, re.IGNORECASE)))

    # Sort by pattern length descending (longer/more specific patterns first)
    matchers.sort(key=lambda x: -len(x[1].pattern))
    return matchers

def match_ticket(ticket, matchers):
    """Match a ticket to a service by summary + description."""
    summary = ticket.get("summary", "")
    desc = ticket.get("description", "") or ""
    text = f"{summary} {desc}"
    for name, pattern in matchers:
        if pattern.search(text):
            return name
    return None

# ── Analysis ──

def analyze(tickets, services, sales, staff_list, units_list):
    matchers = build_matchers(services)

    # Match tickets
    matched = defaultdict(list)
    unmatched = []
    for t in tickets:
        svc = match_ticket(t, matchers)
        if svc:
            matched[svc].append(t)
        else:
            unmatched.append(t)

    total_matched = sum(len(v) for v in matched.values())

    # ── Service profiles ──
    service_list = []
    for name, meta in services.items():
        tix = matched.get(name, [])

        # Assignee counts
        assignees = Counter(t["assignee"] for t in tix if t.get("assignee"))
        top_assignees = [{"name": n, "count": c} for n, c in assignees.most_common(8)]

        # Yearly
        yearly = Counter()
        for t in tix:
            year = t.get("created", "")[:4]
            if year:
                yearly[year] += 1

        # Monthly (for sparkline)
        monthly = Counter()
        for t in tix:
            month = t.get("created", "")[:7]
            if month:
                monthly[month] += 1

        # By type, project, status, priority
        by_type = Counter(t.get("type", "Unknown") for t in tix)
        by_project = Counter(t.get("project", "?") for t in tix)
        by_status = Counter(t.get("status", "Unknown") for t in tix)
        by_priority = Counter(t.get("priority") or "None" for t in tix)

        # Samples
        samples = [{"key": t["key"], "summary": t["summary"]} for t in tix[:5]]

        # Sales enrichment
        sale = sales.get(name, {})

        # Incident rate
        incidents = sum(1 for t in tix if t.get("type") == "Incident")
        incident_rate = round(incidents / len(tix) * 100, 1) if tix else 0

        # Avg tickets per month (active months only)
        active_months = len(monthly)
        avg_monthly = round(len(tix) / active_months, 1) if active_months else 0

        # Reporter distribution (who creates tickets)
        reporters = Counter(t["reporter"] for t in tix if t.get("reporter"))
        top_reporters = [{"name": n, "count": c} for n, c in reporters.most_common(5)]

        service_list.append({
            "name": name,
            "status": meta["status"],
            "type": meta["type"],
            "kategorie": meta["kategorie"],
            "unit": meta["unit"],
            "owner": meta["owner"],
            "beschreibung": "",
            # Sales enrichment
            "marktDomain": sale.get("marktDomain", ""),
            "portfolioSegment": sale.get("portfolioSegment", ""),
            # Ticket data
            "tickets": len(tix),
            "incidents": incidents,
            "incidentRate": incident_rate,
            "avgMonthly": avg_monthly,
            "topAssignees": top_assignees,
            "topReporters": top_reporters,
            "yearlyTickets": dict(sorted(yearly.items())),
            "monthlyTickets": dict(sorted(monthly.items())),
            "byType": dict(by_type.most_common()),
            "byProject": dict(by_project.most_common()),
            "byStatus": dict(by_status.most_common()),
            "byPriority": dict(by_priority.most_common()),
            "samples": samples,
        })

    service_list.sort(key=lambda s: -s["tickets"])

    # ── Team profiles (enriched with Staff data) ──
    staff_lookup = {s["name"]: s for s in staff_list}

    all_assignees = defaultdict(lambda: {"tickets": [], "services": Counter()})
    for svc_name, tix in matched.items():
        for t in tix:
            a = t.get("assignee")
            if a:
                all_assignees[a]["tickets"].append(t)
                all_assignees[a]["services"][svc_name] += 1

    team_profiles = {}
    for name, data in all_assignees.items():
        tix = data["tickets"]
        yearly = Counter()
        monthly = Counter()
        for t in tix:
            year = t.get("created", "")[:4]
            month = t.get("created", "")[:7]
            if year: yearly[year] += 1
            if month: monthly[month] += 1

        by_type = Counter(t.get("type", "Unknown") for t in tix)

        top_services = [{"name": n, "count": c} for n, c in data["services"].most_common()]

        # Staff enrichment
        staff_info = staff_lookup.get(name, {})

        team_profiles[name] = {
            "totalTickets": len(tix),
            "topServices": top_services,
            "yearlyTickets": dict(sorted(yearly.items())),
            "monthlyTickets": dict(sorted(monthly.items())),
            "byType": dict(by_type.most_common()),
            # Staff enrichment
            "unit": staff_info.get("unit", ""),
            "wochenstunden": staff_info.get("wochenstunden", ""),
            "fte": staff_info.get("fte", ""),
            "rollen": staff_info.get("rollen", ""),
        }

    # ── Yearly trend (enriched with monthly) ──
    yearly_trend = defaultdict(lambda: {"total": 0, "byType": Counter(), "byProject": Counter()})
    monthly_trend = defaultdict(lambda: {"total": 0, "byType": Counter(), "byProject": Counter()})

    for svc_tix in matched.values():
        for t in svc_tix:
            year = t.get("created", "")[:4]
            month = t.get("created", "")[:7]
            typ = t.get("type", "Unknown")
            proj = t.get("project", "?")
            if year:
                yearly_trend[year]["total"] += 1
                yearly_trend[year]["byType"][typ] += 1
                yearly_trend[year]["byProject"][proj] += 1
            if month:
                monthly_trend[month]["total"] += 1
                monthly_trend[month]["byType"][typ] += 1
                monthly_trend[month]["byProject"][proj] += 1

    yearly_out = {}
    for y in sorted(yearly_trend):
        d = yearly_trend[y]
        yearly_out[y] = {"total": d["total"], "byType": dict(d["byType"]), "byProject": dict(d["byProject"])}

    monthly_out = {}
    for m in sorted(monthly_trend):
        d = monthly_trend[m]
        monthly_out[m] = {"total": d["total"], "byType": dict(d["byType"]), "byProject": dict(d["byProject"])}

    # ── Unmatched analysis (enriched) ──
    unmatched_by_type = Counter(t.get("type", "Unknown") for t in unmatched)
    unmatched_by_project = Counter(t.get("project", "?") for t in unmatched)
    unmatched_by_status = Counter(t.get("status", "Unknown") for t in unmatched)
    unmatched_by_priority = Counter(t.get("priority") or "None" for t in unmatched)
    unmatched_yearly = Counter(t.get("created", "")[:4] for t in unmatched if t.get("created"))
    unmatched_monthly = Counter(t.get("created", "")[:7] for t in unmatched if t.get("created"))

    # Top unmatched assignees
    unmatched_assignees = Counter(t.get("assignee") for t in unmatched if t.get("assignee"))

    # Word frequency in unmatched summaries (for service discovery)
    word_freq = Counter()
    stop_words = {"für", "von", "und", "der", "die", "das", "auf", "vom", "des", "am", "im", "zu",
                  "den", "in", "mit", "aus", "an", "bei", "nach", "über", "ein", "eine", "einem",
                  "einen", "einer", "ist", "wird", "wurde", "werden", "hat", "als", "nicht", "oder"}
    for t in unmatched:
        words = re.findall(r'[a-zA-ZäöüÄÖÜß]{3,}', t.get("summary", ""))
        for w in words:
            wl = w.lower()
            if wl not in stop_words and len(wl) > 3:
                word_freq[wl] += 1

    # ── Category analysis ──
    categories = defaultdict(lambda: {"services": 0, "tickets": 0, "incidents": 0, "serviceNames": []})
    for s in service_list:
        cat = s["kategorie"] or "Ohne Kategorie"
        categories[cat]["services"] += 1
        categories[cat]["tickets"] += s["tickets"]
        categories[cat]["incidents"] += s["incidents"]
        categories[cat]["serviceNames"].append(s["name"])

    cat_list = []
    for cat, data in sorted(categories.items(), key=lambda x: -x[1]["tickets"]):
        cat_list.append({
            "name": cat,
            "services": data["services"],
            "tickets": data["tickets"],
            "incidents": data["incidents"],
            "incidentRate": round(data["incidents"] / data["tickets"] * 100, 1) if data["tickets"] else 0,
            "serviceNames": data["serviceNames"],
        })

    # ── Unit analysis ──
    unit_stats = defaultdict(lambda: {"services": 0, "tickets": 0, "people": set(), "serviceNames": []})
    for s in service_list:
        u = s["unit"] or "Ohne Unit"
        unit_stats[u]["services"] += 1
        unit_stats[u]["tickets"] += s["tickets"]
        unit_stats[u]["serviceNames"].append(s["name"])
        for a in s["topAssignees"]:
            unit_stats[u]["people"].add(a["name"])

    unit_list_out = []
    for u_name, data in sorted(unit_stats.items(), key=lambda x: -x[1]["tickets"]):
        # Find unit meta from Coda
        unit_meta = next((u for u in units_list if u["name"] == u_name), {})
        unit_list_out.append({
            "name": u_name,
            "kuerzel": unit_meta.get("kuerzel", ""),
            "fte": unit_meta.get("fte", ""),
            "services": data["services"],
            "tickets": data["tickets"],
            "people": len(data["people"]),
            "serviceNames": data["serviceNames"],
        })

    # ── Priority analysis ──
    all_matched_tickets = []
    for tix in matched.values():
        all_matched_tickets.extend(tix)

    priority_stats = Counter(t.get("priority") or "None" for t in all_matched_tickets)
    blocker_tickets = [t for t in all_matched_tickets if t.get("priority") == "Blocker"]
    blocker_by_service = Counter()
    for t in blocker_tickets:
        svc = match_ticket(t, matchers)
        if svc:
            blocker_by_service[svc] += 1

    # ── Build output ──
    output = {
        "meta": {
            "totalTickets": len(tickets),
            "matchedTickets": total_matched,
            "matchRate": round(total_matched / len(tickets) * 100, 1),
            "totalServices": len(services),
            "servicesWithMatches": sum(1 for s in service_list if s["tickets"] > 0),
            "totalStaff": len(staff_list),
            "activeUnits": sum(1 for u in units_list if u["status"] == "Public"),
            "generated": str(date.today()),
            "sources": {
                "jira": "jira_export_2026-02-25.json",
                "services": "Services Übersicht.csv (2026-01-25)",
                "sales": "Sales Übersicht.csv (2026-01-25)",
                "staff": "Staff.csv (2026-01-25)",
                "units": "Units.csv (2026-01-25)",
            },
        },
        "services": service_list,
        "teamProfiles": team_profiles,
        "yearlyTrend": yearly_out,
        "monthlyTrend": monthly_out,
        "categories": cat_list,
        "units": unit_list_out,
        "unmatched": {
            "count": len(unmatched),
            "byType": dict(unmatched_by_type.most_common()),
            "byProject": dict(unmatched_by_project.most_common()),
            "byStatus": dict(unmatched_by_status.most_common()),
            "byPriority": dict(unmatched_by_priority.most_common()),
            "yearlyTickets": dict(sorted(unmatched_yearly.items())),
            "monthlyTickets": dict(sorted(unmatched_monthly.items())),
            "topAssignees": [{"name": n, "count": c} for n, c in unmatched_assignees.most_common(15)],
            "topWords": [{"word": w, "count": c} for w, c in word_freq.most_common(50)],
        },
        "priorities": {
            "distribution": dict(priority_stats.most_common()),
            "blockerByService": dict(blocker_by_service.most_common()),
            "blockerCount": len(blocker_tickets),
        },
        "staff": staff_list,
    }

    return output

def main():
    print("Loading data sources...")
    tickets = load_jira()
    print(f"  Jira: {len(tickets)} tickets")

    services = load_services()
    print(f"  Services: {len(services)} services")

    sales = load_sales()
    print(f"  Sales: {len(sales)} entries")

    staff_list = load_staff()
    print(f"  Staff: {len(staff_list)} people")

    units_list = load_units()
    print(f"  Units: {len(units_list)} units")

    print("\nAnalyzing...")
    output = analyze(tickets, services, sales, staff_list, units_list)

    out_path = APP / "public" / "data.json"
    with open(out_path, "w") as f:
        json.dump(output, f, ensure_ascii=False, indent=None, separators=(",", ":"))

    size_kb = out_path.stat().st_size / 1024
    print(f"\nOutput: {out_path} ({size_kb:.1f} KB)")
    print(f"  Matched: {output['meta']['matchedTickets']} / {output['meta']['totalTickets']} ({output['meta']['matchRate']}%)")
    print(f"  Services with matches: {output['meta']['servicesWithMatches']}")
    print(f"  Team profiles: {len(output['teamProfiles'])}")
    print(f"  Categories: {len(output['categories'])}")
    print(f"  Units: {len(output['units'])}")
    print(f"  Monthly data points: {len(output['monthlyTrend'])}")
    print(f"  Unmatched top words: {', '.join(w['word'] for w in output['unmatched']['topWords'][:10])}")

if __name__ == "__main__":
    main()
