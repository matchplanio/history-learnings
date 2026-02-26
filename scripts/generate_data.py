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
from datetime import date, datetime

VAULT = Path(__file__).resolve().parents[4]  # Kultur/
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

ALIASES = {
        "Managed Infrastruktur": [r"infrastruktur", r"infra\b",
                                   # VMware / ESX / vCenter alerts
                                   r"esx-\d+", r"vCenter", r"vmware", r"\.vmx\b",
                                   r"alarm\.Host", r"Alarm alarm\.", r"HostConnectionState",
                                   # Hardware / NIC / server alerts
                                   r"The (?:Integrated )?NIC\b", r"2072 (?:Alert|Warning) Event",
                                   r"System Alert from", r"Dell PowerEdge",
                                   # Event warnings
                                   r"Warning \| Event", r"Event occured on",
                                   # UPS / power supply
                                   r"\bUPS\b", r"\bUSV\b", r"battery.*(?:APC|replace|APCRBC)",
                                   r"Power\s*Supply", r"Netzspannung", r"Stromversorgung",
                                   r"power\s*input.*lost", r"redundancy.*lost",
                                   # RAID / disk / drive (broader patterns)
                                   r"\bRAID\b", r"Patrol\s*Read", r"controller\s*slot",
                                   r"(?:Festplatte|disk\s*drive|HDD|SSD).*(?:defekt|fail|replace|tausch)",
                                   r"Disk \d+ in Backplane", r"drive bay",
                                   r"Predictive failure", r"Drive \d+ is removed",
                                   # VM / vSphere
                                   r"\bVM\b.*(?:zurücksetzen|aufsetzen|migrate|restart)",
                                   # Dell Storage / Compellent / CMC
                                   r"Compellent", r"Storage\s*Center\s*Alert",
                                   r"\bCMC-\w+:", r"BARCON\d+SERVER",
                                   # Filesharing / NAS / network drives
                                   r"Netzlaufwerk", r"\bNAS\b(?!.*backup)", r"\bSynology\b",
                                   r"Freigabe.*(?:einrichten|zugriff|fehlt)",
                                   # Server hostname alerts (FQDN prefixed)
                                   r"^[A-Za-z0-9\-]+\.(?:intern|local|levigo)\.",
                                   # Generic hardware
                                   r"[Kk]abel.*(?:defekt|tausch|ersetzen)",
                                   # Battery test (UPS auto-reports)
                                   r"[Bb]attery\s+test\s+(?:active|done|failed|result)",
                                   # IBM DC / datacenter notifications
                                   r"^\[IBM-DC\]", r"IBM-DC.*(?:Wartungsarbeiten|Störung|Change|Reboot)",
                                   # IBM Storwize / V3700 / HMC alerts
                                   r"\d{4}\s+Warning\s+Event\s+Notification\s+\(",
                                   r"xpcluster|V3700|Storwize",
                                   r"IBM[\s\-]i\b|iSeries|AS400",
                                   r"ekzHMC\d+",
                                   r"Transmission of (?:FLRT|Disk Health|Hardware Service)",
                                   # IBM general hardware/storage/maintenance
                                   r"\bIBM\b.*(?:TS4300|Storage|Laufwerk|defekt|hardware|install|server|Einbau)",
                                   r"\bIBM\b.*(?:Access Client|FixCentral|SAN|Wartung)",
                                   # iDRAC / Dell alerts
                                   r"\biDRAC\b", r"\bIDRAC\b", r"\[.*-IDRAC\]",
                                   # NIC port down alerts
                                   r"(?:Embedded|Integrated)\s+NIC.*(?:down|link)",
                                   r"network\s+link\s+is\s+down"],
        "Managed Backup & DR": [r"backup", r"veeam", r"\bDR\b", r"disaster.?recovery",
                                 r"\[Success\]", r"\[Failed\]", r"\[Warning\].*(?:Backup|objects?)",
                                 r"Backup to Tape", r"Backup to Disk", r"Backup VMware",
                                 r"Client Backup", r"Backup_Master", r"NAS.*Laufwerkszustand",
                                 r"Festplattenintegrit", r"Wiederherstellungstest",
                                 r"Rücksicherung",
                                 # Storage alerts
                                 r"\[?[A-Z0-9]+-STO-[A-Z0-9]+\]?", r"RZ[0-9]-STO",
                                 r"Laufwerkszustandsbericht",
                                 # Filesystem / storage alerts
                                 r"\bfilesystem\b", r"disk\s*space", r"storage\s*(?:alert|warning|full|low)",
                                 r"Speicherplatz", r"Platte.*voll", r"volume.*(?:full|low|critical)",
                                 # STO status alerts
                                 r"STO.*(?:status|mail)", r"\bSTO\b.*(?:alert|warning)",
                                 # Storage system alerts
                                 r"storage\s*system", r"\bNAS\b.*(?:alert|defekt|fehler)"],
        "Managed Monitoring": [r"monitoring", r"checkmk.*monitor", r"monitor.*check",
                                r"levigo-Mon:", r"AUTO-GRAYLOG", r"Check_MK:",
                                r"[a-z]-esx-\d+\.intern\.levigo", r"Graylog",
                                # Notification / license alerts
                                r"Notification.*license", r"license.*(?:invalid|issue|expir)",
                                # System alert hostnames (Checkmk/Graylog alerts with hostname prefix)
                                r"\bbaresel\b", r"\bacps\b", r"\bbebion\b",
                                r"\btcon\b", r"\bqulog\b", r"\bhald\b",
                                r"\bpmon\b", r"\bsmon\b",
                                # Alert severity patterns
                                r"\[CRIT\]", r"\[CRITICAL\]", r"\[WARNING\](?!.*[Bb]ackup)",
                                r"\[DOWN\]", r"\[UNREACHABLE\]", r"\[RECOVERY\]",
                                r"\[OK\].*(?:host|service|check)",
                                # Generic monitoring alert patterns
                                r"(?:Host|Service)\s+(?:Alert|Notification)",
                                r"PROBLEM\s+[-–]", r"RECOVERY\s+[-–]",
                                # More alert patterns from unmatched analysis
                                r"\balert\b.*(?:event|notification|warning|critical)",
                                r"\bevent\b.*(?:occured|triggered|warning|error)",
                                # Location-based alerts (RZ sites)
                                r"(?:alert|Alert).*(?:NBG|MUC|FRA|NUE)",
                                # Error Notification (storage system alerts)
                                r"\d{4}\s+Error\s+Notification",
                                # CMC / WWDFV monitoring
                                r"\bCMC\b.*WWDFV", r"WWDFV",
                                # RMM tools (Ninja, Datto)
                                r"\bNinja\b(?!.*Agent)", r"\bDatto\b", r"\bRMM\b"],
        "Managed MS Exchange Server": [r"exchange", r"exchange.?server",
                                        # Outlook / Mail problems → Exchange service
                                        r"\boutlook\b", r"\bpostfach\b", r"e-?mail.*(?:problem|fehler|geht nicht)",
                                        r"outlook.*(?:verbind|sync|hängt|absturz|langsam|fehler|problem|geht nicht)",
                                        r"mail.*(?:empfang|versand|kommt nicht|geht nicht|problem|fehler)",
                                        # Broader mail patterns
                                        r"\bmail\b.*(?:server|relay|queue|delivery|bounce)",
                                        r"\bSMTP\b", r"\bIMAP\b", r"\bPOP3?\b",
                                        r"Mailbox.*(?:full|voll|quota)", r"Postausgang",
                                        # MailStore / mail archiving
                                        r"\bMailStore\b", r"Mail.*Archiv",
                                        r"PST.*(?:import|migr|konvert)",
                                        # Broader mail issues
                                        r"[Ee]-?[Mm]ail.*(?:geht nicht|kein|Problem|Fehler|Störung)",
                                        r"Mails?\s+(?:kommen|werden).*nicht",
                                        # Catch remaining mail/email mentions
                                        r"\b[Ee]-?[Mm]ails?\b", r"\b[Mm]ailkonto\b"],
        "Managed Microsoft 365": [r"microsoft\s*365", r"\bM365\b", r"office\s*365", r"\bO365\b",
                                   r"\bTeams\b.*(?:problem|fehler|geht nicht)",
                                   r"\bSharePoint\b", r"\bOneDrive\b",
                                   # Office apps
                                   r"\bWord\b.*(?:fehler|problem|absturz|öffnet|hängt)",
                                   r"\bExcel\b.*(?:fehler|problem|absturz|öffnet|hängt)",
                                   r"\bOffice\b.*(?:lizenz|aktivier|install|update)"],
        "Managed Cryptshare": [r"[Cc]ryptshare(?:\s+Server)?"],
        "Shared Firewall": [r"shared.*firewall", r"firewall.*shared", r"SFW\b"],
        "Managed Citrix": [r"citrix", r"\bv[Dd]esk(?:top)?\b",
                            r"\bRDS\b", r"\bAVD\b", r"Terminal.?[Ss]erver"],
        "managed Atlassian": [r"atlassian", r"jira.*managed", r"confluence.*managed",
                               r"\bJira\b", r"\bConfluence\b"],
        "Managed Networking (WLAN)": [r"wlan", r"wifi", r"wireless"],
        "Managed Networking (LAN)": [r"\bLAN\b(?!d)", r"Netzwerk(?!e?\.)",
                                    r"\bSwitch\b(?!.*[Mm]odus)",
                                    r"\bVLAN\b", r"\bDHCP\b", r"Patchfeld",
                                    r"(?:Netzwerk|LAN).*(?:dose|anschluss|port|kabel)",
                                    r"(?:IP|Adress).*(?:konflikt|änder|zuweisen)"],
        "Managed Baramundi": [r"baramundi"],
        "levigo cloud.drive": [r"cloud\.?drive", r"clouddrive"],
        "Kaspersky aaS": [r"kaspersky"],
        "Managed Windows Server & AD": [r"windows.?server", r"active.?directory", r"\bAD\b.*managed",
                                         r"WSUS",
                                         # Server updates / patching
                                         r"Updates? für Server", r"Server.*updates?\b",
                                         # Windows 11/10 migration
                                         r"W(?:indows\s*)?1[01]\s*(?:Upgrade|Umstellung|Migration)",
                                         r"\bGPO\b", r"Gruppenrichtlinie",
                                         # File shares / Laufwerk
                                         r"[Ll]aufwerk.*(?:zugriff|verbind|nicht|fehler|map)",
                                         r"[Ff]reigabe.*(?:zugriff|ordner|server|berechtigung)",
                                         r"Netzlaufwerk"],
        "levigo managed.archive": [r"managed\.?archive", r"archiv"],
        "Managed MS SQL Server": [r"sql.?server", r"mssql"],
        "Patchmanagement (Windows)": [r"patch.*windows", r"windows.*patch",
                                       r"Windows.*Update", r"Update.*Windows",
                                       r"WSUS.*(?:update|sync|fehler)", r"Patchday",
                                       r"(?:Sicherheits|Security).*[Uu]pdate",
                                       # Broader update/maintenance patterns
                                       r"[Uu]pdate.*(?:install|einspielen|durchf|server|client)",
                                       r"(?:Firmware|BIOS|Treiber).*[Uu]pdate",
                                       r"Wartungsfenster", r"Reboot.*(?:nach|wegen).*[Uu]pdate",
                                       r"(?:Neustart|Restart).*(?:Update|Patch)",
                                       # Customer software updates
                                       r"[Ww]indata.*[Uu]pdate"],
        "Patchmanagement (Linux)": [r"patch.*linux", r"linux.*patch"],
        "levigo AntiSpam": [r"antispam", r"anti.?spam", r"spam.*filter", r"SPOOF"],
        "Managed Endpointsecurity": [r"endpoint.*security", r"endpoint.*protection",
                                      r"Sophos.*Firewall", r"\*ALERT\*.*Sophos",
                                      r"Ninja.*Agent", r"Ninja Monitoring",
                                      r"\bVirus\b", r"\bMalware\b", r"Trojaner",
                                      r"\bBitdefender\b",
                                      # Microsoft Defender
                                      r"[Mm]icrosoft\s+[Dd]efender",
                                      r"[Dd]efender.*(?:Endpoint|install|konfigur|ausnahme|meldet)",
                                      r"[Vv]ulnerabilit(?:y|ies).*(?:notification|Defender)",
                                      # Clientsecurity events
                                      r"clientsecurity.*event", r"ClientSecurity"],
        "Managed Linux Server": [r"linux.?server",
                                  r"unattended-upgrades result"],
        "Managed Bizzdesign Horizzon": [r"bizzdesign", r"horizzon",
                                        r"[Hh]orizon\s*[Ii]mage"],
        "Managed MDM": [r"\bMDM\b", r"mobile.?device"],
        "levigo Webhosting": [r"webhosting", r"web.?hosting",
                               r"\bNextcloud\b", r"\bhomepage\b", r"\bwebseite\b", r"\bwebsite\b",
                               r"\bWordPress\b", r"\bApache\b", r"\bNginx\b",
                               r"\bPHP\b.*(?:version|update|fehler)",
                               r"[Ww]eb.*(?:server|seite|site).*(?:fehler|down|nicht erreichbar)"],
        "levigo/matrix Mail Server": [r"mail.?server", r"mailserver", r"matrix.*mail"],
        "managed.wireguard": [r"wireguard"],
        "Housing": [r"\bhousing\b", r"colocation", r"coloc",
                     r"2N.*Access Commander", r"\b2N\b.*Access",
                     # RZ operations / datacenter
                     r"[Rr]echenzentrum", r"\bRZ\b.*(?:Begehung|Zutritt|Zugang)",
                     r"[Rr]ack\s*[A-Z]?\s*(?:Door|Tür|Handle)",
                     r"[Cc]age", r"[Bb]randabschnitt",
                     # IBM datacenter operations (eRP, ePA, SekIDP in MUC/NUE/FRA)
                     r"IBM.*(?:eRP|ePA|sIDP|SekIDP|eGK).*(?:MUC|NUE|FRA|NorthC|Colo)",
                     r"(?:eRP|ePA|SekIDP).*(?:PU|RU|TU)\s*[-–]",
                     r"(?:eRP|ePA|SekIDP).*(?:install|server|rack|zone|SAN|NIC|cabling)",
                     r"IBM\s*\|.*(?:eRP|ePA|sIDP|SekIDP)",
                     # Colo / datacenter access
                     r"[Cc]olo\s*\d+", r"Zugang.*(?:Colo|RZ|Rechenzentrum)"],
        "Managed KEMP": [r"\bKEMP\b", r"loadbalancer", r"load.?balancer"],
        "Managed Openshift": [r"openshift"],
        "Service Desk": [r"service.?desk", r"Anfahrt\b", r"Callback\b", r"Regelwartung",
                          # Onboarding / hardware provisioning
                          r"(?:neuer?|neue[sn]?) (?:Mitarbeiter|Notebook|Rechner|Laptop|User|Gerät|PC)",
                          r"Onboarding", r"Offboarding",
                          # Printer / Scanner
                          r"[Dd]rucker", r"[Pp]rinter", r"[Dd]rucken",
                          r"Papierstau", r"Toner", r"\bScanner\b",
                          r"Druckserver",
                          # Generic support / desk requests
                          r"Passwort.*(?:reset|zurück|änder|vergessen)",
                          r"Zugang.*(?:gesperrt|einrichten|freischalt)",
                          r"Benutzer.*(?:anlegen|erstellen|sperren|entsperren)",
                          r"Umzug.*(?:Arbeitsplatz|Büro|Raum)",
                          r"\bHeadset\b", r"\bMonitor\b.*(?:defekt|tausch|neu)",
                          r"\bDocking\b", r"\bBeamer\b",
                          # User management (broader)
                          r"(?:User|Benutzer|Mitarbeiter).*(?:anlegen|erstellen|einrichten|deaktiv)",
                          r"(?:Anlegen|Einrichten).*(?:User|Benutzer|Konto|Account)",
                          r"Windows Zugang", r"Zugriffs(?:recht|paket)",
                          # Access / permission requests
                          r"[Zz]ugriff.*(?:einrichten|fehlt|kein|beantrag|freischalt)",
                          r"[Ww]artung\b", r"[Ii]nstallation\b",
                          # Software installation
                          r"(?:Software|Programm).*(?:install|einricht|bereitstell)",
                          r"\bLexware\b", r"\bAdobe\b", r"\bBartender\b",
                          r"\bEPLAN\b", r"\bOffice\b.*(?:install|lizenz|migration)",
                          # Generic IT support
                          r"(?:funktioniert|geht).*nicht",
                          r"nicht.*(?:erreichbar|verfügbar)",
                          r"Telefon.*(?:problem|defekt|tausch|einrichten)",
                          # Telefonie / 3CX / Voicemail
                          r"\bVoicemail\b", r"\b3CX\b", r"Telefonanlage",
                          r"Telefonabrechnung", r"\bDurchwahl\b", r"\bNebenstelle\b",
                          r"\bSIP\b.*(?:trunk|konto|registr)", r"Rufnummer",
                          # Hardware / Asset management
                          r"Rechner.*(?:einrichten|aufsetzen|umstellen|tausch)",
                          r"(?:Notebook|Laptop).*(?:einrichten|aufsetzen|bestell|tausch)",
                          r"\bAsset\b.*(?:herausgegeben|eingerichtet|bestellt)",
                          # License management
                          r"Lizenz.*(?:problem|fehler|grenze|kündigung|erreich)",
                          # Fahrzeit / field service
                          r"Fahrzeit", r"\bSpringer\b",
                          # Customer-specific generic requests (Packautomaten etc.)
                          r"[Pp]ackautomaten",
                          # Hotline / support calls
                          r"[Ss]upport.*[Hh]otline", r"voip\.levigo",
                          r"[Rr]ückruf\b", r"bittet.*(?:um|RR|Rückruf)",
                          # Scan / Scanner
                          r"[Ss]canner?\b.*(?:geht nicht|fehler|problem|einricht)",
                          # Generic Anliegen
                          r"\bAnliegen\b",
                          # Login / account issues
                          r"[Aa]nmeldung", r"anmelden.*(?:nicht|fehler|problem)",
                          r"[Ll]ogin.*(?:nicht|fehler|problem|geht)",
                          # Setup / provisioning
                          r"[Ee]inricht(?:en|ung)", r"[Kk]onfiguration",
                          # License management
                          r"[Ll]izenz.*(?:anpass|erweit|bestell|aktivier|ablauf|verlänger)",
                          # Migration support
                          r"[Mm]igration", r"[Uu]mstellung",
                          # Training / Ausbildung
                          r"\b[Aa]usbildung\b",
                          # Generic support keywords
                          r"\bUnterstützung\b", r"\bHilfe\b.*(?:bei|mit|zu)",
                          # Forwarded emails (WG = Weitergeleitet)
                          r"^WG:\s",
                          # Aareon ticket forwarding
                          r"<Aareon_Ticket:\d+>",
                          # Broader access/permission requests
                          r"[Zz]ugriff\s+auf",
                          r"[Zz]ugang\s+(?:für|fuer|zu|einrichten|beantragen|erstellen)",
                          r"[Bb]erechtigung.*(?:einrichten|erteilen|entziehen|ändern|prüfen)",
                          r"[Ff]reigabe.*(?:erteilen|prüfen|beantragen)",
                          r"[Ff]reischalt", r"[Ee]ntsperr",
                          # Generic IT problems / nicht-Muster
                          r"(?:kann|lässt)\s+sich\s+nicht",
                          r"geht\s+nicht\s+mehr",
                          r"(?:Probleme?|Problem)\s+(?:mit|bei|beim)",
                          # Umzug (office/workplace moves)
                          r"[Uu]mzug",
                          # Defekt/broken hardware
                          r"\bdefekt\b",
                          # User/Konto requests
                          r"(?:neues?|neuer?)\s+(?:Konto|Account|Zugang|Benutzerkonto)",
                          # Bitte um / request patterns
                          r"[Bb]itte\s+(?:um|den|die|das)\s+(?:Einrichtung|Zugang|Freischaltung|Zugriff)"],
        "TaRZ": [r"\bTaRZ\b"],
        "S3 aaS": [r"\bS3\b.*aaS", r"object.?storage", r"\bS3\b.*(?:bucket|storage)"],
        "Kubernetes aaS on VDC (Addon zu CCP)": [r"kubernetes", r"\bk8s\b"],
        "Stundenkontingent": [r"stundenkontingent", r"kontingent"],
        "Projektmanagement": [r"projektmanagement"],
        "levigo managed.conference": [r"managed\.?conference", r"konferenz"],
        "Externer ISB": [r"externer.*ISB", r"\bISB\b"],
        "1Password operating": [r"1password", r"1Password"],
        "Managed Mattermost": [r"mattermost"],
        "Managed Firewall": [r"managed.*firewall", r"\bFirewall\b",
                              r"\bFortiGate\b", r"\bFortiOS\b", r"\bUTM\b",
                              r"VPN.*(?:tunnel|verbind|connect|down|problem)",
                              # Broader remote access / firewall
                              r"(?:Remote|Fern).*(?:zugriff|zugang|wartung|desktop)",
                              r"(?:Port|Regel).*(?:freischalt|öffnen|firewall)",
                              r"Firewall.*(?:regel|rule|policy|port|freischalt)",
                              r"\bIPsec\b", r"\bSSL.?VPN\b"],
        "Secure Remote Browsing": [r"remote.?browsing"],
        "Checkmk operating": [r"checkmk", r"check_mk"],
        "levigo CCP": [r"\bCCP\b", r"cloud.?computing.?platform",
                        r"\bazure\b", r"\bAWS\b", r"\bcloud\b",
                        r"\bAzure\b.*(?:AD|Entra|Intune|MFA)",
                        r"\bIntune\b", r"\bEntra\b", r"\bMFA\b"],
        "levigo vDC": [r"\bvDC\b", r"virtual.?data.?center"],
        "managed.backup (VCC)": [r"backup.*VCC", r"VCC.*backup"],
        "managed.backup für M365": [r"backup.*M365", r"M365.*backup", r"backup.*microsoft.*365"],
        "Cyber Risiko Check (nach DIN Spec 27076)": [r"cyber.*risiko", r"DIN.*27076"],
        "vCIO": [r"\bvCIO\b"],
    "levigo Internet-Services": [r"VPN\b", r"Internet.*Service",
                                  r"\bDomain\b.*(?:registrier|umzug|DNS|verlänger|kündigen|tausch|reserv|zugriff)",
                                  r"[Ss]ub.?[Dd]omain", r"[Dd]omain\b.*(?:für|fuer|einricht)",
                                  r"\bDNS\b.*(?:eintrag|änder|zone)",
                                  # SSL / Zertifikate
                                  r"\bSSL\b", r"\bTLS\b", r"[Zz]ertifikat",
                                  r"Let.?s.?Encrypt", r"\bcert\b",
                                  # ISP / carrier
                                  r"\b[Ee]unetworks\b", r"[Ww]artungsarbeiten.*(?:eunetworks|carrier)",
                                  # Broader internet/DNS
                                  r"DNS.*(?:problem|fehler|nicht auflös)",
                                  r"Internet.*(?:langsam|down|ausfall|störung|geht nicht)",
                                  r"Leitung.*(?:störung|ausfall|down)",
                                  # ISP/Carrier maintenance (RETN, DECIX etc.)
                                  r"\bRETN\b",
                                  r"Wartungsarbeiten.*(?:RETN|DECIX|Colt|NorthC|Core-Backbone)"],
}

