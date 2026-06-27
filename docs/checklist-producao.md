# Checklist de produção inicial Android

Use este checklist antes de distribuir uma build interna para teste controlado.

## Preparação

1. Instalar o app limpo em um Android físico.
2. Abrir o app.
3. Confirmar que não há dependência de internet para treinar ou comunicar.
4. Confirmar que a política de privacidade informa armazenamento local.
5. Rodar `npm run typecheck`.

## Treinamento

1. Abrir `Treinar fala`.
2. Escolher uma palavra sugerida.
3. Adicionar uma palavra customizada.
4. Tentar adicionar a mesma palavra com caixa/acentos diferentes.
5. Confirmar que duplicata é bloqueada.
6. Tentar adicionar palavra vazia.
7. Confirmar que palavra vazia é bloqueada.
8. Tentar palavra maior que o limite do campo.
9. Confirmar que o limite visual e a validação impedem salvar texto inválido.
10. Gravar uma amostra.
11. Confirmar que a amostra aparece na lista.
12. Confirmar que amostra pronta mostra `Pronta para usar`.
13. Confirmar que amostra sem análise mostra mensagem amigável.
14. Gravar até 5 amostras.
15. Confirmar que o limite de amostras por palavra é respeitado.
16. Remover uma amostra.
17. Confirmar que o app não trava se o arquivo local não puder ser apagado.
18. Tentar concluir treino com menos de 3 amostras prontas.
19. Confirmar que a conclusão é bloqueada.
20. Treinar uma palavra com 3 amostras prontas.
21. Confirmar que `Salvar treino` e `Conversar agora` ficam disponíveis.

## Comunicação

1. Abrir `Comunicar` sem palavra treinada suficiente.
2. Confirmar que o app orienta treinar primeiro.
3. Entrar com uma palavra treinada com 3 amostras prontas.
4. Iniciar gravação.
5. Confirmar que a permissão de microfone é solicitada quando necessário.
6. Se PCM estiver disponível no Android, confirmar que a comunicação funciona pelo caminho PCM.
7. Se PCM falhar, confirmar que o app tenta gravação normal quando possível ao iniciar captura.
8. Parar gravação.
9. Confirmar que a captura atual é comparada com amostras treinadas.
10. Quando houver confiança, confirmar que a voz fala apenas a palavra reconhecida.
11. Quando houver baixa confiança, confirmar que não há fala automática.
12. Quando houver dúvida entre duas palavras, confirmar que a mensagem mostra a dúvida.
13. Confirmar que `Repetir voz` só fica disponível em reconhecimento confiável.
14. Tocar em `Repetir voz`.
15. Iniciar nova gravação e confirmar que o resultado anterior some.

## Robustez

1. Fechar a tela durante uma gravação no treinamento.
2. Reabrir o treinamento e confirmar que nova gravação inicia normalmente.
3. Fechar a tela durante uma gravação na comunicação.
4. Reabrir a comunicação e confirmar que nova gravação inicia normalmente.
5. Sair da comunicação durante ou após fala sintetizada.
6. Confirmar que a fala ativa é encerrada.
7. Negar permissão de microfone no sistema.
8. Tentar gravar em treinamento e comunicação.
9. Confirmar que o app mostra mensagem amigável e não fica preso em estado de gravação/processamento.
10. Tocar rapidamente várias vezes nos botões de gravar/parar.
11. Confirmar que não inicia captura dupla.

## Dados locais

1. Remover palavra customizada sem amostras.
2. Remover palavra customizada com amostras.
3. Confirmar que os treinos vinculados são removidos junto.
4. Abrir `Dados e privacidade`.
5. Acionar limpeza de dados locais e cancelar.
6. Acionar limpeza de dados locais e confirmar.
7. Fechar e reabrir o app.
8. Confirmar que palavras customizadas, treinos, avaliações e tentativas foram limpos.

## Build Android interna

1. Rodar `npm run typecheck`.
2. Conferir `docs/build-interna.md`.
3. Confirmar que `PCM_CAPTURE_DIAGNOSTICS_ENABLED` está `false`.
4. Gerar APK interno com `npm run build:android:internal` quando houver login EAS.
5. Instalar em Android físico.
6. Executar este checklist no APK instalado.

## Critérios de aceite

- `npm run typecheck` passa.
- O app não usa STT externo.
- O app não depende de internet para reconhecimento.
- Amostras são salvas mesmo quando análise falha.
- A voz sintetizada só fala reconhecimento confiável.
- Baixa confiança não aciona fala.
- Erros de permissão, gravação, análise, exclusão local e fala não travam o app.
- Checklist manual Android foi executado ou pendências reais foram registradas.
