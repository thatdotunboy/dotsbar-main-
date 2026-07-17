const fs = require('fs');

const headerFiles = [
  'client/src/app/events/page.tsx',
  'client/src/app/profile/page.tsx',
  'client/src/app/room/[id]/page.tsx',
  'client/src/app/rooms/page.tsx',
  'client/src/app/page.tsx'
];

headerFiles.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    // We do a simple string replace for the D blocks to avoid complex regex
    const oldIcon1 = `<div className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center font-bold text-black text-xl">D</div>`;
    const oldIcon2 = `<div className="w-8 h-8 rounded bg-blue-500 flex items-center \r\njustify-center font-bold text-black text-xl">D</div>`;
    const oldIcon3 = `<div className="w-8 h-8 rounded bg-blue-500 flex items-center \njustify-center font-bold text-black text-xl">D</div>`;
    const oldIcon4 = `<div className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center font-bold text-black text-sm md:text-base">D</div>`;
    
    const newIcon = `<div className="w-9 h-7 bg-blue-500 rounded-xl rounded-bl-sm flex items-center justify-center gap-1">
            <div className="w-2 h-2 bg-white rounded-full"></div>
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>`;

    content = content.replace(oldIcon1, newIcon)
                     .replace(oldIcon2, newIcon)
                     .replace(oldIcon3, newIcon)
                     .replace(oldIcon4, newIcon);
                     
    content = content.replace(/<span className="font-bold text-xl tracking-tight hidden sm:block">DotsBar<\/span>/g, '<span className="font-bold text-xl tracking-tight text-blue-500 hidden sm:block">DotsBar</span>');
    content = content.replace(/<span className="font-bold text-xl tracking-tight">DotsBar<\/span>/g, '<span className="font-bold text-xl tracking-tight text-blue-500">DotsBar</span>');
    
    fs.writeFileSync(f, content, 'utf8');
  }
});

const authFiles = [
  'client/src/app/login/page.tsx',
  'client/src/app/register/page.tsx'
];

authFiles.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    const oldLoginIcon1 = `<div className="w-14 h-14 rounded-xl bg-blue-500 flex items-center justify-center font-black text-black text-3xl mx-auto mb-4">D</div>`;
    const oldLoginIcon2 = `<div className="w-14 h-14 rounded-xl bg-blue-500 flex items-center \r\njustify-center font-black text-black text-3xl mx-auto mb-4">D</div>`;
    const oldLoginIcon3 = `<div className="w-14 h-14 rounded-xl bg-blue-500 flex items-center \njustify-center font-black text-black text-3xl mx-auto mb-4">D</div>`;
    
    const newLoginIcon = `<div className="w-20 h-14 bg-blue-500 rounded-2xl rounded-bl-md flex items-center justify-center gap-2 mx-auto mb-4">
            <div className="w-4 h-4 bg-white rounded-full"></div>
            <div className="w-4 h-4 bg-white rounded-full"></div>
          </div>`;
          
    content = content.replace(oldLoginIcon1, newLoginIcon)
                     .replace(oldLoginIcon2, newLoginIcon)
                     .replace(oldLoginIcon3, newLoginIcon);

    fs.writeFileSync(f, content, 'utf8');
  }
});

console.log("Replacement complete.");
