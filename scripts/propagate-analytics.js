const fs = require('fs');
const path = require('path');
const { listPages } = require('./propagate-nav-pages');
const { stampAnalytics } = require('./analytics');
for (const file of listPages()) {
  const full = path.join(__dirname, '..', file);
  const before = fs.readFileSync(full, 'utf8');
  const after = stampAnalytics(before, file);
  if (before !== after) fs.writeFileSync(full, after);
}
