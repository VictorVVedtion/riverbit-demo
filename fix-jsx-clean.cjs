const fs = require('fs');

// Read the file
let content = fs.readFileSync('components/LiquidBentoTradingInterface.tsx', 'utf8');

// Clean up the specific problematic area around lines 1842-1847
// Find the section with the syntax error and rewrite it cleanly
const problemSection = /(\s+<\/>\s+\)\}\s*\n\s*<\/div>\s*\n\s*<\/LiquidGlassCard>)/g;

const cleanSection = `              </>
            )}

          </div>
        </LiquidGlassCard>`;

content = content.replace(problemSection, cleanSection);

// Also ensure proper line endings
content = content.replace(/\r\n/g, '\n');
content = content.replace(/\r/g, '\n');

// Write back the cleaned file
fs.writeFileSync('components/LiquidBentoTradingInterface.tsx', content);

console.log('File cleaned and JSX syntax fixed');