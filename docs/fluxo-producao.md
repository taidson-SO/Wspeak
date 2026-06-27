# Fluxo funcional de produção inicial

Este documento descreve o fluxo local do WSpeak para a primeira versão Android interna.

## Princípios

- O WSpeak não faz transcrição de fala comum.
- O app compara a fala atual com amostras treinadas pelo próprio usuário.
- Nenhum áudio é enviado para servidor, API externa ou STT externo.
- O reconhecimento depende de dados locais: palavras, amostras gravadas e features extraídas no aparelho.

## Treinamento

1. O usuário escolhe uma palavra sugerida ou cria uma palavra personalizada.
2. A palavra personalizada é normalizada com `trim`, espaços duplicados removidos e lowercase `pt-BR`.
3. Palavras vazias, duplicadas ou maiores que o limite são bloqueadas com mensagem amigável.
4. O usuário grava de 3 a 5 amostras por palavra.
5. Cada amostra é salva localmente mesmo quando a análise falha.
6. Quando o app consegue obter PCM/WAV analisável, extrai features e salva a amostra com `analysisStatus: 'ready'`.
7. Quando a análise falha ou o formato não é suportado, a amostra fica salva com `analysisStatus: 'unsupported'` e mensagem amigável.
8. O treino só pode ser concluído com pelo menos 3 amostras prontas para uso.

## Armazenamento local

- Palavras personalizadas ficam no storage local do app.
- Treinos ficam no storage local com metadados das amostras e features.
- Arquivos de áudio locais são apagados em modo best effort ao remover amostras, remover treino vinculado ou limpar dados.
- Falha ao apagar arquivo local não bloqueia a remoção lógica da amostra.

## Extração de features

Quando há sinal analisável, o app calcula features leves:

- duração total e duração ativa;
- proporção de silêncio;
- amplitude média e máxima;
- energia RMS;
- zero crossing rate;
- envelope de energia;
- envelope de zero crossing;
- frames temporais curtos com energia, amplitude e zero crossing.

Antes das features, o sinal é aparado para reduzir silêncio inicial/final e normalizado por volume.

## Comparação

O reconhecimento compara a fala atual com as amostras treinadas.

- Se os dois lados têm frames temporais, a comparação usa DTW para tolerar variação de ritmo e velocidade.
- Se uma amostra antiga tem apenas features globais, o app usa a comparação global antiga como fallback.
- Cada palavra recebe pontuação considerando as melhores amostras e a consistência entre elas.
- A melhor palavra é comparada com a segunda melhor para calcular margem de confiança.

## Confiança

O app só aceita uma palavra quando:

- a confiança mínima é atingida;
- a margem sobre a segunda palavra é suficiente;
- há comparação real com amostras treinadas.

Se a confiança for baixa ou houver dúvida entre duas palavras, o app não fala automaticamente e pede nova tentativa.

## Fala sintetizada

- A fala sintetizada usa `expo-speech`.
- O app para a fala anterior antes de falar uma nova palavra.
- A voz usa `language: 'pt-BR'`.
- O app fala apenas `predictedWord`, nunca o áudio capturado.
- A fala só acontece quando `canSpeakRecognitionResult(result)` permite.

## Limitações

- O algoritmo é local, leve e heurístico.
- Não há STT, MFCC completo nem modelo acústico treinado.
- Palavras parecidas podem ser rejeitadas quando a margem entre elas for pequena.
- Gravações com ruído, fala muito baixa ou captura sem PCM analisável podem cair em baixa confiança ou `unsupported_audio`.
- Amostras antigas continuam funcionando, mas só ganham comparação temporal quando forem regravadas com frames novos.
