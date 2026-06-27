# WSpeak

WSpeak é um app mobile de acessibilidade para pessoas com dificuldade de fala. O MVP coleta amostras gravadas localmente para estudar o padrão individual do usuário e evoluir para reconhecimento personalizado.

O foco do produto é apoiar pessoas com fala ininteligível para desconhecidos. O app deve aprender o padrão fonológico individual, oferecer exercício comparativo com o padrão comum das palavras em português brasileiro e funcionar como tradutor em conversas com terceiros.

## O que já funciona

- Tela inicial com acesso a treinamento, avaliação, exercício e comunicação.
- Treinamento local de palavras com gravação de amostras prontas para comparação.
- Avaliação guiada local com 8 a 12 amostras por palavra, anotação humana e confusões observadas.
- Exercício local para praticar palavras com pelo menos 3 amostras prontas, feedback simples e resumo de evolução no aparelho.
- Persistência local de palavras treinadas, amostras e datas.
- Tela de dados e privacidade para explicar o armazenamento local e apagar dados do aparelho.
- Comunicação com infraestrutura de comparação local preparada, ainda em revisão metodológica.
- Reprodução da palavra correta com `expo-speech`.

## Modos previstos

- Treinamento: grava amostras da fala do usuário associadas a palavras esperadas para formar o padrão individual.
- Avaliação: coleta mais amostras, registra o que uma pessoa entendeu e monta confusões por palavra.
- Exercício: permite praticar palavras com treino pronto e receber feedback simples.
- Comunicação: usa palavras com treino pronto como apoio de conversa, exibindo e falando a palavra reconhecida quando houver confiança suficiente.

## Execução

```bash
npm install
npm start
```

Depois, abra no Android, iOS ou web pelo Expo.

## Build interna Android

A build interna usa EAS Build com o perfil `preview`, gerando APK para teste controlado sem publicacao em loja.

```bash
npm run typecheck
npm run build:android:internal
```

O checklist completo esta em [docs/build-interna.md](docs/build-interna.md).

O checklist repetivel de release, changelog e rollback esta em [docs/release-checklist.md](docs/release-checklist.md).

## Bibliotecas usadas

- `expo-audio` para gravação de áudio e permissões de microfone.
- `expo-speech` para síntese de voz.
- `@react-native-async-storage/async-storage` para persistência local.
- `expo-file-system` para remoção de amostras gravadas.

## Privacidade e dados locais

O WSpeak não envia áudio, palavras, avaliações, tentativas de exercício ou treinamento para servidor. As amostras de áudio, os padrões usados no reconhecimento, as respostas humanas, as confusões observadas, o resumo de exercício e as palavras criadas pelo usuário ficam salvos no próprio aparelho.

Na tela **Dados e privacidade**, o usuário pode apagar todos os dados locais com confirmação. Essa ação remove os registros salvos no AsyncStorage e tenta apagar os arquivos de áudio das amostras gravadas. Depois disso, Treinar, Avaliar, Exercitar e Comunicar voltam ao estado inicial, sem treino salvo.

A politica de privacidade para piloto interno esta em [docs/politica-privacidade.md](docs/politica-privacidade.md). Para publicacao em loja, ela ainda precisa ser publicada em uma URL publica.

## Estado atual do reconhecimento

- `unsupported_audio`: é o estado honesto quando o áudio gravado continua comprimido e não há PCM/WAV confiável para extrair features.
- `infraestrutura de comparação`: já existe a camada local em [src/features/communication/services/audioAnalysis/](src/features/communication/services/audioAnalysis/), mas ela só compara quando recebe dados de sinal analisáveis.
- `comparação real`: só acontece quando o áudio atual e as amostras treinadas têm features extraídas de dados reais do sinal.
- A abordagem atual por features simples não foi suficiente para reconhecer fala com qualidade de piloto; a revisão técnica está documentada em [docs/revisao-abordagem-reconhecimento.md](docs/revisao-abordagem-reconhecimento.md).
- O modo comunicação agora tenta um experimento isolado de captura PCM em tempo real e volta para a gravação existente se a captura não estiver disponível.

Leia o fluxo técnico em [docs/reconhecimento-local.md](docs/reconhecimento-local.md).

O consolidado do ciclo atual e o caminho ate producao estao em [docs/roadmap-producao.md](docs/roadmap-producao.md).

Os requisitos de produto atualizados estao em [docs/requisitos-produto.md](docs/requisitos-produto.md).

As etapas em formato de prompt para conduzir o projeto ate producao estao em [docs/prompts-producao.md](docs/prompts-producao.md).

O relatorio final de prontidao para piloto/producao esta em [docs/relatorio-final-producao.md](docs/relatorio-final-producao.md).

O roadmap do novo escopo, apos a revisao da abordagem de reconhecimento, esta em [docs/roadmap-novo-escopo.md](docs/roadmap-novo-escopo.md).

## Onde continua a evolução

O ponto de troca continua em [src/features/communication/services/personalizedSpeechRecognizer.ts](src/features/communication/services/personalizedSpeechRecognizer.ts).

O próximo passo técnico recomendado é amadurecer a coleta fonoaudiológica estruturada, usar as anotações humanas para liberar palavras confirmadas e avaliar um modelo acústico/fonético mais robusto.

## Observação de arquitetura

O app não usa backend nem chave de API. O objetivo é manter o reconhecimento local e evoluir depois para um algoritmo personalizado real.