def build_matchers(services):
    """Build regex matchers for service names with aliases.

    Returns (summary_matchers, description_matchers) — two separate lists.
    Most patterns only match against summary. Description matching is limited
    to high-specificity patterns that won't cause false positives from
    Backup report footers, email signatures, etc.
    """
    summary_matchers = []
    desc_matchers = []
    for name in services:
        # Primary: exact service name (summary only)
        escaped = re.escape(name)
        summary_matchers.append((name, re.compile(escaped, re.IGNORECASE)))
        # Secondary: aliases (summary only by default)
        for alias in ALIASES.get(name, []):
            summary_matchers.append((name, re.compile(alias, re.IGNORECASE)))

    # Description-safe patterns: only highly specific terms that won't
    # appear in backup footers, email signatures, or ticket boilerplate
    DESC_SAFE_ALIASES = {
        "Managed Backup & DR": [r"backup", r"veeam", r"disaster.?recovery",
                                 r"Wiederherstellungstest", r"Rücksicherung",
                                 r"\[Success\]", r"\[Failed\]"],
        "Managed Monitoring": [r"Check_MK:", r"levigo-Mon:", r"AUTO-GRAYLOG",
                                r"Graylog", r"\[CRIT\]", r"\[DOWN\]"],
        "Managed Infrastruktur": [r"vCenter", r"vmware", r"Dell PowerEdge",
                                   r"\bESXi?\b", r"Patrol\s*Read"],
        "Managed Firewall": [r"\bFirewall\b", r"\bFortiGate\b", r"\bFortiOS\b"],
        "Managed Endpointsecurity": [r"Sophos.*(?:Endpoint|Firewall|UTM)",
                                      r"\bMalware\b", r"\bVirus\b", r"\bTrojaner\b"],
        "Managed Citrix": [r"citrix", r"Terminal.?[Ss]erver"],
        "Managed MS Exchange Server": [r"\bexchange\b", r"\boutlook\b",
                                        r"\bpostfach\b", r"MailStore"],
        "Managed Windows Server & AD": [r"[Aa]ctive.?[Dd]irectory", r"\bGPO\b",
                                          r"[Gg]ruppenrichtlinie", r"\bWSUS\b"],
        "Service Desk": [r"[Zz]ugriff\s+auf", r"[Zz]ugang\s+(?:für|zu|einrichten)",
                          r"\bdefekt\b", r"(?:kann|lässt)\s+sich\s+nicht",
                          r"[Dd]rucker", r"[Pp]rinter"],
    }
    for name, patterns in DESC_SAFE_ALIASES.items():
        for pat in patterns:
            desc_matchers.append((name, re.compile(pat, re.IGNORECASE)))

    # Sort by pattern length descending (longer/more specific patterns first)
    summary_matchers.sort(key=lambda x: -len(x[1].pattern))
    desc_matchers.sort(key=lambda x: -len(x[1].pattern))
    return summary_matchers, desc_matchers

