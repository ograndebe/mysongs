---
name: import-song
description: >-
  Dada uma URL de um site de cifras (cifraclub, ultimate-guitar, e-mm,
  ouvirmusica, etc.), faz o download, extrai a cifra removendo ruído
  (anúncios, menus, scripts, etc.), gera o arquivo .chordpro e insere
  no índice. Dispare quando o usuário disser algo como "importa essa
  cifra", "baixa essa música", "adiciona do site" ou passar uma URL.
---

# Importar Cifra de Site Externo

Use exclusivamente quando o usuário fornecer uma URL de um site de cifras
e pedir para importar/adicionar/baixar a música. Ignore se o usuário apenas
perguntar sobre um site ou artista sem solicitar importação.

## Fluxo

### 1. Baixar a página

Use `webfetch` com `format: "text"` na URL fornecida pelo usuário.

### 2. Extrair e limpar

Com o HTML bruto em mãos, extraia:

- **título** da música
- **artista** / banda
- **tom** (opcional, ex: "C", "Am", "G")
- **letra com cifras**

Remova completamente:
- Menus de navegação, cabeçalhos, rodapés
- Anúncios e banners
- Scripts, estilos, iframes
- Comentários HTML
- Links de compartilhamento, botões sociais
- "Cifra simplificada", "Cifra original", "ver mais" etc.

### 3. Gerar ID

Crie um ID único a partir do título: lowercase, substitua acentos/caracteres
especiais, substitua espaços por hífens:

```
"Hoje Eu Só Quero Te Amar" → "hoje-eu-so-quero-te-amar"
```

### 4. Converter para chordpro

O formato chordpro esperado é simples:

- Acordes dentro de colchetes: `[Am]`, `[C7]`, `[G/B]`, `[Dm]`
- Seções de refrão envolvidas em `{chorus}` / `{endchorus}`
- Tags opcionais no cabeçalho: `{title: ...}`, `{key: ...}`
- Cada verso em parágrafo separado, linhas vazias entre estrofes

Regras de conversão específicas:

- Cifras inline como `Am C G` **sem** colchetes → converta para `[Am] [C] [G]`
- Acordes sobre a letra → mantenha na linha de cima com colchetes, ou coloque
  o acorde inline antes da sílaba correspondente (ex: `[Am]quando a [C]vida`)
- Se o site usa notação como `Am7(9)` ou `C#m7(b5)`, mantenha como `[Am7(9)]`
  dentro dos colchetes
- Linhas de solo/tablatura (com números e cordas) → descarte, a menos que
  o usuário peça explicitamente para manter

### 5. Salvar arquivo

Crie o arquivo `songs/<id>.chordpro` com o conteúdo chordpro limpo.

### 6. Atualizar índice

Leia `songs/index.json`, adicione a nova entrada no array:

```json
{
  "id": "<id>",
  "title": "<Título>",
  "artist": "<Artista>",
  "key": "<Tom>"
}
```

E escreva o JSON de volta (formatado com 2 espaços de indentação).

### 7. Confirmação

Avise o usuário que a música foi importada e mostre o título e a chave.

## Exemplo

**Usuário:** "importa essa cifra https://www.cifraclub.com/engenheiros-do-hawaii/infinito/"
**Ação:**
1. `webfetch` na URL → HTML
2. Extrai título "Infinito", artista "Engenheiros do Hawaii", tom "G"
3. Gera ID: `infinito`
4. Converte letra+cifras para chordpro
5. Salva `songs/infinito.chordpro`
6. Adiciona ao `songs/index.json`
7. Responde: "✅ Infinito — Engenheiros do Hawaii (Tom: G) importada com sucesso!"

## Notas

- Se houver múltiplas páginas (rolagem infinita, paginação), baixe apenas a
  primeira página a menos que o usuário peça mais.
- Se a URL não for acessível ou retornar erro 404, informe o usuário.
- A qualidade da extração depende do site. Se algo ficar estranho (acordes
  trocados, letra truncada), sugira ao usuário que ele mesmo corrija o
  arquivo `.chordpro`.
