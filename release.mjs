import { execSync } from 'child_process';
import { readFileSync } from 'fs';

// 1. Carrega a versão do package.json
const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
const version = pkg.version;

// Caminho absoluto para o GitHub CLI
const ghPath = "C:\\Program Files\\GitHub CLI\\gh.exe";
// Nome do arquivo gerado pelo electron-builder (com os espaços vistos no log)
const setupFile = `C:/guihub-release/GuiHub Setup ${version}.exe`;

function run(cmd) {
    console.log(`> Executando: ${cmd}`);
    execSync(cmd, { stdio: 'inherit', shell: true });
}

console.log(`🚀 Iniciando release versão: ${version}`);

// 2. Build
run('npm run build');

// 3. Gerar Instalador
run('npx electron-builder --win nsis');

// 4. Git
const msg = 'Atualização versão ' + version;
run('git add .');
run(`git commit -m "${msg}"`);
run('git push origin main');

// 5. Tag
try { run(`git tag -d v${version}`); } catch (e) {}
run(`git tag v${version}`);
run(`git push origin v${version} --force`);

// 6. GitHub CLI (Publicação)
console.log(`📤 Publicando no GitHub...`);
try { 
    run(`"${ghPath}" release delete v${version} -y`); 
} catch (e) {
    console.log("Nota: Nenhuma release anterior para deletar.");
}

// Criando a release com o caminho do arquivo e nome ajustados
run(`"${ghPath}" release create v${version} "${setupFile}" "C:/guihub-release/latest.yml" --title "Versão ${version}" --notes "Automático"`);

console.log('✅ Tudo feito. Release publicada com sucesso, patrão!');gi