def decode_mime_subject(s):
    """Decode MIME-encoded subjects like =?utf-8?Q?...?= or =?utf-8?B?...?="""
    if '=?' not in s:
        return s
    try:
        import email.header
        decoded_parts = email.header.decode_header(s)
        result = []
        for part, charset in decoded_parts:
            if isinstance(part, bytes):
                result.append(part.decode(charset or 'utf-8', errors='replace'))
            else:
                result.append(part)
        return ' '.join(result)
    except Exception:
        return s

_CUSTOMER_PREFIX_RE = re.compile(r'^[A-Za-zÄÖÜäöüß][A-Za-z0-9äöüÄÖÜß\-_\.]+?:\s')
_SYSTEM_SUMMARY_PREFIXES = {"levigo-Mon", "Check_MK", "AUTO-GRAYLOG",
                             "baresel", "acps", "bebion", "tcon", "qulog", "hald",
                             "pmon", "smon", "Fwd", "Re", "AW", "WG",
                             "IBM", "http", "https"}
_ESX_PREFIX_RE = re.compile(r'^[a-z]-esx-\d+')

def match_ticket(ticket, matchers):
    """Match a ticket to a service using two-pass strategy.

    Pass 1: Match against summary only (all patterns).
    Pass 2: Match against description with safe-listed patterns only.
    This prevents false positives from backup report footers, email
    signatures, and ticket boilerplate that contain service keywords.
    """
    summary_matchers, desc_matchers = matchers
    summary = ticket.get("summary", "")
    # Decode MIME-encoded subjects
    if '=?' in summary:
        summary = decode_mime_subject(summary)

    # Pass 1: summary matching (all patterns)
    for name, pattern in summary_matchers:
        if pattern.search(summary):
            return name

    # Pass 2: description matching (safe patterns only)
    desc = ticket.get("description", "") or ""
    if desc:
        for name, pattern in desc_matchers:
            if pattern.search(desc):
                return name

    # Fallback 1: IEO project → Housing (RZ operations)
    if ticket.get("project") == "IEO":
        return "Housing"

    # Fallback 2: customer-prefixed tickets ("Customer: problem") → Service Desk
    m = _CUSTOMER_PREFIX_RE.match(summary)
    if m:
        prefix = m.group(0).rstrip(': ')
        if (prefix not in _SYSTEM_SUMMARY_PREFIXES
            and not _ESX_PREFIX_RE.match(prefix)
            and len(prefix) <= 25):
            return "Service Desk"

    return None

