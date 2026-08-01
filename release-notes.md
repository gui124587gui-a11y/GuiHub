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
