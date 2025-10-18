import requests, datetime, collections, os
from datetime import timezone
from dotenv import load_dotenv

load_dotenv()

params = {
    "engine": "google_trends",
    "q": ",".join(["slavery, AI tools"]),  # up to 5 queries
    "data_type": "TIMESERIES",
    "date": "today 5-y",
    "tz": "-60",  # London (BST)
    "api_key": os.getenv("SERPAPI_KEY")
}
res = requests.get("https://serpapi.com/search.json", params=params)
res.raise_for_status()
j = res.json()

# timeline_data: weekly points; convert to per-year averages for the last 5 calendar years
timeline = j.get("interest_over_time", {}).get("timeline_data", [])
per_year = collections.defaultdict(lambda: collections.defaultdict(list))

for point in timeline:
    # point["timestamp"] is seconds since epoch (string)
    dt = datetime.datetime.fromtimestamp(int(point["timestamp"]), timezone.utc)
    year = dt.year
    for v in point["values"]:
        per_year[year][v["query"]].append(int(v["extracted_value"]))

# build annual averages (or sums, if you prefer)
annual = []
for year in sorted(per_year.keys()):
    row = {"year": year}
    for query, vals in per_year[year].items():
        row[f"{query}_sum"] = sum(vals)
    annual.append(row)

print(annual)  # e.g. [{'year': 2021, 'coffee_avg': ..., 'coffee_sum': ...}, ...]
