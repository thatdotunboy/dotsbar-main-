const fs = require('fs');

const navFiles = [
  'client/src/app/rooms/page.tsx',
  'client/src/app/profile/page.tsx',
  'client/src/app/events/page.tsx',
];

navFiles.forEach(f => {
  if (!fs.existsSync(f)) { console.log('Not found: ' + f); return; }
  let c = fs.readFileSync(f, 'utf8');
  const eventsStr = 'router.push("/events")';
  const marketStr = 'router.push("/market")';
  if (c.includes(eventsStr) && !c.includes(marketStr)) {
    // Insert Market button before Events button
    c = c.replace(
      '<Button variant="ghost" onClick={() => router.push("/events")',
      '<Button variant="ghost" onClick={() => router.push("/market")} className="px-3 sm:px-4">Market</Button>\n          <Button variant="ghost" onClick={() => router.push("/events")'
    );
    fs.writeFileSync(f, c);
    console.log('Updated: ' + f);
  } else {
    console.log('Skipped: ' + f);
  }
});
console.log('Done.');
