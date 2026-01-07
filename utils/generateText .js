import * as ort from 'onnxruntime-react-native';

// Text generation fonksiyonu
export const generateText = async (
  prompt,
  sessionRef,
  vocab,
  reverseVocab,
  tokenizer,
  maxTokens = 50,
  temperature = 0.7,
  onTokenGenerated = null,
) => {
  try {
    if (!sessionRef.current) {
      throw new Error('Model not loaded');
    }

    console.log('🚀 Starting text generation...');
    console.log('📝 Prompt:', prompt);

    // 1. Tokenize input
    let inputIds;

    if (tokenizer && tokenizer.model && tokenizer.model.vocab) {
      // Tokenizer.json kullan
      console.log('📦 Using tokenizer.json for encoding');
      inputIds = tokenizeWithTokenizer(prompt, tokenizer);
    } else if (vocab) {
      // Vocab dict kullan (fallback)
      console.log('📦 Using vocab dict for encoding');
      inputIds = tokenizeWithVocab(prompt, vocab);
    } else {
      throw new Error('No tokenizer or vocab available');
    }

    console.log('✅ Input tokens:', inputIds);
    console.log('📊 Input length:', inputIds.length);

    const generatedIds = [...inputIds];
    let generatedText = '';

    // 2. Generate tokens one by one
    for (let i = 0; i < maxTokens; i++) {
      // Prepare input tensor
      const inputTensor = new ort.Tensor(
        'int64',
        BigInt64Array.from(generatedIds.map(id => BigInt(id))),
        [1, generatedIds.length],
      );

      // Run inference
      const feeds = { input_ids: inputTensor };
      const results = await sessionRef.current.run(feeds);

      // Get logits
      const logits =
        results.logits || results.output || results[Object.keys(results)[0]];

      if (!logits) {
        throw new Error('No logits in model output');
      }

      // Get last token logits
      const lastLogits = getLastTokenLogits(logits, generatedIds.length - 1);

      // Apply temperature and sample
      const nextTokenId = sampleToken(lastLogits, temperature);

      // Decode token
      let nextToken = '';
      if (reverseVocab && reverseVocab[nextTokenId]) {
        nextToken = reverseVocab[nextTokenId];
      } else if (tokenizer && tokenizer.model && tokenizer.model.vocab) {
        // Tokenizer'dan decode et
        const vocabEntries = Object.entries(tokenizer.model.vocab);
        const found = vocabEntries.find(([_, id]) => id === nextTokenId);
        if (found) {
          nextToken = cleanToken(found[0]);
        }
      }

      console.log(`Token ${i + 1}: ID=${nextTokenId}, Text="${nextToken}"`);

      // Check for end of text
      if (
        nextToken === '<|endoftext|>' ||
        nextToken === '</s>' ||
        nextToken === '<|end|>' ||
        nextTokenId === 0
      ) {
        console.log('⏹️ End of text token detected');
        break;
      }

      // Add to generated text
      if (
        nextToken &&
        !nextToken.startsWith('<') &&
        !nextToken.startsWith('[')
      ) {
        generatedText += nextToken;

        // Callback for streaming
        if (onTokenGenerated) {
          onTokenGenerated(nextToken, generatedText);
        }
      }

      // Add to sequence
      generatedIds.push(nextTokenId);

      // Stop if response is complete (optional heuristics)
      if (
        generatedText.length > 500 ||
        (generatedText.endsWith('.') && i > 10) ||
        (generatedText.endsWith('!') && i > 10) ||
        (generatedText.endsWith('?') && i > 10)
      ) {
        console.log('⏹️ Natural stopping point reached');
        break;
      }
    }

    console.log('✅ Generation complete');
    console.log('📝 Generated text:', generatedText);

    return {
      text: generatedText.trim(),
      tokens: generatedIds.length,
    };
  } catch (error) {
    console.error('❌ Generation error:', error);
    throw error;
  }
};

