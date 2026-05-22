# Minhas Cifras

Página estática para visualizar cifras musicais com suporte a busca, favoritos e tela cheia.

## Funcionalidades

- **Lista pesquisável** — filtre por nome da música ou artista
- **Favoritos** — marque/desmarque com localStorage
- **Visualização fullscreen** — cifra em tela cheia com Wake Lock (tela não apaga)
- **Parser chordpro** — acordes extraídos e exibidos em linha separada acima da letra
- **Tema escuro** — responsivo

## Como usar

1. Sirva a pasta com qualquer servidor HTTP estático:
   ```sh
   npx serve .
   ```
2. Abra o endereço no navegador.
3. Clique em uma música para visualizar a cifra.

## Adicionar músicas

### Pelo opencode (recomendado)

Com a skill `import-song`:

```
> importa essa cifra https://www.exemplo-cifras.com/artista/musica
```

A skill baixa a página, limpa o ruído, gera o arquivo `.chordpro` e atualiza o índice.

### Manualmente

1. Crie o arquivo em `songs/<id>.chordpro` no formato:
   ```
   {title: Nome da Música}
   {key: C}

   [Am]quando a [C]vida...
   ```
2. Adicione a entrada em `songs/index.json`.

## Estrutura

```
├── index.html          — página principal
├── style.css           — estilos
├── script.js           — lógica (busca, favoritos, parser, render)
├── songs/
│   ├── index.json      — metadados das músicas
│   └── *.chordpro      — cifras no formato chordpro
└── .opencode/
    └── skills/
        └── import-song/SKILL.md
```