# ── Customer Extraction ──

# Internal system prefixes (not real customers)
SYSTEM_PREFIXES = {"levigo-Mon", "Check_MK", "AUTO-GRAYLOG",
                    "baresel", "acps", "bebion", "tcon", "qulog", "hald",
                    "pmon", "smon", "Fwd", "Re", "AW", "WG",
                    "http", "https"}
ESX_RE = re.compile(r'^[a-z]-esx-\d+')

def extract_customer(ticket):
    """Extract customer name from ticket summary prefix pattern 'Customer: ...'"""
    summary = ticket.get("summary", "")
    m = re.match(r'^([A-Za-zÄÖÜäöüß][A-Za-z0-9äöüÄÖÜß\-_\.]+?):\s', summary)
    if m:
        prefix = m.group(1)
        if prefix in SYSTEM_PREFIXES or ESX_RE.match(prefix):
            return None
        # Skip very long prefixes (likely not customer names)
        if len(prefix) > 25:
            return None
        return prefix
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

    # ── Customer analysis ──
    customer_tickets = defaultdict(list)
    for t in tickets:
        cust = extract_customer(t)
        if cust:
            customer_tickets[cust].append(t)

    # Build customer profiles (top 50 by ticket count)
    customer_list = []
    for cust_name, tix in sorted(customer_tickets.items(), key=lambda x: -len(x[1])):
        if len(tix) < 3:  # skip customers with < 3 tickets
            continue
        yearly = Counter()
        monthly = Counter()
        by_type = Counter()
        by_status = Counter()
        services_matched = Counter()
        incidents = 0
        for t in tix:
            year = t.get("created", "")[:4]
            month = t.get("created", "")[:7]
            if year: yearly[year] += 1
            if month: monthly[month] += 1
            by_type[t.get("type", "Unknown")] += 1
            by_status[t.get("status", "Unknown")] += 1
            if t.get("type") == "Incident":
                incidents += 1
            svc = match_ticket(t, matchers)
            if svc:
                services_matched[svc] += 1

        # Assignees for this customer
        assignees = Counter(t.get("assignee") for t in tix if t.get("assignee"))

        # Active period
        years = sorted(yearly.keys())
        active_since = years[0] if years else ""
        last_active = years[-1] if years else ""

        customer_list.append({
            "name": cust_name,
            "tickets": len(tix),
            "incidents": incidents,
            "incidentRate": round(incidents / len(tix) * 100, 1) if tix else 0,
            "services": [{"name": n, "count": c} for n, c in services_matched.most_common(10)],
            "servicesCount": len(services_matched),
            "matchedTickets": sum(services_matched.values()),
            "matchRate": round(sum(services_matched.values()) / len(tix) * 100, 1) if tix else 0,
            "topAssignees": [{"name": n, "count": c} for n, c in assignees.most_common(5)],
            "yearlyTickets": dict(sorted(yearly.items())),
            "monthlyTickets": dict(sorted(monthly.items())),
            "byType": dict(by_type.most_common()),
            "byStatus": dict(by_status.most_common()),
            "activeSince": active_since,
            "lastActive": last_active,
        })

    # Only keep top 80 customers for data size
    customer_list = customer_list[:80]

    customer_meta = {
        "totalCustomers": len(customer_tickets),
        "customersWithTickets": len([c for c in customer_list if c["tickets"] >= 3]),
        "totalCustomerTickets": sum(len(v) for v in customer_tickets.values()),
    }

    # ── Project analysis (SXPP) ──
    sxpp_issues = [t for t in tickets if t.get("project") == "SXPP"]
    projekt_tickets = [t for t in sxpp_issues if t.get("type") == "Projekt"]
    subtask_tickets = [t for t in sxpp_issues if t.get("type") == "Sub-Task"]
    anfahrt_tickets = [t for t in sxpp_issues if t.get("type") == "Anfahrt"]

    # Extract customer from project summary
    def extract_project_customer(summary):
        m = re.match(r'^([A-Za-zÄÖÜäöüß][A-Za-z0-9äöüÄÖÜß\-_\. ]+?):\s', summary)
        return m.group(1) if m else None

    # Project categorization rules (order matters - first match wins)
    project_categories = [
        ("MS365 / Cloud", ["ms365", "microsoft 365", "exchange online", "exchange migration",
                           "azure", "onedrive", "sharepoint", "m365"]),
        ("Firewall / Security", ["firewall", "fortinet", "fortigate", "sophos", "xgs",
                                  "security", "defender", "cryptshare", "bitwarden"]),
        ("Infrastruktur", ["hardware", "server", "infrastruktur", "hypervisor", "vmware",
                           "esxi", "esx", "hyper-v", "hyperv", "ibm i", "power", "switches",
                           "neue switches"]),
        ("Linux-Consulting", ["linux-consulting"]),
        ("Migration / vDC", ["vdc", "migration", "migrieren", "umzug", "umstellung"]),
        ("Backup / Storage", ["backup", "veeam", "storage", "san", "archiv"]),
        ("Netzwerk / WLAN", ["switch", "wlan", "ubiquiti", "netzwerk", "lte router"]),
        ("Managed Services", ["msp", "managed", "onboarding", "rollout", "patchmanagement"]),
        ("Hosting / RZ", ["hosting", "colocation", "housing", "rechenzentrum", "rz"]),
        ("Citrix / VDI", ["citrix", "vdi", "avd", "rds"]),
    ]

    # Manual overrides for projects that don't match keyword patterns
    category_overrides = {
        "SXPP-1317": "Infrastruktur",       # EY: Implementierung Lab Umgebung
        "SXPP-999":  "Hosting / RZ",         # TNBW: OpenCompute Nürnberg
        "SXPP-973":  "Hosting / RZ",         # IBM | sIDP: FRA3 - Neuer Brandabschnitt
        "SXPP-872":  "Sonstiges",            # SGS Anwendung
        "SXPP-816":  "Hosting / RZ",         # TNBW - Secured Jira
        "SXPP-805":  "Managed Services",     # ISP: Upgrade der ARIA Version
        "SXPP-783":  "Sonstiges",            # Sonderentwicklung: Materialverwaltung
        "SXPP-686":  "Migration / vDC",      # DAFTRUCKS: Migrate EMES System
        "SXPP-625":  "Sonstiges",            # Informationssicherheits-Risikomanagement
        "SXPP-482":  "Sonstiges",            # DAT: Abbildung RM in JIRA
        "SXPP-475":  "Hosting / RZ",         # TNBW: Atlassian Customizing
        "SXPP-389":  "Managed Services",     # Ensinger: Mehrwertdienste
        "SXPP-349":  "MS365 / Cloud",        # Autarq: Implementierung M365
        "SXPP-434":  "Infrastruktur",        # Eichler: Einrichtung Rechner
        "SXPP-347":  "Sonstiges",            # GADV: Analyse und Dokumentation
        "SXPP-209":  "Sonstiges",            # MBG: Tech DD und Beratung
        "SXPP-268":  "Managed Services",     # Ensinger: Mehrwertdienste
        "SXPP-3":    "Infrastruktur",        # Testumgebung für BMW
    }

    def categorize_project(key, summary):
        if key in category_overrides:
            return category_overrides[key]
        s = summary.lower()
        for cat_name, keywords in project_categories:
            if any(kw in s for kw in keywords):
                return cat_name
        return "Sonstiges"

    # Build project list
    project_list = []
    for p in sorted(projekt_tickets, key=lambda x: x.get("created", ""), reverse=True):
        pk = int(p["key"].split("-")[1])
        # Count sub-tasks by proximity (sub-tasks created after project, keys > project key)
        sub_count = sum(1 for st in subtask_tickets
                       if pk < int(st["key"].split("-")[1]) <= pk + 50
                       and st.get("created", "") >= p.get("created", ""))
        customer = extract_project_customer(p.get("summary", ""))
        category = categorize_project(p["key"], p.get("summary", ""))

        project_list.append({
            "key": p["key"],
            "summary": p.get("summary", ""),
            "customer": customer,
            "category": category,
            "status": p.get("status", ""),
            "assignee": p.get("assignee") or "Nicht zugewiesen",
            "created": (p.get("created") or "")[:10],
            "updated": (p.get("updated") or "")[:10],
            "priority": p.get("priority") or "None",
            "subTasks": sub_count,
        })

    # Project stats
    proj_by_status = Counter(p["status"] for p in project_list)
    proj_by_year = Counter((p.get("created") or "")[:4] for p in project_list if p.get("created"))
    proj_by_assignee = Counter(p["assignee"] for p in project_list)
    proj_customers = Counter(p["customer"] for p in project_list if p["customer"])
    proj_by_category = Counter(p["category"] for p in project_list)

    # Category × Year matrix for stacked chart
    cat_by_year = defaultdict(lambda: Counter())
    for p in project_list:
        year = (p.get("created") or "")[:4]
        if year:
            cat_by_year[year][p["category"]] += 1

    # Sub-task stats
    st_by_status = Counter(st.get("status", "?") for st in subtask_tickets)
    st_by_assignee = Counter(st.get("assignee") or "Nicht zugewiesen" for st in subtask_tickets)

    project_data = {
        "projects": project_list,
        "totalProjects": len(projekt_tickets),
        "totalSubTasks": len(subtask_tickets),
        "totalAnfahrten": len(anfahrt_tickets),
        "byStatus": dict(proj_by_status.most_common()),
        "byYear": dict(sorted(proj_by_year.items())),
        "byAssignee": [{"name": n, "count": c} for n, c in proj_by_assignee.most_common(15)],
        "byCategory": dict(proj_by_category.most_common()),
        "categoryByYear": {y: dict(cats) for y, cats in sorted(cat_by_year.items())},
        "customers": [{"name": n, "count": c} for n, c in proj_customers.most_common(30)],
        "subTasksByStatus": dict(st_by_status.most_common()),
        "subTasksByAssignee": [{"name": n, "count": c} for n, c in st_by_assignee.most_common(15)],
    }

    # ── Revenue data (from PBI Kostengruppe) ──
    # Hardcoded from PBI query - Kostengruppe revenue by Artikelgruppe
    revenue_data = [
        {"artikelgruppe": "managed.cloud", "kostengruppe": "managed.server", "umsatz": 4712377, "db": 4712377, "positionen": 11886},
        {"artikelgruppe": "Internet", "kostengruppe": "RZ-Dienstleistungen", "umsatz": 4848268, "db": 1613782, "positionen": 503},
        {"artikelgruppe": "managed.cloud", "kostengruppe": "virtual Datacenter", "umsatz": 2096722, "db": 2096722, "positionen": 6431},
        {"artikelgruppe": "Internet", "kostengruppe": "Connectivity", "umsatz": 2173793, "db": 373854, "positionen": 1312},
        {"artikelgruppe": "Internet", "kostengruppe": "WebHosting", "umsatz": 1603053, "db": 1576853, "positionen": 7807},
        {"artikelgruppe": "managed.cloud", "kostengruppe": "MSP Verträge", "umsatz": 1488933, "db": 1487705, "positionen": 2320},
        {"artikelgruppe": "Internet", "kostengruppe": "SPLA", "umsatz": 1444820, "db": 494255, "positionen": 1503},
        {"artikelgruppe": "Internet", "kostengruppe": "CSP (MS365-Abos)", "umsatz": 1358417, "db": 232236, "positionen": 6200},
        {"artikelgruppe": "Internet", "kostengruppe": "11-Infrastruktur", "umsatz": 1281114, "db": 1277215, "positionen": 1062},
        {"artikelgruppe": "Internet", "kostengruppe": "WebHousing", "umsatz": 993520, "db": 990060, "positionen": 2846},
        {"artikelgruppe": "managed.cloud", "kostengruppe": "managed.firewall", "umsatz": 752184, "db": 752184, "positionen": 1077},
        {"artikelgruppe": "Internet", "kostengruppe": "Domain", "umsatz": 668751, "db": 441126, "positionen": 7043},
        {"artikelgruppe": "Internet", "kostengruppe": "ISH - Dienstleistung", "umsatz": 543295, "db": 543295, "positionen": 127},
        {"artikelgruppe": "managed.cloud", "kostengruppe": "managed.clientsec", "umsatz": 532761, "db": 529640, "positionen": 1625},
        {"artikelgruppe": "Internet", "kostengruppe": "managed.cloud", "umsatz": 480112, "db": 479362, "positionen": 2103},
        {"artikelgruppe": "managed.cloud", "kostengruppe": "managed.backup", "umsatz": 439610, "db": 439610, "positionen": 2826},
        {"artikelgruppe": "Internet", "kostengruppe": "ISH - RZ Leistungen", "umsatz": 379816, "db": 256488, "positionen": 174},
        {"artikelgruppe": "managed.cloud", "kostengruppe": "managed.antispam", "umsatz": 377903, "db": 376020, "positionen": 3118},
        {"artikelgruppe": "managed.cloud", "kostengruppe": "managed.exchange", "umsatz": 345488, "db": 345463, "positionen": 1683},
        {"artikelgruppe": "managed.cloud", "kostengruppe": "managed.archive", "umsatz": 288894, "db": 288894, "positionen": 371},
        {"artikelgruppe": "managed.cloud", "kostengruppe": "managed.monitoring", "umsatz": 249315, "db": 249315, "positionen": 851},
        {"artikelgruppe": "Internet", "kostengruppe": "Transfervolumen", "umsatz": 221369, "db": 209138, "positionen": 882},
        {"artikelgruppe": "managed.cloud", "kostengruppe": "managed.Backup4MS365", "umsatz": 174488, "db": 174255, "positionen": 1002},
        {"artikelgruppe": "managed.cloud", "kostengruppe": "managed.wifi", "umsatz": 68765, "db": 68765, "positionen": 807},
        {"artikelgruppe": "managed.cloud", "kostengruppe": "TaRZ", "umsatz": 146275, "db": 146275, "positionen": 428},
        {"artikelgruppe": "managed.cloud", "kostengruppe": "cloud.drive", "umsatz": 133747, "db": 133747, "positionen": 1850},
        {"artikelgruppe": "Internet", "kostengruppe": "SSL-Zertifikat", "umsatz": 106759, "db": 65141, "positionen": 499},
        {"artikelgruppe": "Internet", "kostengruppe": "Faxen", "umsatz": 74689, "db": 74689, "positionen": 589},
        {"artikelgruppe": "Internet", "kostengruppe": "WebHosting (Plesk)", "umsatz": 52546, "db": 52546, "positionen": 649},
        {"artikelgruppe": "Internet", "kostengruppe": "12-HE/Monat", "umsatz": 259135, "db": 259135, "positionen": 172},
    ]

    # ── Hersteller data (from PBI Kosten table, ID → Klartext mapping) ──
    hersteller_map = {
        805: ("levigo (intern)", 9067, "Sammelartikel, Domains, DL"),
        100: ("IBM", 3361, "Server, Speicher, BladeCenter"),
        743: ("Lenovo", 2061, "ThinkPad, ThinkCentre"),
        810: ("Dell", 1895, "OptiPlex, PowerEdge, Kabel"),
        132: ("Microsoft", 1687, "Office, Windows, Lizenzen"),
        102: ("HP / HPE", 1515, "Server, Netzwerk, Drucker"),
        113: ("levigo systems", 1031, "InterNet-Services, Hosting"),
        178: ("Symantec / Norton", 862, "Norton AV, Windows OEM"),
        897: ("Sophos", 700, "UTM, Endpoint Security, XGS"),
        105: ("Kingston", 554, "Speicher, CompactFlash"),
        1013: ("pulsatrix", 495, "Ladecontroller, SECC, E-Mob"),
        122: ("Intel", 478, "CPU Pentium, Celeron, Xeon"),
        133: ("Apple", 435, "iPad, MacBook, iPhone"),
        164: ("OKI / Lexmark", 433, "Bildtrommel, Toner, Drucker"),
        283: ("VMware", 384, "vSphere, GSX, ESXi"),
        101: ("Adaptec", 383, "RAID Controller, SCSI"),
        647: ("KVM / diverse", 334, "KVM Switch, Zubehör"),
        147: ("Seagate", 333, "Festplatten, NAS HDD"),
        233: ("Samsung", 317, "Monitore, SSDs"),
        175: ("Logitech", 298, "Maus, Tastatur, Webcam"),
        140: ("Medien / Reinigung", 293, "Bänder, Akkus, Reinigung"),
        103: ("iiyama", 280, "Monitore, Displays, Infoscreen"),
        107: ("ASUS", 254, "Mainboard, Grafikkarte"),
        889: ("Veeam", 252, "Backup & Replication"),
        141: ("Digitus", 258, "Adapter, DisplayPort, USB"),
        254: ("Cisco", 167, "Router, Switch, SFP"),
        146: ("YeongYang", 226, "Barebone, Wechselrahmen"),
        218: ("Netgear", 149, "Switch, Firewall, VPN"),
        443: ("TrendMicro", 194, "ScanMail, Security"),
        438: ("Citrix", 198, "MetaFrame, XenApp, VDI"),
        131: ("Check Point", 191, "Firewall-1, VPN-1"),
        112: ("APC", 190, "USV, PDU, Stromversorgung"),
        185: ("Veritas", 181, "Backup Exec"),
        181: ("Rittal", 168, "Netzwerkschrank, 19-Zoll"),
        170: ("Epson", 161, "Drucker, Tinte, WorkForce"),
        167: ("Adobe", 155, "Acrobat, Creative Cloud"),
        919: ("Ubiquiti", 151, "AccessPoint, UniFi, WLAN"),
        859: ("Kaspersky", 139, "Endpoint Security, AV"),
        200: ("Brother", 133, "Drucker, P-Touch, Scanner"),
        134: ("BenQ", 125, "Monitor, Beamer"),
        156: ("D-Link", 122, "Switch, HUB, Netzwerk"),
        125: ("Gigabyte", 122, "Mainboard"),
        108: ("ATI / AMD", 121, "Grafikkarte, Radeon"),
        757: ("Fortinet", 117, "FortiGate, Firewall, UTM"),
        884: ("Synology", 115, "NAS, DiskStation"),
        881: ("baramundi", 107, "Client Management, Deploy"),
        883: ("Cryptshare", 104, "Secure File Transfer"),
        1001: ("Juniper", 96, "SRX, Switch, SFP"),
        336: ("Kyocera", 94, "Drucker, Farblaser"),
        201: ("Cherry", 81, "Tastatur, Maus"),
        862: ("Atlassian", 81, "Jira, Confluence, Cloud"),
        188: ("Acer", 81, "Monitor, Notebook"),
        406: ("Western Digital", 136, "Festplatte, SSD, NAS"),
        778: ("IGEL", 82, "ThinClient"),
        798: ("openthinclient", 82, "ThinClient"),
        894: ("Exclaimer", 77, "E-Mail Signatur"),
        1022: ("ABB", 162, "Elektroinstallation"),
        1059: ("K2 Systems", 109, "PV-Montage, Solar"),
        1083: ("novotegra", 76, "PV-Montage, Solar"),
        169: ("Toshiba", 85, "Notebook, HDD"),
        165: ("Hitachi", 85, "Festplatte"),
        184: ("Maxtor", 76, "Festplatte"),
    }

    hersteller_list = []
    for hid, (name, count, desc) in sorted(hersteller_map.items(), key=lambda x: -x[1][1]):
        hersteller_list.append({
            "id": hid,
            "name": name,
            "artikelCount": count,
            "description": desc,
        })

    # Categorize manufacturers
    hersteller_categories = {
        "Hardware": ["IBM", "Lenovo", "Dell", "HP / HPE", "Apple", "Intel", "ASUS", "Samsung",
                     "Gigabyte", "ATI / AMD", "Acer", "BenQ", "Cherry", "iiyama", "Toshiba"],
        "Storage": ["Seagate", "Western Digital", "Kingston", "Hitachi", "Maxtor", "Synology"],
        "Security": ["Sophos", "Kaspersky", "Fortinet", "Check Point", "TrendMicro", "Cryptshare"],
        "Software": ["Microsoft", "VMware", "Citrix", "Adobe", "Veritas", "Veeam",
                      "Atlassian", "baramundi", "Exclaimer", "Symantec / Norton"],
        "Netzwerk": ["Cisco", "D-Link", "Netgear", "Ubiquiti", "Juniper"],
        "Drucker": ["OKI / Lexmark", "Epson", "Brother", "Kyocera"],
        "ThinClient": ["IGEL", "openthinclient"],
        "Infrastruktur": ["APC", "Rittal", "Adaptec", "ABB", "K2 Systems", "novotegra"],
        "Intern": ["levigo (intern)", "levigo systems", "pulsatrix"],
    }

    # Add category to each
    name_to_cat = {}
    for cat, names in hersteller_categories.items():
        for n in names:
            name_to_cat[n] = cat
    for h in hersteller_list:
        h["category"] = name_to_cat.get(h["name"], "Sonstige")

    # Category summary
    cat_summary = defaultdict(lambda: {"count": 0, "artikel": 0})
    for h in hersteller_list:
        cat_summary[h["category"]]["count"] += 1
        cat_summary[h["category"]]["artikel"] += h["artikelCount"]
    hersteller_cat_list = [{"name": c, "hersteller": d["count"], "artikel": d["artikel"]}
                           for c, d in sorted(cat_summary.items(), key=lambda x: -x[1]["artikel"])]

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

    # ── Methodology data ──
    # Collect signal documentation for transparency view
    service_matchers_doc = []
    for name in sorted(services.keys()):
        aliases = ALIASES.get(name, [])
        tix_count = len(matched.get(name, []))
        service_matchers_doc.append({
            "service": name,
            "tickets": tix_count,
            "patterns": len(aliases) + 1,  # +1 for exact name match
            "aliases": aliases[:5],  # top 5 for display
            "signal": "exact_name + regex_aliases",
        })
    service_matchers_doc.sort(key=lambda x: -x["tickets"])

    # Project category rules doc
    proj_cat_doc = []
    for cat_name, keywords in project_categories:
        count = proj_by_category.get(cat_name, 0)
        proj_cat_doc.append({
            "category": cat_name,
            "count": count,
            "keywords": keywords[:8],
            "signal": "keyword_in_summary",
        })
    proj_cat_doc.append({
        "category": "Sonstiges",
        "count": proj_by_category.get("Sonstiges", 0),
        "keywords": [],
        "signal": "manual_override + fallback",
    })

    # Customer extraction doc
    cust_extracted = sum(1 for p in project_list if p["customer"])
    cust_total = len(project_list)

    # Hersteller category doc
    herst_cat_doc = [{"category": cat, "members": names[:5], "count": len(names)}
                     for cat, names in hersteller_categories.items()]

    methodology = {
        "pipelines": [
            {
                "id": "service_matching",
                "name": "Service ↔ Ticket Matching",
                "description": "Jira-Tickets werden via Regex-Pattern dem Coda-Servicekatalog zugeordnet",
                "inputSources": ["Jira Export (53.737 Tickets)", "Coda Servicekatalog (64 Services)"],
                "signal": "Summary + Description → Regex Match (längster Pattern zuerst)",
                "steps": [
                    "1. Service-Name als exakter Regex-Match",
                    "2. Service-Aliases (Regex-Pattern pro Service)",
                    "3. Sortierung: längster Pattern gewinnt (spezifischste Zuordnung)",
                    "4. Erster Match gewinnt (kein Multi-Match)",
                ],
                "stats": {
                    "matched": total_matched,
                    "total": len(tickets),
                    "rate": round(total_matched / len(tickets) * 100, 1),
                    "servicesWithMatches": sum(1 for s in service_list if s["tickets"] > 0),
                    "totalPatterns": sum(len(ALIASES.get(n, [])) + 1 for n in services),
                },
            },
            {
                "id": "project_categorization",
                "name": "Projekt-Kategorisierung",
                "description": "SXPP-Projekte werden anhand von Keywords in der Summary kategorisiert",
                "inputSources": ["SXPP Jira-Projekt (137 Projekte)"],
                "signal": "Summary.lower() → Keyword-Match (First-Match-Wins)",
                "steps": [
                    "1. Manuelle Overrides (17 Projekte mit eindeutiger Zuordnung)",
                    "2. Keyword-Listen pro Kategorie (geordnet nach Spezifität)",
                    "3. Erster Kategorie-Match gewinnt",
                    "4. Fallback: 'Sonstiges'",
                ],
                "stats": {
                    "categorized": sum(1 for p in project_list if p["category"] != "Sonstiges"),
                    "total": len(project_list),
                    "rate": round(sum(1 for p in project_list if p["category"] != "Sonstiges") / len(project_list) * 100, 1),
                    "categories": len(proj_by_category),
                    "manualOverrides": len(category_overrides),
                },
            },
            {
                "id": "customer_extraction",
                "name": "Kunden-Extraktion",
                "description": "Kundennamen werden aus dem Ticket-Summary-Prefix extrahiert",
                "inputSources": ["Jira Ticket Summaries"],
                "signal": "Regex: ^([Name]):  → Kundenname (exkl. System-Prefixe)",
                "steps": [
                    "1. Regex-Match auf 'Kundenname: Beschreibung'",
                    "2. System-Prefixe ausfiltern (levigo-Mon, Check_MK, AUTO-GRAYLOG)",
                    "3. ESX-Host-Pattern ausfiltern (a-esx-01)",
                    "4. Prefixe > 25 Zeichen ignorieren",
                ],
                "stats": {
                    "extracted": cust_extracted,
                    "total": cust_total,
                    "rate": round(cust_extracted / cust_total * 100, 1) if cust_total else 0,
                    "uniqueCustomers": len(set(p["customer"] for p in project_list if p["customer"])),
                    "totalFromTickets": len(customer_tickets),
                },
            },
            {
                "id": "hersteller_mapping",
                "name": "Hersteller-Zuordnung",
                "description": "ERP Hersteller-IDs werden zu Klartextnamen und Kategorien aufgelöst",
                "inputSources": ["PBI ERP Legacy (Kosten-Tabelle)", "Kosten[Bezeichnung] Artikelbeschreibungen"],
                "signal": "Hersteller-ID → Artikelbeschreibung → manuelles Mapping",
                "steps": [
                    "1. DAX-Query: Kosten[Hersteller] + Kosten[Bezeichnung] gruppiert",
                    "2. Artikelbeschreibungen identifizieren Hersteller (z.B. 'Lenovo ThinkPad')",
                    "3. Manuelles ID → Name Mapping (62 Einträge)",
                    "4. Kategorisierung in 9+1 Gruppen (Hardware, Software, Security...)",
                ],
                "stats": {
                    "manufacturers": len(hersteller_map),
                    "articles": sum(h[1] for h in hersteller_map.values()),
                    "categories": len(hersteller_categories),
                },
            },
            {
                "id": "revenue_mapping",
                "name": "Revenue-Zuordnung",
                "description": "ERP-Umsatzdaten nach Artikelgruppe/Kostengruppe aus PBI",
                "inputSources": ["PBI eLSA Vollständig (V3 Deckungsbeitrag Views)"],
                "signal": "DAX-Query → Artikelgruppe × Kostengruppe mit Umsatz + DB",
                "steps": [
                    "1. DAX-Query gegen V3 Deckungsbeitrag-Views",
                    "2. Gruppierung nach Artikelgruppe (Internet, managed.cloud)",
                    "3. Summe Umsatz, DB, Positionen pro Kostengruppe",
                    "4. Statischer Snapshot (Stand: 2026-02-25)",
                ],
                "stats": {
                    "revenueGroups": len(revenue_data),
                    "totalRevenue": sum(r["umsatz"] for r in revenue_data),
                    "totalDB": sum(r["db"] for r in revenue_data),
                },
            },
        ],
        "serviceMatchers": service_matchers_doc[:30],  # Top 30 for display
        "projectCategories": proj_cat_doc,
        "herstellerCategories": herst_cat_doc,
        "dataSources": [
            {"name": "Jira Export", "file": "jira_export_2026-02-25.json", "records": len(tickets), "type": "JSON", "date": "2026-02-25"},
            {"name": "Coda Services", "file": "Services Übersicht.csv", "records": len(services), "type": "CSV", "date": "2026-01-25"},
            {"name": "Coda Sales", "file": "Sales Übersicht.csv", "records": len(sales), "type": "CSV", "date": "2026-01-25"},
            {"name": "Coda Staff", "file": "Staff.csv", "records": len(staff_list), "type": "CSV", "date": "2026-01-25"},
            {"name": "Coda Units", "file": "Units.csv", "records": len(units_list), "type": "CSV", "date": "2026-01-25"},
            {"name": "PBI ERP Legacy", "file": "Kosten-Tabelle (DAX)", "records": len(hersteller_map), "type": "DAX", "date": "2026-02-25"},
            {"name": "PBI eLSA V3", "file": "Deckungsbeitrag Views (DAX)", "records": len(revenue_data), "type": "DAX", "date": "2026-02-25"},
        ],
    }

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
        "customers": customer_list,
        "customerMeta": customer_meta,
        "projects": project_data,
        "revenue": revenue_data,
        "hersteller": hersteller_list,
        "herstellerCategories": hersteller_cat_list,
        "methodology": methodology,
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
    print(f"  Customers: {output['customerMeta']['totalCustomers']} ({output['customerMeta']['totalCustomerTickets']} tickets)")
    print(f"  Projects: {output['projects']['totalProjects']} ({output['projects']['totalSubTasks']} sub-tasks)")
    print(f"  Revenue groups: {len(output['revenue'])}")
    print(f"  Unmatched top words: {', '.join(w['word'] for w in output['unmatched']['topWords'][:10])}")

    # ── Generate ERP 2025 profiles ──
    generate_profiles(tickets, services, out_path.parent)


