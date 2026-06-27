# Reconhecimento local do WSpeak

Este documento resume o estado atual do reconhecimento personalizado e evita confundir infraestrutura pronta com reconhecimento confiavel.

## Objetivo

O WSpeak deve reconhecer palavras treinadas pelo próprio usuário, usando apenas dados locais do dispositivo. Os testes atuais mostraram que a abordagem por features simples ainda nao cumpre esse objetivo com qualidade suficiente.

## Princípio de comparação

O app não compara com uma pronúncia padrão externa. A referência é sempre o padrão individual do usuário, formado pelas amostras que ele gravou no modo treinamento.

## Features locais

Quando existe PCM/WAV analisavel, o app extrai features leves do proprio sinal:

- duracao total e duracao ativa apos aparar silencio;
- proporcao estimada de silencio;
- amplitude media, pico de amplitude e energia RMS;
- taxa global de cruzamento por zero;
- envelope de energia em 8 segmentos;
- envelope de cruzamento por zero em 8 segmentos;
- frames temporais curtos com energia, amplitude e cruzamento por zero.

Antes de calcular essas features, o sinal e normalizado por volume e tem silencio inicial/final descartado quando ha amostras suficientes. Isso reduz diferencas simples de distancia do microfone e pausas antes/depois da fala.

## Comparacao por palavra

Para cada palavra treinada, o app compara a fala atual com cada amostra analisavel da palavra. A pontuacao final combina:

- melhor amostra da palavra;
- media das melhores amostras;
- consistencia entre as melhores amostras.

Isso evita depender apenas de uma media simples e ajuda quando uma amostra treinada ficou pior que as outras.

Quando a fala atual e a amostra treinada possuem frames temporais, a comparacao usa DTW (Dynamic Time Warping). O DTW alinha sequencias de frames para tolerar pequenas variacoes de ritmo, velocidade e duracao relativa das partes da palavra. Quando uma amostra antiga possui apenas features globais, o app usa automaticamente a comparacao global anterior.

## Fluxo atual

1. O usuário treina uma palavra gravando amostras localmente.
2. As amostras são persistidas com metadados no armazenamento local.
3. A camada de análise tenta extrair features do áudio.
4. O recognizer compara a fala atual com as amostras treinadas somente quando há features confiáveis.
5. Se o áudio não estiver em PCM/WAV ou em um buffer numérico confiável, o resultado retorna `unsupported_audio`.

No treinamento, o app continua gravando o áudio normalmente e tenta capturar PCM em tempo real em paralelo. Quando isso funciona, a nova amostra salva `features` reais em `SpeechSample.features`.

## Classificação honesta do estado

- `simulado`: usado apenas quando o app escolhe uma palavra sem comparação real. Este estado não deve ser mascarado como análise.
- `infraestrutura de comparação`: existe código preparado para extrair features e comparar localmente, mas o fluxo real ainda não entrega um sinal analisável.
- `comparação real`: só vale quando o áudio atual e as amostras treinadas têm features extraídas de dados reais do sinal.
- `baixa confiança`: existe comparação real, mas a similaridade ficou abaixo do limiar mínimo. O app mostra a hipótese sem falar automaticamente.
- `unsupported_audio`: retorno correto quando o arquivo gravado está comprimido ou quando o formato atual não permite análise local confiável.

## Limitação atual

O fluxo normal do app grava áudio comprimido. Nesse formato, a comparação local não deve fingir sucesso. Sem PCM/WAV ou um buffer numérico confiável, o sistema precisa continuar retornando `unsupported_audio`.

Amostras antigas podem permanecer sem `features`. Elas continuam compatíveis, mas não entram na comparação real.

Amostras antigas que ja tinham features mais simples continuam compativeis. Elas podem entrar na comparacao real, mas sem todos os sinais temporais novos; a melhoria completa aparece nas novas amostras gravadas apos esta versao.

## Conclusao atual

O comparador por features simples deve ser tratado como **baseline tecnico**, nao como mecanismo principal de reconhecimento para piloto.

Ele pode indicar semelhanca acustica geral, mas nao modela de forma suficiente fonemas, padroes fonologicos, consistencia de erro, inteligibilidade para ouvintes e confusoes entre palavras.

A revisao completa esta em `docs/revisao-abordagem-reconhecimento.md`.

## Limites conhecidos do algoritmo

