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
// 4. Git
console.log(`Verificando alterações no Git...`);
try {
    run('git add .');
    // Tenta commitar. Se não houver nada, o erro será capturado pelo catch e ignorado.
    run('git commit -m "Atualização versão ' + version + '"');
} catch (e) {
    console.log("⚠️ Nenhuma alteração detectada para commit, continuando...");
}
run('git push origin main');

// 5. Tag
try { run(`git tag -d v${version}`); } catch (e) {}
run(`git tag v${version}`);
run(`git push origin v${version} --force`);

// 6. GitHub CLI (Publicação)
console.log(`📤 Publicando no GitHub...`);
// Detectar disponibilidade do gh (podemos ter o gh em outro local) ou variável GH_TOKEN
function detectGhCommand() {
    try {
        // tenta o path configurado
        execSync(`"${ghPath}" --version`, { stdio: 'ignore' });
        return `"${ghPath}"`;
    } catch (e) {
        try {
            // tenta comando em PATH
            execSync('gh --version', { stdio: 'ignore', shell: true });
            return 'gh';
        } catch (e2) {
            return null;
        }
    }
}

const ghCmd = detectGhCommand();

// If GH_TOKEN is not set in the environment, attempt to read a local
// `.gh_token` file in the repository root. This file should NOT be
// committed to version control. Add `.gh_token` to your `.gitignore`.
try {
    if (!process.env.GH_TOKEN) {
        // attempt to read from .gh_token (synchronous read is fine here)
        try {
            const token = readFileSync('./.gh_token', 'utf8').trim();
            if (token) process.env.GH_TOKEN = token;
        } catch (e) {
            // no local token file
        }
    }
} catch (e) {
    // ignore
}

if (!ghCmd && !process.env.GH_TOKEN) {
    console.log('⚠️ GitHub CLI não encontrado e GH_TOKEN não configurado. Pulando publicação automática.');
    console.log('Se quiser publicar automaticamente, instale/autorize o `gh` (gh auth login) ou exporte GH_TOKEN com permissão de repo.');
} else {
    // tenta checar autenticação (se possível)
    let authenticated = false;
    if (process.env.GH_TOKEN) {
        authenticated = true;
    } else if (ghCmd) {
        try {
            execSync(`${ghCmd} auth status`, { stdio: 'ignore', shell: true });
            authenticated = true;
        } catch (e) {
            authenticated = false;
        }
    }

    if (!authenticated) {
        console.log('⚠️ GitHub CLI detectado porém não autenticado. Pulando publicação automática.');
        console.log('Execute `gh auth login` ou exporte `GH_TOKEN` para habilitar publicação.');
    } else {
        try {
            try { run(`${ghCmd} release delete v${version} -y`); } catch (e) { console.log('Nota: Nenhuma release anterior para deletar.'); }
            run(`${ghCmd} release create v${version} "${setupFile}" "C:/guihub-release/latest.yml" --title "Versão ${version}" --notes "Automático"`);
            console.log('✅ Tudo feito. Release publicada com sucesso!');
        } catch (err) {
            console.error('Erro ao publicar com GitHub CLI:', err);
        }
    }
}