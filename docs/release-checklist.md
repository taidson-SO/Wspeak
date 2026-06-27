# Checklist de release do WSpeak

Data: 2026-06-27.

Este checklist torna repetivel a preparacao de uma build interna Android. Publicacao em loja continua fora do escopo desta etapa.

## Versao atual

- App: `WSpeak`.
- Versao: `1.0.0`.
- Android `versionCode`: `1`.
- iOS `buildNumber`: `1`.
- Perfil EAS interno: `preview`.
- Artefato Android interno: APK.

## Changelog da build 1.0.0 interna

- Treinamento local de palavras em portugues brasileiro.
- Palavras sugeridas e palavras criadas pelo usuario.
- Captura PCM Android como caminho analisavel quando disponivel.
- Avaliacao guiada com anotacao humana e confusoes observadas.
- Modo Exercitar com feedback simples e historico local de tentativas.
- Modo Comunicar com resultado grande, voz sintetica somente em confianca suficiente e repeticao de voz.
- Tela Dados e privacidade para explicar e apagar dados locais.
- Estados visuais para preparar microfone, gravar, salvar e reconhecer.

## Criterio de rollback

Voltar para a build anterior ou suspender distribuicao interna se ocorrer qualquer item abaixo:

- app nao abre apos instalacao limpa;
- permissao de microfone impede uso mesmo quando concedida;
- gravacao fica presa ou microfone permanece ocupado apos voltar de tela;
- apagar dados locais nao remove treino/avaliacao de forma confiavel;
- comunicacao fala automaticamente palavra com baixa confianca;
- travamento recorrente em Treinar, Avaliar, Exercitar ou Comunicar;
- regressao grave de acessibilidade em tela pequena, fonte ampliada ou leitor de tela.

## Antes de gerar build

1. Atualizar `app.json` quando houver nova versao:
   - `expo.version`;
   - `android.versionCode`;
   - `ios.buildNumber`, se iOS entrar no escopo.
2. Atualizar este changelog.
3. Rodar `npm run typecheck`.
4. Rodar `npx expo config --type public`.
5. Confirmar que `docs/politica-privacidade.md` reflete o comportamento real.
6. Confirmar que logs diagnosticos sensiveis estao desligados por padrao.
7. Gerar APK interno com `npm run build:android:internal`.

## Depois de gerar build

1. Baixar o APK gerado pelo EAS.
2. Instalar em Android fisico.
3. Executar `docs/build-interna.md`.
4. Executar `docs/testes-manuais.md`.
5. Registrar aparelho, Android, data, versao instalada e resultado.
6. Se falhar criterio de rollback, nao distribuir a build.

## Preparacao futura de loja

Antes de Play Store ou App Store:

- publicar politica de privacidade em URL publica;
- preencher formulario de seguranca de dados com armazenamento local e uso de microfone;
- revisar nome, descricao curta, descricao completa e imagens de loja;
- preparar icones e screenshots nos tamanhos exigidos;
- revisar acessibilidade com leitor de tela e fonte ampliada;
- decidir se a build sera APK interno, AAB de loja ou TestFlight;
- validar assinatura, versionamento e trilha de teste;
- criar plano de suporte para exclusao de dados e contato do responsavel.
