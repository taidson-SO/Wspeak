# Build interna do WSpeak

Este checklist prepara uma build instalavel para teste controlado em Android. Esta etapa nao publica o app em loja.

## Configuracao atual

- Plataforma inicial: Android.
- Perfil EAS: `preview`.
- Tipo de artefato Android: APK para instalacao interna.
- Nome do app: `WSpeak`.
- Slug: `wspeak`.
- Android package: `com.wspeak.app`.
- Android versionCode: `1`.
- Permissao de microfone: `RECORD_AUDIO`.
- Texto de permissao: `O WSpeak precisa do microfone para gravar sua fala e reconhecer suas palavras.`
- Permissoes efetivas observadas em `npx expo config --type public`: `RECORD_AUDIO`, `android.permission.RECORD_AUDIO`, `android.permission.MODIFY_AUDIO_SETTINGS`, `android.permission.FOREGROUND_SERVICE` e `android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK`.
- Icone principal: `assets/icon.png`.
- Icone adaptativo Android: `assets/android-icon-foreground.png`, `assets/android-icon-background.png` e `assets/android-icon-monochrome.png`.
- Splash: `assets/splash-icon.png` com fundo `#F2F7FB`.
- Politica de privacidade para piloto interno: `docs/politica-privacidade.md`.
- Checklist de release, changelog e rollback: `docs/release-checklist.md`.

## Comandos

Verificacao TypeScript:

```bash
npm run typecheck
```

Build interna Android com EAS:

```bash
npm run build:android:internal
```

Comando equivalente:

```bash
npx eas-cli build --platform android --profile preview
```

## Pre-requisitos para gerar a build

1. Ter uma conta Expo/EAS.
2. Estar autenticado no EAS CLI.
3. Confirmar que o projeto pode ser associado a uma conta Expo.
4. Manter o perfil `preview` como distribuicao interna.
5. Nao usar perfil de producao nem envio para loja nesta etapa.

## Checklist antes de rodar

1. Rodar `npm run typecheck`.
2. Conferir `app.json`:
   - nome e slug;
   - package Android;
   - versionCode;
   - icones e splash;
   - permissao de microfone;
   - texto de permissao.
3. Confirmar que os dados sensiveis continuam locais no aparelho.
4. Conferir `docs/politica-privacidade.md`.
5. Conferir versao, changelog e rollback em `docs/release-checklist.md`.
6. Confirmar que logs diagnosticos de PCM continuam desativados por padrao.
7. Gerar APK com `npm run build:android:internal`.
8. Instalar em um Android fisico.

## Checklist no dispositivo

1. Abrir o APK instalado.
2. Confirmar o pedido de permissao de microfone.
3. Entrar em `Treinar fala`.
4. Criar ou escolher uma palavra.
5. Gravar de 3 a 5 amostras.
6. Voltar para a tela inicial.
7. Entrar em `Exercitar` e testar a palavra treinada.
8. Entrar em `Comunicar` e testar reconhecimento e voz.
9. Entrar em `Dados e privacidade` e apagar dados locais.
10. Fechar e reabrir o app.
11. Confirmar que treino, palavras criadas e comunicacao voltaram ao estado sem dados.

## Bloqueios possiveis

- Sem login no EAS CLI: a build nao inicia.
- Sem projeto associado a uma conta Expo: o EAS pode solicitar configuracao inicial.
- Sem Android fisico disponivel: a instalacao real fica pendente.
- Sem conexao externa: a build remota do EAS nao pode ser enviada.

## Validacao desta etapa

- `npm run typecheck`: executado com sucesso.
- `npx expo config --type public`: executado com sucesso e confirmou package Android, splash e permissao de microfone.
- `npx eas-cli --version`: executado com sucesso apos liberar acesso externo; versao observada `eas-cli/20.4.0`.
- `npx eas-cli build --platform android --profile preview --non-interactive`: bloqueado porque nao ha usuario Expo autenticado nem `EXPO_TOKEN` configurado.
- Instalacao em Android fisico: pendente ate a build interna ser gerada.

## Registro da build

Preencher a cada APK gerado:

- Data:
- Responsavel:
- Versao:
- Android versionCode:
- Comando usado:
- Link/ID da build EAS:
- Dispositivo instalado:
- Resultado do checklist:
- Decisao: distribuir internamente, refazer build ou rollback.