- O algoritmo ainda e leve e heuristico; ele nao substitui um modelo fonetico ou acustico treinado.
- Nao ha MFCC real nem modelo acustico treinado; a comparacao temporal usa DTW leve sobre energia, amplitude e cruzamento por zero.
- O limiar de confianca ainda precisa ser calibrado com mais palavras e usuarios reais.
- Palavras com duracao, energia e envelope parecidos ainda podem gerar falsos positivos.
- Fala muito baixa, muito curta ou com muito ruido pode produzir baixa confianca mesmo com PCM valido.
- A comparacao real depende de PCM/WAV ou sinal numerico confiavel; sem isso, o app deve continuar em `unsupported_audio`.
- No Android, o treinamento prioriza a captura analisavel e evita abrir a gravacao comum em paralelo com a captura PCM.
- Exercitar e Comunicar so devem ser liberados para palavras com pelo menos 3 amostras prontas para comparacao.
- A comunicacao limpa o resultado anterior ao iniciar nova gravacao e usa margem dinamica entre a melhor palavra e a segunda melhor. Se a confianca estiver alta, uma margem menor ja pode ser aceita; se estiver media ou baixa, o resultado vira baixa confianca e nao aciona voz automatica.

## O que falta para ativar a comparação real no fluxo comum

- Capturar PCM em tempo real.
- Gravar WAV/PCM, se o fluxo e a plataforma suportarem.
- Ou usar um decodificador local que converta o arquivo gravado para um buffer numérico confiável antes da comparação.

## Como testar manualmente

1. Abra o treinamento em um dispositivo real.
2. Grave uma nova palavra com 3 ou mais amostras prontas para comparacao.
3. Verifique se o treino mostra `3/3 amostras prontas para usar`.
4. Entre em comunicação e grave uma fala da mesma palavra.
5. Se as duas pontas tiverem `features` reais, o resultado pode mudar para `real_comparison`.
6. Se a similaridade ficar baixa, o app deve mostrar baixa confiança e não reproduzir voz automaticamente.
7. Se a captura PCM falhar em qualquer uma das etapas, o app deve continuar em `unsupported_audio`.

## Próximo passo possível

1. Capturar PCM em tempo real.
2. Gravar WAV/PCM.
3. Adicionar um decodificador local.
4. Manter o fallback `unsupported_audio` enquanto a captura não estiver resolvida.

## Experimento PCM deste ciclo

- O experimento de captura PCM foi limitado ao Android.
- A API `AudioStream` de `expo-audio` existe na versão instalada e é o caminho usado para o teste isolado de captura PCM em tempo real.
- O código do experimento foi compilado com sucesso no workspace.
- A validação em tempo de execução em um dispositivo Android real foi preparada com logs controlados, mas ainda depende de executar os fluxos de treino e comunicação no aparelho conectado.
- No fluxo atual, a comunicação e o treinamento tentam capturar PCM primeiro no Android e caem de volta para a gravação existente se a captura em tempo real não estiver disponível.
- O treinamento nao abre gravacao comum em paralelo quando a captura PCM inicia com sucesso.
- Em qualquer caminho sem PCM analisável real, o resultado continua sendo `unsupported_audio`.

## Validacao tecnica do PCM em Android

Instrumentacao temporaria:

- Arquivo: `src/features/communication/services/audioAnalysis/pcmCapture.ts`.
- Flag: `PCM_CAPTURE_DIAGNOSTICS_ENABLED`.
- Logs prefixados com `[WSpeak PCM]`.
- Eventos registrados: `inicio`, ate 3 eventos `buffer`, e `fim`.
- Dados registrados: `sampleRate`, `channels`, duracao, quantidade de buffers, `byteLength`, quantidade de amostras float32, amplitude media, amplitude maxima e contagem de amostras fora do intervalo esperado.
- Os logs nao imprimem amostras brutas de audio.
- A flag ficou desligada por padrao depois da validacao para proteger logs antes de producao.

Checklist de execucao:

