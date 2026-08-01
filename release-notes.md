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
