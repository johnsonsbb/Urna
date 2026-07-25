# Créditos de arte

## OpenTibia Sprite Pack

Os sprites de criaturas e o outfit das vocações vêm do
[OpenTibia Sprite Pack](https://github.com/peonso/opentibia_sprite_pack),
mantido por **peonso** e pela comunidade OpenTibia.

**Licença:** [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)

A licença permite uso comercial e modificação, e exige atribuição. A lista
completa de autores individuais está no `AUTHORS.md` do repositório original e
deve ser preservada em qualquer distribuição deste jogo.

### O que usamos

| No jogo | Origem no pack |
|---|---|
| Gato Selvagem | `otsp_creatures_01` |
| Goblin Saqueador | `otsp_creatures_02` |
| Espectro Menor | `otsp_creatures_01` |
| Lobo Sombrio | `otsp_creatures_01` |
| Javali Sanguinário | `otsp_creatures_01` |
| Esqueleto Guerreiro | `otsp_creatures_01` |
| Senhor do Covil | `otsp_creatures_01` |
| Cavaleiro, Paladino, Feiticeiro, Druida | `otsp_creatures_03` — mesmo outfit humano, recolorido por vocação |

### Modificações que aplicamos

- recorte dos quadros de caminhada das folhas originais
- remoção do magenta (`#FF00FF`) usado como cor de transparência
- **recolorização por canal** do outfit humano, usando a máscara de quatro
  canais do pack (amarelo, vermelho, verde e azul = cabeça, corpo, pernas e
  pés), gerando as quatro vocações a partir de um único sprite

Tudo é feito por `scripts/build-atlas.mjs`, que produz `apps/web/public/atlas.png`
e `apps/web/src/game/atlas.json`. Para regenerar:

```bash
git clone --depth 1 https://github.com/peonso/opentibia_sprite_pack
node scripts/build-atlas.mjs ./opentibia_sprite_pack
```

O pack em si **não** é versionado neste repositório — só o atlas gerado.

## O que este projeto NÃO usa

Nenhum arquivo do cliente oficial do Tibia (`Tibia.spr`, `Tibia.dat`, mapas ou
qualquer outro asset da CipSoft GmbH). Este projeto não é afiliado à CipSoft.

Nomes de criaturas, lugares e magias são próprios. Fórmulas e mecânicas
inspiradas no gênero não são protegidas por copyright; nomes e marcas são, e
por isso não foram reaproveitados.

## Ícones e efeitos

Ícones da interface, ícones do PWA e efeitos visuais de magia são gerados por
código neste repositório (`scripts/gen-icons.mjs`, `src/ui/Icons.tsx`,
`src/game/renderer.ts`) e seguem a licença do projeto.
