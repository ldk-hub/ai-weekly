const fs = require('fs');
const local = JSON.parse(fs.readFileSync('data/stars/stars_ledger.json', 'utf-8'));
const remote = JSON.parse(fs.readFileSync('data/stars/stars_ledger_remote.json', 'utf-8'));

const merged = { ...remote };

for (const repo in local) {
  if (!merged[repo]) {
    merged[repo] = local[repo];
  } else {
    const existingDates = new Set(merged[repo].map(x => x.date));
    for (const item of local[repo]) {
      if (!existingDates.has(item.date)) {
        merged[repo].push(item);
      } else {
        // If date already exists, we can keep the local or remote.
        // Actually, let's update it with local's value (it might be the same or newer).
        const existingItem = merged[repo].find(x => x.date === item.date);
        existingItem.stars = Math.max(existingItem.stars, item.stars);
      }
    }
    // Sort by date
    merged[repo].sort((a, b) => a.date.localeCompare(b.date));
  }
}

fs.writeFileSync('data/stars/stars_ledger_merged.json', JSON.stringify(merged, null, 2) + '\n');
console.log('Merged successfully');