1. Conectar um Android real com depuracao habilitada.
2. Rodar o app no Android.
3. Abrir `Treinar fala`.
4. Criar ou escolher uma palavra.
5. Gravar 3 a 5 amostras no mesmo dispositivo.
6. Confirmar nos logs que `audioStreamBuffer` entrega `ArrayBuffer` alinhado para `Float32Array`.
7. Confirmar que `sampleRate`, `channels`, `sampleCount`, `averageAmplitude` e `maxAmplitude` sao coerentes com a fala.
8. Entrar em `Comunicar`.
9. Gravar a mesma palavra treinada.
10. Confirmar se o resultado chega em `real_comparison` ou `low_confidence`.
11. Gravar uma palavra diferente para observar falso positivo.
12. Antes de producao, remover ou desabilitar a instrumentacao temporaria.

Estado da decisao:

- Validacao executada em Android real conectado como `moto_g35_5G`.
- `AudioStream` entregou buffers validos em Android.
- Os buffers observados vieram com `sampleRate` 48000, `channels` 1, `byteLength` 19200 e `floatSampleCount` 4800.
- As amostras ficaram finitas e sem valores fora do intervalo esperado (`outOfRangeSampleCount` 0).
- Uma captura de treinamento gerou `sampleCount` 355200 em cerca de 7,7 segundos, com `maxAmplitude` aproximada de 0,204.
- Uma segunda captura de treinamento gerou `sampleCount` 100800 em cerca de 2,3 segundos, com `maxAmplitude` aproximada de 0,095.
- Uma captura no modo comunicacao gerou `sampleCount` 124800 em cerca de 2,8 segundos, com `maxAmplitude` aproximada de 0,869.
- O treinamento salvou amostra como `Análise pronta` com mensagem `Features extraídas de PCM real`.
- A comunicacao reconheceu uma palavra treinada com `real_comparison`, confianca de 82% e status `palavra identificada`.
- `AudioStream` pode seguir como caminho principal Android por enquanto.
- Ainda falta testar intencionalmente palavras diferentes para estimar falso positivo e ajustar limiar/algoritmo.

## Revalidacao da Fase 1 em 2026-06-27

Objetivo revalidado: provar comparacao real ponta a ponta em Android e confirmar o estado do caminho PCM.

Resultado:

- `npm run typecheck` passou.
- `git diff --check` passou.
- O codigo atual continua usando `AudioStream` em Android com `sampleRate` 48000, 1 canal e `encoding: float32`.
- `audioStreamBuffer` continua validando `ArrayBuffer` e alinhamento por `Float32Array.BYTES_PER_ELEMENT`.
- A conversao continua usando `new Float32Array(buffer.data)`.
- Os logs diagnosticos de `sampleRate`, `channels`, `sampleCount`, `averageAmplitude`, `maxAmplitude` e `outOfRangeSampleCount` seguem implementados e desligados por padrao em `PCM_CAPTURE_DIAGNOSTICS_ENABLED`.
- Android fisico conectado: `192.168.1.9:42501`, identificado como `moto_g35_5G`.
- O app abriu no Android via Expo na porta 8082.
- Captura observada 1:
  - `sampleRate`: 48000;
  - `channels`: 1;
  - `bufferCount`: 24;
  - `byteLength`: 460800;
  - `sampleCount`: 115200;
  - `finiteSampleCount`: 115200;
  - `outOfRangeSampleCount`: 0;
  - `averageAmplitude`: aproximadamente 0,00687;
  - `maxAmplitude`: aproximadamente 0,3417.
- Captura observada 2:
  - `sampleRate`: 48000;
  - `channels`: 1;
  - `bufferCount`: 23;
  - `byteLength`: 441600;
  - `sampleCount`: 110400;
  - `finiteSampleCount`: 110400;
  - `outOfRangeSampleCount`: 0;
  - `averageAmplitude`: aproximadamente 0,01015;
  - `maxAmplitude`: aproximadamente 0,6529.
- Captura observada 3:
  - `sampleRate`: 48000;
  - `channels`: 1;
  - `bufferCount`: 30;
  - `byteLength`: 576000;
  - `sampleCount`: 144000;
  - `finiteSampleCount`: 144000;
  - `outOfRangeSampleCount`: 0;
  - `averageAmplitude`: aproximadamente 0,00690;
  - `maxAmplitude`: aproximadamente 0,1572.

Decisao:

- A infraestrutura PCM Android foi revalidada em dispositivo fisico.
- `AudioStream` segue como caminho tecnico valido para captura analisavel em Android.
- Mesmo com PCM valido, a qualidade do reconhecimento por features simples continua insuficiente para piloto; o novo caminho esta documentado em `docs/roadmap-novo-escopo.md`.