def generate_profiles(tickets, services, public_dir):
    """Generate profiles2025.json with customer and project profiles for 2025."""
    matchers = build_matchers(services)

    # Filter 2025 tickets
    tickets_2025 = [t for t in tickets if t.get("created", "").startswith("2025")]
    if not tickets_2025:
        print("  No 2025 tickets found, skipping profiles")
        return

    # Customer profiles
    customer_tickets = defaultdict(list)
    for t in tickets_2025:
        cust = extract_customer(t)
        if cust:
            customer_tickets[cust].append(t)

    customer_profiles = []
    for cust, tix in sorted(customer_tickets.items(), key=lambda x: -len(x[1])):
        if len(tix) < 5:
            continue
        services_matched = Counter()
        unmatched_samples = []
        for t in tix:
            svc = match_ticket(t, matchers)
            if svc:
                services_matched[svc] += 1
            else:
                unmatched_samples.append(t.get("summary", "")[:80])
        matched_count = sum(services_matched.values())
        monthly = Counter(t.get("created", "")[:7] for t in tix if t.get("created"))
        by_type = Counter(t.get("type", "Unknown") for t in tix)
        customer_profiles.append({
            "name": cust,
            "tickets2025": len(tix),
            "matched": matched_count,
            "matchRate": round(matched_count / len(tix) * 100, 1),
            "services": [{"name": n, "count": c} for n, c in services_matched.most_common(10)],
            "servicesCount": len(services_matched),
            "monthly": dict(sorted(monthly.items())),
            "types": dict(by_type.most_common()),
            "unmatchedSamples": unmatched_samples[:10],
        })

    # Project profiles (by Jira project key)
    project_groups = defaultdict(list)
    for t in tickets_2025:
        project_groups[t.get("project", "?")].append(t)

    project_profiles = []
    for proj_name, tix in sorted(project_groups.items(), key=lambda x: -len(x[1])):
        services_matched = Counter()
        for t in tix:
            svc = match_ticket(t, matchers)
            if svc:
                services_matched[svc] += 1
        matched_count = sum(services_matched.values())
        monthly = Counter(t.get("created", "")[:7] for t in tix if t.get("created"))
        # Top customers in this project
        proj_customers = Counter()
        for t in tix:
            c = extract_customer(t)
            if c:
                proj_customers[c] += 1
        project_profiles.append({
            "name": proj_name,
            "tickets2025": len(tix),
            "matched": matched_count,
            "matchRate": round(matched_count / len(tix) * 100, 1),
            "services": [{"name": n, "count": c} for n, c in services_matched.most_common(10)],
            "monthly": dict(sorted(monthly.items())),
            "topCustomers": [{"name": n, "count": c} for n, c in proj_customers.most_common(10)],
        })

    profiles = {
        "customerProfiles": customer_profiles,
        "projectProfiles": project_profiles,
        "meta": {
            "year": 2025,
            "totalTickets": len(tickets_2025),
            "totalCustomers": len(customer_profiles),
            "totalProjects": len(project_profiles),
            "overallMatchRate": round(sum(c["matched"] for c in customer_profiles) /
                                      sum(c["tickets2025"] for c in customer_profiles) * 100, 1)
                                if customer_profiles else 0,
        },
    }

    profiles_path = public_dir / "profiles2025.json"
    with open(profiles_path, "w") as f:
        json.dump(profiles, f, ensure_ascii=False, indent=None, separators=(",", ":"))
    print(f"\nProfiles: {profiles_path}")
    print(f"  Customers: {len(customer_profiles)}, Projects: {len(project_profiles)}")
    print(f"  Overall match rate: {profiles['meta']['overallMatchRate']}%")


if __name__ == "__main__":
    main()
