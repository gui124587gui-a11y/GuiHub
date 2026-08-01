# GuiHub v1.0.29

## Música (Spotify) — novo app/client
- **Novo aplicativo Spotify registrado:** o GuiHub agora usa um novo Client ID no fluxo de autorização (antes, a versão instalada usava o Client ID antigo embutido no código).
- **Corrigido o Client ID usado na versão instalada:** o Client ID agora é atualizado diretamente no código (o `.env` não é empacotado no instalador), garantindo que o app instalado use o mesmo app Spotify do ambiente de desenvolvimento.
- **Diagnóstico "Verificar Spotify":** mantido e útil para conferir escopos e o carregamento de faixas de playlist após reconectar.

# GuiHub v1.0.28

## Música (Spotify)
- **Mensagem de erro 403 mais clara:** quando o Spotify recusa uma operação, o app explica que isso geralmente acontece porque o app Spotify está em modo de desenvolvimento sem a conta liberada (allowlist) ou sem cota estendida — com o passo a passo no próprio aviso.

# GuiHub v1.0.27

## Música (Spotify) — diagnóstico
- **Diagnóstico "Verificar Spotify" aprimorado:** agora mostra o erro exato ao carregar faixas de playlist (código HTTP e mensagem do Spotify) e testa também os detalhes da playlist, para identificar a causa exata.
- **Carregamento de faixas com nova tentativa automática:** se a primeira chamada falhar (ex.: limite de requisições temporário), o app tenta uma segunda vez.

# GuiHub v1.0.26

## Música (Spotify) — correções e melhorias
- **Busca: ao trocar de aba (Faixas/Álbum/Artistas/Playlists) a busca é refeita automaticamente** com o mesmo termo, e os resultados antigos da aba anterior são limpos (antes, os resultados ficavam "vazando" entre abas com botões errados).
- **Corrigido: Shuffle e Repetição "bugados".** Antes a interface alternava mesmo quando a API falhava (sem dispositivo ativo) e o estado voltava sozinho. Agora o app verifica o resultado real, tenta usar o dispositivo disponível e mostra o motivo claro se não conseguir.
- **Permissões de playlist:** botão "Reconectar" no aviso de permissão agora abre a autorização do Spotify na hora (re-autorização completa em um clique).
- **Diagnóstico "Verificar Spotify" melhorado:** mostra quantos escopos o token tem (e se inclui permissão de editar/ler playlists) e testa carregar faixas de uma playlist pública, com o resultado na tela e no console.
- **Mensagens de erro mais precisas:** erros 403 agora mostram o motivo exato que o Spotify devolve (ex.: "Insufficient client scope") e o carregamento de faixas de playlist mostra o motivo real quando falha (antes falhava em silêncio parecendo playlist vazia).

# GuiHub v1.0.25

## Música (Spotify) — correções
- **Corrigido: "Tocar a seguir" (fila) falhava.** Agora, se nenhum dispositivo estiver ativo, o app tenta usar o dispositivo ativo/disponível e mostra uma mensagem clara ("Nenhum dispositivo ativo no Spotify...") com o motivo real do erro no console.
- **Corrigido: faixas não eram adicionadas às playlists.** Conexões feitas antes da v1.0.23 não tinham permissão de editar playlists — agora o app mostra um aviso na tela com botão "Reconectar", e mensagens de erro com o código real do Spotify (403/401/400).
- **Corrigido: contagem de faixas das playlists mostrava 0.** A contagem agora prefere as faixas realmente carregadas e o nome da playlist é clicável para abrir a visualização com o total correto.
- **Corrigido: sessão do Spotify expirada/revogada.** O app detecta o token inválido, limpa a sessão e pede para reconectar em vez de falhar silenciosamente.
- Modal "Adicionar à playlist": não fecha mais em caso de erro — mostra o motivo dentro do modal.

# GuiHub v1.0.24

## Música (Spotify)
- Refatorado o player para usar o serviço unificado de Spotify (`spotifyService`), com melhor tratamento de erros e diagnóstico no console.
- Novo modal "Adicionar à playlist": filtre suas playlists, crie uma nova rapidamente e adicione a faixa com confirmação de carregamento. Feche com Esc ou clicando fora.
- Playlists expansíveis: veja as faixas de cada playlist e toque, enfileire ou adicione a faixa direto dali.
- Botão "Tocar playlist" para iniciar a reprodução do contexto completo.
- "Tocar a seguir": enfileire faixas para reproduzir em seguida na sua fila.
- Correção: recomendações agora são buscadas apenas quando a faixa muda (antes eram recarregadas a cada segundo).
- Correção de divisão por zero na barra de progresso e spinners nos loaders de busca e álbum.
- Botões de criação de playlist protegidos contra duplo clique.

## Geral
- A janela do app não abre mais o DevTools automaticamente ao iniciar.
