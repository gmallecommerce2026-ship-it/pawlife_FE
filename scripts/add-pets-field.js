// scripts/add-pets-field.js
// Usage: node scripts/add-pets-field.js constants/ingredient.ts
const fs = require('fs');

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node add-pets-field.js <path-to-ingredient.ts>');
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// Items that are dog-specific by name/content — everything else defaults to both.
const DOG_ONLY_IDS = ['homemade_dog_food'];

let count = 0;
content = content.replace(/(\n\s*id:\s*'([^']+)',)/g, (match, fullLine, id) => {
  count++;
  const pets = DOG_ONLY_IDS.includes(id) ? "['dog']" : "['dog', 'cat']";
  return `${fullLine}\n    pets: ${pets},`;
});

fs.writeFileSync(filePath, content, 'utf8');
console.log(`Done. Inserted 'pets' field into ${count} items.`);