// Tokenizer.json ile tokenize
function tokenizeWithTokenizer(text, tokenizer) {
  try {
    const vocab = tokenizer.model.vocab;
    const tokens = [];

    // Basit word-piece tokenization
    const words = text.toLowerCase().split(/\s+/);

    for (const word of words) {
      // Tam kelime var mı?
      if (vocab[word] !== undefined) {
        tokens.push(vocab[word]);
      } else {
        // Subword tokenization
        let remaining = word;
        while (remaining.length > 0) {
          let found = false;

          // En uzun eşleşmeyi bul
          for (let len = remaining.length; len > 0; len--) {
            const subword = remaining.substring(0, len);
            const withPrefix =
              len < remaining.length ? '##' + subword : subword;

            if (vocab[withPrefix] !== undefined) {
              tokens.push(vocab[withPrefix]);
              remaining = remaining.substring(len);
              found = true;
              break;
            } else if (vocab[subword] !== undefined) {
              tokens.push(vocab[subword]);
              remaining = remaining.substring(len);
              found = true;
              break;
            }
          }

          // Eşleşme bulunamazsa, unknown token
          if (!found) {
            tokens.push(vocab['[UNK]'] || vocab['<unk>'] || 0);
            break;
          }
        }
      }
    }

    return tokens;
  } catch (error) {
    console.error('Tokenization error:', error);
    return [0]; // Fallback to unknown token
  }
}

// Vocab dict ile tokenize (fallback)
function tokenizeWithVocab(text, vocab) {
  const words = text.toLowerCase().split(/\s+/);
  return words.map(
    word => vocab[word] || vocab['<unk>'] || vocab['[UNK]'] || 0,
  );
}

// Token temizleme (özel karakterleri kaldır)
function cleanToken(token) {
  // ## prefix'i kaldır (wordpiece)
  if (token.startsWith('##')) {
    return token.substring(2);
  }

  // Özel tokenları filtrele
  if (token.startsWith('[') && token.endsWith(']')) {
    return '';
  }

  // Underscore'ları boşluğa çevir (sentencepiece)
  if (token.startsWith('▁') || token.startsWith('_')) {
    return ' ' + token.substring(1);
  }

  return token;
}

// Son token'ın logits'lerini al
function getLastTokenLogits(logitsTensor, lastIndex) {
  const data = logitsTensor.data;
  const shape = logitsTensor.dims;

  // Shape: [batch_size, seq_len, vocab_size]
  const vocabSize = shape[shape.length - 1];
  const seqLen = shape[shape.length - 2];

  // Son token'ın logits'lerini al
  const startIdx = lastIndex * vocabSize;
  const endIdx = startIdx + vocabSize;

  return Array.from(data.slice(startIdx, endIdx));
}

// Temperature ile token sampling
function sampleToken(logits, temperature = 0.7) {
  // Apply temperature
  const scaledLogits = logits.map(l => l / temperature);

  // Softmax
  const maxLogit = Math.max(...scaledLogits);
  const expLogits = scaledLogits.map(l => Math.exp(l - maxLogit));
  const sumExp = expLogits.reduce((a, b) => a + b, 0);
  const probs = expLogits.map(e => e / sumExp);

  // Top-p (nucleus) sampling
  const topP = 0.9;
  const sorted = probs
    .map((p, i) => ({ prob: p, index: i }))
    .sort((a, b) => b.prob - a.prob);

  let cumSum = 0;
  const nucleus = [];

  for (const item of sorted) {
    cumSum += item.prob;
    nucleus.push(item);
    if (cumSum >= topP) break;
  }

  // Sample from nucleus
  const rand = Math.random() * cumSum;
  let sum = 0;

  for (const item of nucleus) {
    sum += item.prob;
    if (rand <= sum) {
      return item.index;
    }
  }

  return nucleus[0].index;
}

// Greedy decoding (en yüksek probability)
export const greedyDecode = logits => {
  let maxProb = -Infinity;
  let maxIdx = 0;

  for (let i = 0; i < logits.length; i++) {
    if (logits[i] > maxProb) {
      maxProb = logits[i];
      maxIdx = i;
    }
  }

  return maxIdx;
};

// Batch generation (çoklu prompt)
export const generateBatch = async (
  prompts,
  sessionRef,
  vocab,
  reverseVocab,
  tokenizer,
  maxTokens = 50,
  temperature = 0.7,
) => {
  const results = [];

  for (const prompt of prompts) {
    const result = await generateText(
      prompt,
      sessionRef,
      vocab,
      reverseVocab,
      tokenizer,
      maxTokens,
      temperature,
    );
    results.push(result);
  }

  return results;
};
